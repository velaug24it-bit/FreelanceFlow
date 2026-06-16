const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Initialize Razorpay with error handling
let razorpay;
try {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully');
    console.log('   Key ID:', process.env.RAZORPAY_KEY_ID);
} catch (err) {
    console.error('❌ Razorpay initialization failed:', err.message);
}

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
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Connects packages
const CONNECTS_PACKAGES = [
    { id: 1, connects: 50, price: 5, label: 'Starter' },
    { id: 2, connects: 120, price: 10, label: 'Popular' },
    { id: 3, connects: 300, price: 20, label: 'Pro' },
    { id: 4, connects: 800, price: 50, label: 'Business' }
];

// ============ GET CONNECTS PACKAGES ============
router.get('/connects-packages', async (req, res) => {
    try {
        res.json({ packages: CONNECTS_PACKAGES });
    } catch (err) {
        console.error('Error fetching packages:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ SUBSCRIPTION PAYMENT ============

// Create order for subscription
router.post('/create-order', verifyToken, async (req, res) => {
    try {
        if (!razorpay) {
            throw new Error('Razorpay not initialized. Check your API keys.');
        }
        
        const { planId, planName, amount } = req.body;
        
        console.log(`Creating Razorpay order for ${planName} - ₹${amount}`);
        
        const shortUserId = req.userId.toString().slice(-6);
        const timestamp = Date.now().toString().slice(-8);
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
        
        console.log(`✅ Order created: ${order.id}`);
        
        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
        
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Verify subscription payment
router.post('/verify-payment', verifyToken, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planName,
            amount
        } = req.body;
        
        console.log('Verifying payment:', { razorpay_order_id, razorpay_payment_id });
        
        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        
        if (expectedSignature !== razorpay_signature) {
            console.log('❌ Invalid signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }
        
        console.log(`✅ Payment verified: ${razorpay_payment_id}`);
        
        // Update user's subscription
        await User.findByIdAndUpdate(req.userId, {
            subscription_tier: planName.toLowerCase(),
            subscription_status: 'active'
        });
        
        // Record payment
        await Payment.create({
            user_id: req.userId,
            amount: amount,
            currency: 'INR',
            payment_method: 'razorpay',
            status: 'completed',
            description: `${planName} Plan Subscription`,
            transaction_id: razorpay_payment_id,
            paid_at: new Date()
        });
        
        console.log(`✅ Subscription activated: ${planName} plan for user ${req.userId}`);
        
        res.json({
            success: true,
            message: `Successfully upgraded to ${planName} plan!`,
            plan: planName
        });
        
    } catch (err) {
        console.error('Payment verification error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ CONNECTS PAYMENT ============

// Create order for connects
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
        
        console.log(`Creating connects order: ${pkg.connects} connects for ₹${pkg.price}`);
        
        const shortUserId = req.userId.toString().slice(-6);
        const timestamp = Date.now().toString().slice(-8);
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
        res.status(500).json({ error: err.message });
    }
});

// Verify connects payment
router.post('/verify-connects', verifyToken, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            packageId
        } = req.body;
        
        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
        
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid signature' });
        }
        
        const pkg = CONNECTS_PACKAGES.find(p => p.id === packageId);
        
        // Add connects to user
        await User.findByIdAndUpdate(req.userId, {
            $inc: { 
                connects_balance: pkg.connects,
                total_connects_purchased: pkg.connects
            }
        });
        
        // Record payment
        await Payment.create({
            user_id: req.userId,
            amount: pkg.price,
            currency: 'INR',
            payment_method: 'razorpay',
            status: 'completed',
            description: `${pkg.connects} Connects Package`,
            transaction_id: razorpay_payment_id,
            paid_at: new Date()
        });
        
        res.json({
            success: true,
            message: `Added ${pkg.connects} connects to your account!`
        });
        
    } catch (err) {
        console.error('Connects verification error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ WEBHOOK ============
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
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;
            const amount = payment.amount / 100;
            
            console.log(`💰 Payment captured: ${paymentId} - ₹${amount}`);
            
            try {
                const order = await razorpay.orders.fetch(orderId);
                const userId = order.notes?.userId;
                const type = order.notes?.type;
                
                if (userId) {
                    if (type === 'subscription') {
                        await User.findByIdAndUpdate(userId, {
                            subscription_tier: order.notes.planName.toLowerCase(),
                            subscription_status: 'active'
                        });
                        console.log(`✅ Subscription activated for user ${userId}`);
                    } else if (type === 'connects') {
                        const connects = parseInt(order.notes.connects);
                        await User.findByIdAndUpdate(userId, {
                            $inc: { connects_balance: connects }
                        });
                        console.log(`✅ ${connects} connects added to user ${userId}`);
                    }
                }
            } catch (err) {
                console.error('Error processing webhook:', err);
            }
        }
        
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Webhook processing failed');
    }
});

module.exports = router;