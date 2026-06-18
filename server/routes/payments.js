const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Verify token middleware
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

// Calculate platform fee
const calculateFee = (amount, userTier) => {
  const tier = userTier?.toLowerCase() || 'free';
  const feePercentage = tier === 'business' ? 1 : tier === 'pro' ? 2 : 5;
  return Math.round((amount * feePercentage) / 100 * 100) / 100;
};

// ============================================
// TEST ROUTE
// ============================================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Payment routes are working!',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// GET PAYMENT DETAILS FOR PROJECT
// ============================================
router.get('/project/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log(`🔍 Fetching payment for project: ${projectId}`);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
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
    res.status(500).json({
      error: 'Failed to fetch payment details',
      details: err.message
    });
  }
});

// ============================================
// REQUEST PAYMENT FOR COMPLETED PROJECT - FIXED
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

    // Find project
    const project = await Project.findById(projectId)
      .populate('client_id', 'full_name email')
      .populate('selected_freelancer_id', 'full_name email subscription_tier');

    if (!project) {
      console.log(`❌ Project not found: ${projectId}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`✅ Project found: ${project.title}`);
    console.log(`📊 Project status: ${project.status}`);
    console.log(`💰 Budget min: ${project.budget_min}, max: ${project.budget_max}`);

    // Check if user is the client
    if (!project.client_id) {
      return res.status(400).json({ error: 'No client assigned to this project' });
    }

    if (project.client_id._id.toString() !== clientId) {
      console.log(`❌ User ${clientId} is not the client. Client is: ${project.client_id._id}`);
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

    // Calculate amount - using budget_max as the project budget
    const amount = project.budget_max || 0;
    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid project budget' });
    }

    const fee = calculateFee(amount, project.selected_freelancer_id.subscription_tier);
    const netAmount = amount - fee;

    console.log(`💰 Amount: ${amount}, Fee: ${fee}, Net: ${netAmount}`);

    // ============================================
    // FIX: Create a short receipt (max 40 characters)
    // ============================================
    const shortUserId = req.userId.toString().slice(-4);
    const timestamp = Date.now().toString().slice(-6);
    const receipt = `pay_${shortUserId}_${timestamp}`; // Max 40 chars

    console.log(`📝 Receipt: ${receipt} (${receipt.length} chars)`);

    // Create Razorpay order
    const orderOptions = {
      amount: amount * 100,
      currency: 'INR',
      receipt: receipt, // Now short enough
      notes: {
        projectId: projectId,
        clientId: clientId,
        freelancerId: project.selected_freelancer_id._id.toString(),
        amount: amount.toString(),
        fee: fee.toString(),
        netAmount: netAmount.toString()
      }
    };

    console.log('📦 Order options:', JSON.stringify(orderOptions, null, 2));

    const order = await razorpay.orders.create(orderOptions);
    console.log(`✅ Razorpay order created: ${order.id}`);

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
    console.log(`✅ Payment record created: ${payment._id}`);

    // Update project
    project.release_requested = true;
    project.release_requested_at = new Date();
    project.payment_id = payment._id;
    project.payment_status = 'pending';
    await project.save();
    console.log(`✅ Project updated: ${project._id}`);

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
    console.error('❌ Error details:', err.error || err.message);

    // Check if it's a Razorpay validation error
    if (err.error?.code === 'BAD_REQUEST_ERROR') {
      return res.status(400).json({
        error: 'Payment request validation failed',
        details: err.error?.description || err.message,
        razorpayError: err.error
      });
    }

    res.status(500).json({
      error: 'Failed to process payment request',
      details: err.message,
      razorpayError: err.error
    });
  }
});

// ============================================
// VERIFY PAYMENT
// ============================================
router.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      projectId
    } = req.body;

    console.log(`🔍 Verifying payment: ${razorpay_payment_id}`);

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
// CONFIRM PAYMENT (Webhook)
// ============================================
router.post('/webhook/payment-confirmed', async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

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

    res.json({ success: true });

  } catch (err) {
    console.error('❌ Error confirming payment:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// ============================================
// RESET PAYMENT STATUS
// ============================================
router.post('/reset-payment/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const clientId = req.userId;

    console.log(`🔄 Resetting payment for project: ${projectId}`);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the client
    if (project.client_id.toString() !== clientId) {
      return res.status(403).json({ error: 'Only the client can reset payment' });
    }

    // Reset project payment status
    project.release_requested = false;
    project.release_requested_at = null;
    project.payment_id = null;
    project.payment_status = 'pending';
    await project.save();

    // Delete any pending payment records
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
    res.status(500).json({
      error: 'Failed to reset payment',
      details: err.message
    });
  }
});


module.exports = router;