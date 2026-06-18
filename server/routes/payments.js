const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const ProjectPost = require('../models/ProjectPost');
const Contract = require('../models/Contract');
const Bid = require('../models/Bid');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Calculate platform fee (e.g., 5% for free, 2% for pro)
const calculateFee = (amount, userTier) => {
  const feePercentage = userTier === 'pro' ? 2 : userTier === 'business' ? 1 : 5;
  return (amount * feePercentage) / 100;
};

// Request payment for completed project (Client side)
router.post('/request-payment/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const clientId = req.userId;

    let project = await Project.findById(projectId)
      .populate('user_id', 'full_name email')
      .populate('client_id', 'full_name email')
      .populate('selected_freelancer_id', 'full_name email subscription_tier');
    let contract = null;
    let acceptedBid = null;
    let isMarketplaceProject = false;

    if (!project) {
      project = await ProjectPost.findById(projectId)
        .populate('client_id', 'full_name email')
        .populate('selected_freelancer_id', 'full_name email subscription_tier');
      isMarketplaceProject = !!project;

      if (project) {
        contract = await Contract.findOne({ project_id: projectId });
        acceptedBid = await Bid.findOne({
          project_id: projectId,
          freelancer_id: project.selected_freelancer_id,
          status: 'accepted'
        });
      }
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the client
    const projectClientId = project.client_id?._id || project.client_id;
    if (projectClientId.toString() !== clientId) {
      return res.status(403).json({ error: 'Only the client can release payment' });
    }

    // Check if project is completed
    if (project.status !== 'completed') {
      return res.status(400).json({ error: 'Project must be completed to release payment' });
    }

    // Check if freelancer exists
    if (!project.selected_freelancer_id) {
      return res.status(400).json({ error: 'No freelancer assigned to this project' });
    }

    // Calculate amounts
    const freelancerId = project.selected_freelancer_id?._id || project.selected_freelancer_id;
    const freelancerTier = project.selected_freelancer_id?.subscription_tier || 'free';
    const freelancerPhone = acceptedBid?.phone_number;
    const agreedAmount = contract?.agreed_amount || project.budget || project.budget_max || 0;
    const fee = isMarketplaceProject
      ? (contract?.client_fee || 0)
      : calculateFee(agreedAmount, freelancerTier);
    const clientCharge = isMarketplaceProject
      ? (contract?.total_client_charge || agreedAmount + fee)
      : agreedAmount;
    const netAmount = isMarketplaceProject ? agreedAmount : agreedAmount - fee;

    if (!agreedAmount || agreedAmount <= 0 || !clientCharge || clientCharge <= 0) {
      return res.status(400).json({ error: 'Project payment amount is missing. Accept a valid bid before release.' });
    }

    // Create Razorpay order
    const orderOptions = {
      amount: Math.round(clientCharge * 100), // Convert to paise
      currency: 'INR',
      receipt: `pay_${projectId.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        projectId: projectId,
        clientId: clientId,
        freelancerId: freelancerId.toString(),
        amount: agreedAmount,
        fee: fee,
        netAmount: netAmount,
        freelancerPhone: freelancerPhone || '',
        type: isMarketplaceProject ? 'marketplace_project' : 'project'
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    // Create or refresh a pending payment record
    const payment = await Payment.findOneAndUpdate({
      project_id: projectId,
      status: { $in: ['pending', 'failed'] }
    }, {
      project_id: projectId,
      client_id: projectClientId,
      freelancer_id: freelancerId,
      amount: clientCharge,
      currency: 'INR',
      status: 'pending',
      order_id: order.id,
      fee: fee,
      net_amount: netAmount,
      freelancer_phone: freelancerPhone,
      payout_status: 'pending',
      notes: freelancerPhone
        ? `Freelancer payout phone: ${freelancerPhone}`
        : 'Freelancer payout phone not provided'
    }, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    });

    // Update project
    project.release_requested = true;
    project.release_requested_at = new Date();
    project.payment_id = payment._id;
    project.payment_status = 'pending';
    await project.save();

    res.json({
      success: true,
      orderId: order.id,
      key: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      payment: payment,
      project: project,
      fee: fee,
      netAmount: netAmount,
      clientCharge,
      freelancerPhone
    });

  } catch (err) {
    console.error('Error requesting payment:', err);
    res.status(500).json({ error: 'Failed to process payment request' });
  }
});

// Verify payment (Client completes payment)
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      projectId
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Find payment by order_id
    const payment = await Payment.findOne({ order_id: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    payment.status = 'processing';
    payment.payment_id = razorpay_payment_id;
    payment.paid_at = new Date();
    await payment.save();

    // Update project
    let project = await Project.findById(projectId);
    let isMarketplaceProject = false;
    if (!project) {
      project = await ProjectPost.findById(projectId);
      isMarketplaceProject = !!project;
    }

    if (project) {
      project.payment_status = isMarketplaceProject ? 'paid' : 'processing';
      project.amount_released = payment.amount;
      if (isMarketplaceProject) {
        project.payment_released_at = new Date();
      }
      await project.save();
    }

    if (isMarketplaceProject) {
      payment.status = 'completed';
      payment.released_at = new Date();
      payment.payout_status = payment.freelancer_phone ? 'manual_required' : 'pending';
      await payment.save();

      await Contract.findOneAndUpdate({ project_id: projectId }, { status: 'completed' });
      await Transaction.findOneAndUpdate(
        { project_id: projectId },
        {
          status: 'completed',
          payment_method: 'razorpay',
          payment_id: razorpay_payment_id,
          completed_at: new Date()
        }
      );
    }

    // Create notification for freelancer
    const freelancer = await User.findById(payment.freelancer_id);
    const client = await User.findById(payment.client_id);

    await Notification.create({
      user_id: payment.freelancer_id,
      type: 'payment_received',
      title: 'Payment Received!',
      message: `${client.full_name} has released payment of ₹${payment.amount} for project "${project.title}"`,
      reference_type: 'project',
      reference_id: projectId,
      action_url: `/projects/${projectId}`,
      is_read: false
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: payment
    });

  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Confirm payment completion (After Razorpay webhook)
router.post('/webhook/payment-confirmed', async (req, res) => {
  try {
    const { order_id } = req.body;

    const payment = await Payment.findOne({ order_id });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment
    payment.status = 'completed';
    payment.released_at = new Date();
    await payment.save();

    // Update project
    const project = await Project.findById(payment.project_id);
    if (project) {
      project.payment_status = 'completed';
      project.payment_released_at = new Date();
      await project.save();
    }

    // Update freelancer's revenue
    const freelancer = await User.findById(payment.freelancer_id);
    if (freelancer) {
      freelancer.total_revenue = (freelancer.total_revenue || 0) + payment.net_amount;
      await freelancer.save();
    }

    // Update client's spent
    const client = await User.findById(payment.client_id);
    if (client) {
      client.total_spent = (client.total_spent || 0) + payment.amount;
      await client.save();
    }

    // Send notification to freelancer
    await Notification.create({
      user_id: payment.freelancer_id,
      type: 'payment_released',
      title: 'Payment Released!',
      message: `Payment of ₹${payment.amount} has been released for project "${project.title}"`,
      reference_type: 'project',
      reference_id: project._id,
      action_url: `/projects/${project._id}`,
      is_read: false
    });

    res.json({ success: true });

  } catch (err) {
    console.error('Error confirming payment:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get payment details
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const payment = await Payment.findOne({ project_id: projectId })
      .populate('client_id', 'full_name email')
      .populate('freelancer_id', 'full_name email');

    res.json({ payment });
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

module.exports = router;
