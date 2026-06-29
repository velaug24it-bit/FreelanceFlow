const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ProjectPost = require('../models/ProjectPost');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Bid = require('../models/Bid');
const Transaction = require('../models/Transaction');
const NotificationHelper = require('../utils/notificationHelper');

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

// Calculate platform fee (5% of bid amount)
const calculatePlatformFee = (amount) => {
    const feePercentage = 5; // 5% platform fee
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

        // Find marketplace project post. Accepted marketplace work lives in ProjectPost.
        const project = await ProjectPost.findById(projectId)
            .populate('client_id', 'full_name email')
            .populate('selected_freelancer_id', 'full_name email subscription_tier');

        if (!project) {
            console.log(`❌ Project not found: ${projectId}`);
            return res.status(404).json({ error: 'Project not found' });
        }

        console.log(`✅ Project found: ${project.title}`);
        console.log(`📊 Project status: ${project.status}`);

        // ============================================
        // GET THE ACCEPTED BID AMOUNT
        // ============================================
        const acceptedBid = await Bid.findOne({
            project_id: projectId,
            status: 'accepted'
        });

        if (!acceptedBid) {
            console.log(`❌ No accepted bid found for project: ${projectId}`);
            return res.status(400).json({ error: 'No accepted bid found for this project' });
        }

        console.log(`💰 Accepted bid amount: ${acceptedBid.bid_amount}`);

        // Get client ID from project
        let projectClientId = null;
        if (project.client_id) {
            if (typeof project.client_id === 'object' && project.client_id._id) {
                projectClientId = project.client_id._id.toString();
            } else if (typeof project.client_id === 'object' && project.client_id.toString) {
                projectClientId = project.client_id.toString();
            } else if (typeof project.client_id === 'string') {
                projectClientId = project.client_id;
            }
        }

        if (!projectClientId && project._doc && project._doc.client_id) {
            const docClientId = project._doc.client_id;
            if (typeof docClientId === 'object' && docClientId.toString) {
                projectClientId = docClientId.toString();
            } else if (typeof docClientId === 'string') {
                projectClientId = docClientId;
            }
        }

        console.log(`🔍 Client ID from project: ${projectClientId}`);

        // Check if user is the client
        if (!projectClientId) {
            console.log(`❌ No client assigned to this project`);
            return res.status(400).json({ error: 'No client assigned to this project' });
        }

        if (projectClientId !== clientId) {
            console.log(`❌ User ${clientId} is not the client. Client is: ${projectClientId}`);
            return res.status(403).json({ error: 'Only the client can release payment' });
        }

        // Check if project is completed
        if (project.status !== 'completed') {
            return res.status(400).json({ error: 'Project must be completed to release payment' });
        }

        // Check if payment already completed
        if (project.payment_status === 'paid') {
            return res.status(400).json({ error: 'Payment already completed for this project' });
        }

        // Check if freelancer exists
        let freelancerId = null;
        if (project.selected_freelancer_id) {
            if (typeof project.selected_freelancer_id === 'object' && project.selected_freelancer_id._id) {
                freelancerId = project.selected_freelancer_id._id;
            } else {
                freelancerId = project.selected_freelancer_id;
            }
        }

        if (!freelancerId) {
            return res.status(400).json({ error: 'No freelancer assigned to this project' });
        }

        // Get freelancer details
        const freelancer = await User.findById(freelancerId);
        if (!freelancer) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        // ============================================
        // CALCULATE AMOUNTS WITH 5% PLATFORM FEE
        // ============================================
        const bidAmount = acceptedBid.bid_amount || 0;
        if (bidAmount <= 0) {
            return res.status(400).json({ error: 'Invalid bid amount' });
        }

        // Platform fee (5% of bid amount) - charged to client
        const platformFee = calculatePlatformFee(bidAmount);
        
        // Total amount client pays = bid amount + platform fee
        const totalClientCharge = bidAmount + platformFee;
        
        // Freelancer receives the full bid amount (no deduction)
        const freelancerReceives = bidAmount;

        console.log(`💰 Bid Amount: ${bidAmount}`);
        console.log(`💰 Platform Fee (5%): ${platformFee}`);
        console.log(`💰 Total Client Pays: ${totalClientCharge}`);
        console.log(`💰 Freelancer Receives: ${freelancerReceives}`);

        // Generate receipt (max 40 chars)
        const shortUserId = clientId.toString().slice(-4);
        const timestamp = Date.now().toString().slice(-6);
        const receipt = `pay_${shortUserId}_${timestamp}`;

        // Create Razorpay order - client pays total (bid + fee)
        const orderOptions = {
            amount: Math.round(totalClientCharge * 100), // Convert to paise
            currency: 'INR',
            receipt: receipt,
            notes: {
                projectId: projectId,
                clientId: clientId,
                freelancerId: freelancerId.toString(),
                bidAmount: bidAmount.toString(),
                platformFee: platformFee.toString(),
                freelancerReceives: freelancerReceives.toString(),
                totalClientCharge: totalClientCharge.toString(),
                bidId: acceptedBid._id.toString()
            }
        };

        console.log('📦 Creating Razorpay order...');
        const order = await razorpay.orders.create(orderOptions);
        console.log(`✅ Order created: ${order.id}`);

        // Create payment record
        const payment = new Payment({
            project_id: projectId,
            client_id: clientId,
            freelancer_id: freelancerId,
            amount: totalClientCharge, // Total client pays
            currency: 'INR',
            status: 'pending',
            order_id: order.id,
            fee: platformFee, // Platform fee
            net_amount: freelancerReceives, // Freelancer receives full bid
            description: `Payment for project: ${project.title} (Bid: $${bidAmount} + 5% fee: $${platformFee})`,
            bid_amount: bidAmount,
            platform_fee: platformFee,
            freelancer_amount: freelancerReceives,
            payment_type: 'project_release'
        });
        await payment.save();
        console.log(`✅ Payment record created: ${payment._id}`);

        // Update project using findOneAndUpdate
        await ProjectPost.findOneAndUpdate(
            { _id: projectId },
            {
                $set: {
                    release_requested: true,
                    release_requested_at: new Date(),
                    payment_id: payment._id,
                    payment_status: 'pending',
                    amount_released: bidAmount,
                    bid_amount: bidAmount,
                    platform_fee: platformFee,
                    freelancer_amount: freelancerReceives
                }
            }
        );
        console.log(`✅ Project updated: ${projectId}`);

        // Get updated project for response
        const updatedProject = await ProjectPost.findById(projectId);

        res.json({
            success: true,
            orderId: order.id,
            key: process.env.RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            payment: payment,
            project: updatedProject,
            bidAmount: bidAmount,
            platformFee: platformFee,
            freelancerReceives: freelancerReceives,
            totalClientCharge: totalClientCharge
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

        const wasAlreadyCompleted = payment.status === 'completed';

        // Update payment status
        payment.status = 'completed';
        payment.payment_id = razorpay_payment_id;
        payment.paid_at = new Date();
        payment.released_at = new Date();
        await payment.save();

        // Update marketplace project post and release amount to the freelancer
        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            await ProjectPost.findOneAndUpdate(
                { _id: projectId },
                {
                    $set: {
                        payment_status: 'paid',
                        payment_id: payment._id,
                        payment_released_at: new Date(),
                        amount_released: payment.freelancer_amount || payment.net_amount || payment.bid_amount || 0,
                        bid_amount: payment.bid_amount || 0,
                        platform_fee: payment.platform_fee || payment.fee || 0,
                        freelancer_amount: payment.freelancer_amount || payment.net_amount || payment.bid_amount || 0
                    }
                }
            );

            await Transaction.findOneAndUpdate(
                { project_id: projectId, freelancer_id: payment.freelancer_id },
                {
                    $set: {
                        status: 'completed',
                        payment_id: razorpay_payment_id,
                        completed_at: new Date()
                    }
                }
            );
        }

        if (!wasAlreadyCompleted && payment.freelancer_id) {
            await User.findByIdAndUpdate(payment.freelancer_id, {
                $inc: { total_earnings: payment.freelancer_amount || payment.net_amount || payment.bid_amount || 0 }
            });
        }

        res.json({
            success: true,
            message: 'Payment released to freelancer successfully',
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
// RESET PAYMENT
// ============================================
router.post('/reset-payment/:projectId', verifyToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const clientId = req.userId;

        console.log(`🔄 Resetting payment for project: ${projectId}`);

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }

        const project = await ProjectPost.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get client ID from project
        let projectClientId = null;
        if (project.client_id) {
            if (typeof project.client_id === 'object' && project.client_id._id) {
                projectClientId = project.client_id._id.toString();
            } else if (typeof project.client_id === 'object' && project.client_id.toString) {
                projectClientId = project.client_id.toString();
            } else if (typeof project.client_id === 'string') {
                projectClientId = project.client_id;
            }
        }

        if (!projectClientId && project._doc && project._doc.client_id) {
            const docClientId = project._doc.client_id;
            if (typeof docClientId === 'object' && docClientId.toString) {
                projectClientId = docClientId.toString();
            } else if (typeof docClientId === 'string') {
                projectClientId = docClientId;
            }
        }

        // Check if user is the client
        if (projectClientId !== clientId) {
            return res.status(403).json({ error: 'Only the client can reset payment' });
        }

        // Only reset if not completed
        if (project.payment_status === 'paid') {
            return res.status(400).json({ error: 'Payment already completed, cannot reset' });
        }

        // Reset project using findOneAndUpdate
        await ProjectPost.findOneAndUpdate(
            { _id: projectId },
            {
                $set: {
                    release_requested: false,
                    release_requested_at: null,
                    payment_id: null,
                    payment_status: 'unpaid',
                    amount_released: 0,
                    payment_released_at: null
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

                const project = await ProjectPost.findById(payment.project_id);
                if (project) {
                    project.payment_status = 'paid';
                    project.payment_released_at = new Date();
                    project.payment_id = payment._id;
                    project.amount_released = payment.freelancer_amount || payment.net_amount || payment.bid_amount || 0;
                    project.bid_amount = payment.bid_amount || 0;
                    project.platform_fee = payment.platform_fee || payment.fee || 0;
                    project.freelancer_amount = payment.freelancer_amount || payment.net_amount || payment.bid_amount || 0;
                    await project.save();
                }

                const freelancer = await User.findById(payment.freelancer_id);
                if (freelancer) {
                    freelancer.total_earnings = (freelancer.total_earnings || 0) + payment.net_amount;
                    await freelancer.save();
                }

                // Record platform revenue
                console.log(`💰 Platform earned: $${payment.fee} from project ${payment.project_id}`);

                // Send notifications
                try {
                    // Notify freelancer
                    if (payment.freelancer_id) {
                        await NotificationHelper.createNotification({
                            userId: payment.freelancer_id,
                            type: 'payment_received',
                            title: '💳 Payment Received',
                            message: `A payment of $${payment.net_amount || payment.amount} was released for project ${payment.project_id}`,
                            referenceId: payment._id,
                            referenceType: 'payment',
                            actionUrl: `/projects/${payment.project_id}`
                        });
                    }

                    // Notify client
                    if (payment.client_id) {
                        await NotificationHelper.createNotification({
                            userId: payment.client_id,
                            type: 'payment_released',
                            title: '✅ Payment Completed',
                            message: `Your payment of $${payment.amount} has been processed for project ${payment.project_id}`,
                            referenceId: payment._id,
                            referenceType: 'payment',
                            actionUrl: `/projects/${payment.project_id}`
                        });
                    }
                } catch (err) {
                    console.error('Error sending payment notifications:', err);
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
