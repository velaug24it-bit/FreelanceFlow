const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
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

    const project = await Project.findById(projectId)
      .populate('user_id', 'full_name email')
      .populate('client_id', 'full_name email')
      .populate('selected_freelancer_id', 'full_name email subscription_tier');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the client
    if (project.client_id._id.toString() !== clientId) {
      return res.status(403).json({ error: 'Only the client can release payment' });
    }

    // Check if project is completed
    if (project.status !== 'completed') {
      return res.status(400).json({ error: 'Project must be completed to release payment' });
    }

    // Check if payment already requested
    if (project.release_requested) {
      return res.status(400).json({ error: 'Payment already requested for this project' });
    }

    // Check if freelancer exists
    if (!project.selected_freelancer_id) {
      return res.status(400).json({ error: 'No freelancer assigned to this project' });
    }

    // Calculate amounts
    const amount = project.budget || 0;
    const fee = calculateFee(amount, project.selected_freelancer_id.subscription_tier || 'free');
    const netAmount = amount - fee;

    // Create Razorpay order
    const orderOptions = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `payment_${projectId}_${Date.now()}`,
      notes: {
        projectId: projectId,
        clientId: clientId,
        freelancerId: project.selected_freelancer_id._id,
        amount: amount,
        fee: fee,
        netAmount: netAmount
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    // Create payment record
    const payment = new Payment({
      project_id: projectId,
      client_id: clientId,
      freelancer_id: project.selected_freelancer_id._id,
      amount: amount,
      currency: 'INR',
      status: 'pending',
      order_id: order.id,
      fee: fee,
      net_amount: netAmount
    });
    await payment.save();

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
      netAmount: netAmount
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
    const project = await Project.findById(projectId);
    if (project) {
      project.payment_status = 'processing';
      project.amount_released = payment.amount;
      await project.save();
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