const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Payment = require('../models/Payment');

// ============================================
// RAZORPAY INITIALIZATION
// ============================================
let razorpay;
try {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully');
    console.log(`📌 Key ID: ${process.env.RAZORPAY_KEY_ID}`);
} catch (err) {
    console.error('❌ Razorpay initialization failed:', err.message);
    razorpay = null;
}

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
// CONNECTS PACKAGES
// ============================================
const CONNECTS_PACKAGES = [
    { id: 1, connects: 50, price: 5, label: 'Starter' },
    { id: 2, connects: 120, price: 10, label: 'Popular' },
    { id: 3, connects: 300, price: 20, label: 'Pro' },
    { id: 4, connects: 800, price: 50, label: 'Business' }
];

// ============================================
// TEST CONFIGURATION
// ============================================
router.get('/test-config', async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(500).json({
                success: false,
                message: 'Razorpay not initialized',
                keyId: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not Set',
                keySecret: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not Set'
            });
        }

        const testOrder = await razorpay.orders.create({
            amount: 100,
            currency: 'INR',
            receipt: `test_${Date.now().toString().slice(-6)}`
        });

        res.json({
            success: true,
            message: '✅ Razorpay configured correctly!',
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: testOrder.id
        });
    } catch (err) {
        console.error('❌ Razorpay test failed:', err);
        res.status(500).json({
            success: false,
            error: err.error?.description || err.message,
            keyId: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not Set',
            keySecret: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Not Set'
        });
    }
});

// ============================================
// GET CONNECTS PACKAGES
// ============================================
router.get('/connects-packages', async (req, res) => {
    try {
        res.json({ packages: CONNECTS_PACKAGES });
    } catch (err) {
        console.error('Error fetching packages:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// CREATE CONNECTS ORDER
// ============================================
router.post('/create-connects-order', verifyToken, async (req, res) => {
    try {
        if (!razorpay) {
            throw new Error('Razorpay not initialized. Check your API keys.');
        }

        const { packageId } = req.body;
        const pkg = CONNECTS_PACKAGES.find(p => p.id === packageId);

        if (!pkg) {
            return res.status(400).json({ error: 'Invalid package' });
        }

        console.log(`📦 Creating connects order: ${pkg.connects} connects for ₹${pkg.price}`);

        const shortUserId = req.userId.toString().slice(-4);
        const timestamp = Date.now().toString().slice(-6);
        const receipt = `conn_${shortUserId}_${timestamp}`;

        const options = {
            amount: Math.round(pkg.price * 100),
            currency: 'INR',
            receipt: receipt,
            notes: {
                userId: req.userId.toString(),
                packageId: packageId.toString(),
                connects: pkg.connects.toString(),
                type: 'connects'
            }
        };

        const order = await razorpay.orders.create(options);

        console.log(`✅ Connects order created: ${order.id}`);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
            package: pkg
        });

    } catch (err) {
        console.error('❌ Connects order error:', err);
        console.error('❌ Razorpay error:', err.error);

        if (err.statusCode === 401 || err.error?.code === 'BAD_REQUEST_ERROR') {
            return res.status(500).json({
                error: 'Payment service authentication failed',
                details: 'Please check your Razorpay API keys',
                razorpayError: err.error
            });
        }

        res.status(500).json({
            error: 'Failed to create order',
            details: err.message
        });
    }
});

// ============================================
// VERIFY CONNECTS PAYMENT - UPDATED
// ============================================
router.post('/verify-connects', verifyToken, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            packageId
        } = req.body;

        console.log(`🔍 Verifying connects payment: ${razorpay_payment_id}`);
        console.log(`📦 Package ID: ${packageId}`);

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId) {
            return res.status(400).json({ error: 'Missing payment verification fields' });
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

        // Get package details
        const pkg = CONNECTS_PACKAGES.find(p => p.id === Number(packageId));
        if (!pkg) {
            return res.status(400).json({ error: 'Invalid package' });
        }

        console.log(`✅ Package found: ${pkg.connects} connects for ₹${pkg.price}`);

        // Find user
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add connects to user
        const previousBalance = user.connects_balance || 0;
        user.connects_balance = previousBalance + pkg.connects;
        await user.save();

        console.log(`✅ ${pkg.connects} connects added to user ${req.userId}`);
        console.log(`📊 Previous balance: ${previousBalance}, New balance: ${user.connects_balance}`);

        // Record payment - WITHOUT required fields (project_id, client_id, freelancer_id)
        const payment = new Payment({
            user_id: req.userId,
            amount: pkg.price,
            currency: 'INR',
            payment_method: 'razorpay',
            status: 'completed',
            description: `${pkg.connects} Connects Package - ${pkg.label}`,
            transaction_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            paid_at: new Date(),
            package_id: packageId,
            connects_purchased: pkg.connects,
            fee: 0,
            net_amount: pkg.price
        });
        await payment.save();

        console.log(`✅ Payment record created: ${payment._id}`);

        res.json({
            success: true,
            message: `Added ${pkg.connects} connects to your account!`,
            newBalance: user.connects_balance,
            payment: payment
        });

    } catch (err) {
        console.error('❌ Connects verification error:', err);
        console.error('❌ Error details:', err.stack);
        res.status(500).json({
            error: 'Payment verification failed',
            details: err.message
        });
    }
});

