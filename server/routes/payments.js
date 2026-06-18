const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Payment = require('../models/Payment');

// ============================================
// RAZORPAY INITIALIZATION
// ============================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ============================================
// MIDDLEWARE
// ============================================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================
// CALCULATE PLATFORM FEE
// ============================================
const calculateFee = (amount, userTier) => {
  const tier = userTier?.toLowerCase() || 'free';
  const feePercentage = tier === 'business' ? 1 : tier === 'pro' ? 2 : 5;
  return Math.round((amount * feePercentage) / 100 * 100) / 100;
};

// ============================================
// GET PAYMENT DETAILS FOR PROJECT
// ============================================
router.get('/project/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const payment = await Payment.findOne({ project_id: projectId })
      .populate('client_id', 'full_name email')
      .populate('freelancer_id', 'full_name email');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found for this project' });
    }

    res.json({ payment });
  } catch (err) {
    console.error('❌ Error fetching payment:', err);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

// ============================================
// REQUEST PAYMENT FOR COMPLETED PROJECT
// ============================================
router.post('/request-payment/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const clientId = req.userId;

    console.log(`🔍 Requesting payment for project: ${projectId}`);
    console.log(`👤 Client ID: ${clientId}`);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }

    const project = await Project.findById(projectId)
      .populate('client_id', 'full_name email')
      .populate('selected_freelancer_id', 'full_name email subscription_tier');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`✅ Project found: ${project.title}`);
    console.log(`📊 Project status: ${project.status}`);
    console.log(`💰 Budget: ${project.budget_max}`);

    // Check if user is the client
    if (!project.client_id) {
      return res.status(400).json({ error: 'No client assigned to this project' });
    }

    if (project.client_id._id.toString() !== clientId) {
      return res.status(403).json({ error: 'Only the client can release payment' });
    }

    // Check if project is completed
    if (project.status !== 'completed') {
      return res.status(400).json({ error: 'Project must be completed to release payment' });
    }

    // Check if payment already completed
    if (project.payment_status === 'completed') {
      return res.status(400).json({ error: 'Payment already completed for this project' });
    }

    // Check if freelancer exists
    if (!project.selected_freelancer_id) {
      return res.status(400).json({ error: 'No freelancer assigned to this project' });
    }

    // Calculate amount
    const amount = project.budget_max || 0;
    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid project budget' });
    }

    const fee = calculateFee(amount, project.selected_freelancer_id.subscription_tier);
    const netAmount = amount - fee;

    console.log(`💰 Amount: ${amount}, Fee: ${fee}, Net: ${netAmount}`);

    // Generate receipt (max 40 chars)
    const shortUserId = clientId.toString().slice(-4);
    const timestamp = Date.now().toString().slice(-6);
    const receipt = `pay_${shortUserId}_${timestamp}`;

    // Create Razorpay order
    const orderOptions = {
      amount: amount * 100,
      currency: 'INR',
      receipt: receipt,
      notes: {
        projectId: projectId,
        clientId: clientId,
        freelancerId: project.selected_freelancer_id._id.toString(),
        amount: amount.toString(),
        fee: fee.toString(),
        netAmount: netAmount.toString()
      }
    };

    console.log('📦 Creating Razorpay order...');
    const order = await razorpay.orders.create(orderOptions);
    console.log(`✅ Order created: ${order.id}`);

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
      net_amount: netAmount,
      description: `Payment for project: ${project.title}`
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
    console.error('❌ Error requesting payment:', err);
    console.error('❌ Razorpay error:', err.error);
    res.status(500).json({
      error: 'Failed to process payment request',
      details: err.error?.description || err.message
    });
  }
});

// ============================================
// VERIFY PAYMENT - UPDATED
// ============================================
router.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      projectId
    } = req.body;

    console.log(`🔍 Verifying project payment: ${razorpay_payment_id}`);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
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

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: payment
    });

  } catch (err) {
    console.error('❌ Error verifying payment:', err);
    res.status(500).json({
      error: 'Payment verification failed',
      details: err.message
    });
  }
});

// ============================================
// RESET PAYMENT (for stuck payments)
// ============================================
router.post('/reset-payment/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const clientId = req.userId;

    console.log(`🔄 Resetting payment for project: ${projectId}`);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the client
    if (project.client_id.toString() !== clientId) {
      return res.status(403).json({ error: 'Only the client can reset payment' });
    }

    // Only reset if not completed
    if (project.payment_status === 'completed') {
      return res.status(400).json({ error: 'Payment already completed, cannot reset' });
    }

    // Reset project
    project.release_requested = false;
    project.release_requested_at = null;
    project.payment_id = null;
    project.payment_status = 'pending';
    await project.save();

    // Delete pending payment records
    await Payment.deleteMany({
      project_id: projectId,
      status: { $in: ['pending', 'processing'] }
    });

    console.log(`✅ Payment reset for project: ${projectId}`);

    res.json({
      success: true,
      message: 'Payment status reset successfully'
    });

  } catch (err) {
    console.error('❌ Error resetting payment:', err);
    res.status(500).json({ error: 'Failed to reset payment' });
  }
});

// ============================================
// GET ALL PAYMENTS FOR USER
// ============================================
router.get('/my-payments', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const payments = await Payment.find({
      $or: [
        { client_id: userId },
        { freelancer_id: userId },
        { user_id: userId }
      ]
    })
      .populate('project_id', 'title')
      .populate('client_id', 'full_name email')
      .populate('freelancer_id', 'full_name email')
      .sort({ created_at: -1 });

    res.json({ payments });
  } catch (err) {
    console.error('❌ Error fetching user payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ============================================
// WEBHOOK
// ============================================
router.post('/webhook/payment-confirmed', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body);
    console.log('📨 Webhook received:', event.event);

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const payment = await Payment.findOne({ order_id: orderId });
      if (payment && payment.status !== 'completed') {
        payment.status = 'completed';
        payment.payment_id = paymentId;
        payment.released_at = new Date();
        await payment.save();

        // Update project if it's a project payment
        if (payment.project_id) {
          const project = await Project.findById(payment.project_id);
          if (project) {
            project.payment_status = 'completed';
            project.payment_released_at = new Date();
            await project.save();
          }
        }

        // Update freelancer's revenue
        if (payment.freelancer_id) {
          const freelancer = await User.findById(payment.freelancer_id);
          if (freelancer) {
            freelancer.total_revenue = (freelancer.total_revenue || 0) + payment.net_amount;
            await freelancer.save();
          }
        }

        console.log(`✅ Payment completed: ${paymentId}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook processing failed');
  }
});

module.exports = router;