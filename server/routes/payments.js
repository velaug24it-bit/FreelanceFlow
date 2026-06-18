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

    // Find project - using findOne with proper population
    const project = await Project.findOne({ _id: projectId })
      .populate('client_id', 'full_name email')
      .populate('selected_freelancer_id', 'full_name email subscription_tier');

    if (!project) {
      console.log(`❌ Project not found: ${projectId}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`✅ Project found: ${project.title}`);
    console.log(`📊 Project status: ${project.status}`);
    console.log(`💰 Budget max: ${project.budget_max}`);

    // Check if user is the client
    if (!project.client_id) {
      return res.status(400).json({ error: 'No client assigned to this project' });
    }

    // Check if user is the client
    const clientIdStr = project.client_id._id ? project.client_id._id.toString() : project.client_id.toString();
    if (clientIdStr !== clientId) {
      console.log(`❌ User ${clientId} is not the client. Client is: ${clientIdStr}`);
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

    // Calculate amount using budget_max
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
    console.log(`✅ Payment record created: ${payment._id}`);

    // IMPORTANT FIX: Use findOneAndUpdate instead of save to avoid validation issues
    await Project.findOneAndUpdate(
      { _id: projectId },
      {
        $set: {
          release_requested: true,
          release_requested_at: new Date(),
          payment_id: payment._id,
          payment_status: 'pending'
        }
      }
    );
    console.log(`✅ Project updated: ${projectId}`);

    // Get updated project for response
    const updatedProject = await Project.findById(projectId);

    res.json({
      success: true,
      orderId: order.id,
      key: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      payment: payment,
      project: updatedProject,
      fee: fee,
      netAmount: netAmount
    });

  } catch (err) {
    console.error('❌ Error requesting payment:', err);
    console.error('❌ Error details:', err.message);
    console.error('❌ Error stack:', err.stack);

    res.status(500).json({
      error: 'Failed to process payment request',
      details: err.message
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

    // Update project using findOneAndUpdate
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      await Project.findOneAndUpdate(
        { _id: projectId },
        {
          $set: {
            payment_status: 'processing',
            amount_released: payment.amount
          }
        }
      );
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

    // Reset project using findOneAndUpdate
    await Project.findOneAndUpdate(
      { _id: projectId },
      {
        $set: {
          release_requested: false,
          release_requested_at: null,
          payment_id: null,
          payment_status: 'pending'
        }
      }
    );

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
    res.status(500).json({
      error: 'Failed to reset payment',
      details: err.message
    });
  }
});

// ============================================
// CONFIRM PAYMENT (Webhook)
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
      if (payment) {
        payment.status = 'completed';
        payment.payment_id = paymentId;
        payment.released_at = new Date();
        await payment.save();

        const project = await Project.findById(payment.project_id);
        if (project) {
          project.payment_status = 'completed';
          project.payment_released_at = new Date();
          await project.save();
        }

        const freelancer = await User.findById(payment.freelancer_id);
        if (freelancer) {
          freelancer.total_revenue = (freelancer.total_revenue || 0) + payment.net_amount;
          await freelancer.save();
        }

        console.log(`✅ Payment completed: ${paymentId}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).send('Webhook processing failed');
  }
});

// ============================================
// GET PAYMENT STATS
// ============================================
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const payments = await Payment.find({
      $or: [
        { client_id: userId },
        { freelancer_id: userId },
        { user_id: userId }
      ]
    });

    const completed = payments.filter(p => p.status === 'completed');
    const totalEarned = completed
      .filter(p => p.freelancer_id && p.freelancer_id.toString() === userId)
      .reduce((sum, p) => sum + (p.net_amount || p.amount || 0), 0);

    const totalSpent = completed
      .filter(p => p.client_id && p.client_id.toString() === userId)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({
      totalEarned,
      totalSpent,
      totalTransactions: payments.length,
      completedTransactions: completed.length
    });
  } catch (err) {
    console.error('❌ Error fetching payment stats:', err);
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
});

module.exports = router;