// ============================================
// CREATE SUBSCRIPTION ORDER
// ============================================
router.post('/create-order', verifyToken, async (req, res) => {
    try {
        if (!razorpay) {
            throw new Error('Razorpay not initialized. Check your API keys.');
        }

        const { planId, planName, amount } = req.body;

        console.log(`📦 Creating subscription order: ${planName} for ₹${amount}`);

        const shortUserId = req.userId.toString().slice(-4);
        const timestamp = Date.now().toString().slice(-6);
        const receipt = `sub_${shortUserId}_${timestamp}`;

        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: receipt,
            notes: {
                userId: req.userId.toString(),
                planId: planId.toString(),
                planName: planName,
                type: 'subscription'
            }
        };

        const order = await razorpay.orders.create(options);

        console.log(`✅ Subscription order created: ${order.id}`);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });

    } catch (err) {
        console.error('❌ Subscription order error:', err);
        console.error('❌ Razorpay error:', err.error);

        if (err.statusCode === 401 || err.error?.code === 'BAD_REQUEST_ERROR') {
            return res.status(500).json({
                error: 'Payment service authentication failed',
                details: 'Please check your Razorpay API keys',
                razorpayError: err.error
            });
        }

        res.status(500).json({
            error: 'Failed to create order',
            details: err.message
        });
    }
});

// ============================================
// VERIFY SUBSCRIPTION PAYMENT
// ============================================
router.post('/verify-payment', verifyToken, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planName,
            amount
        } = req.body;

        console.log(`🔍 Verifying subscription payment: ${razorpay_payment_id}`);

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification fields' });
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

        // Update user's subscription
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.subscription_tier = planName.toLowerCase();
        user.subscription_status = 'active';
        await user.save();

        // Record payment
        const payment = new Payment({
            user_id: req.userId,
            amount: amount,
            currency: 'INR',
            payment_method: 'razorpay',
            status: 'completed',
            description: `${planName} Plan Subscription`,
            transaction_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            paid_at: new Date(),
            fee: 0,
            net_amount: amount
        });
        await payment.save();

        console.log(`✅ Subscription activated: ${planName} plan for user ${req.userId}`);

        res.json({
            success: true,
            message: `Successfully upgraded to ${planName} plan!`,
            plan: planName
        });

    } catch (err) {
        console.error('❌ Subscription verification error:', err);
        res.status(500).json({
            error: 'Payment verification failed',
            details: err.message
        });
    }
});

// ============================================
// WEBHOOK
// ============================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'];

        if (secret && secret !== 'whsec_test_your_webhook_secret') {
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(req.body)
                .digest('hex');

            if (expectedSignature !== signature) {
                console.log('❌ Invalid webhook signature');
                return res.status(400).send('Invalid signature');
            }
        }

        const event = JSON.parse(req.body);
        console.log('📨 Webhook received:', event.event);

        if (event.event === 'payment.captured') {
            const paymentEntity = event.payload.payment.entity;
            const orderId = paymentEntity.order_id;
            const paymentId = paymentEntity.id;

            console.log(`💰 Payment captured: ${paymentId}`);

            const payment = await Payment.findOne({ order_id: orderId });
            if (payment && payment.status !== 'completed') {
                payment.status = 'completed';
                payment.payment_id = paymentId;
                payment.released_at = new Date();
                await payment.save();

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