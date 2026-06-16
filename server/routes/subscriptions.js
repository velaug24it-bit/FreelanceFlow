const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    email: String,
    full_name: String,
    password_hash: String,
    role: { type: String, default: 'user' },
    subscription_tier: { type: String, default: 'free' },
    subscription_status: { type: String, default: 'active' }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Payment Schema
const paymentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: Number,
    currency: String,
    payment_method: String,
    status: String,
    description: String,
    paid_at: { type: Date, default: Date.now }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

// Verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all plans
router.get('/plans', async (req, res) => {
    const plans = [
        { id: 1, name: 'Free', price: 0, interval: 'month', features: ['5 Clients', '10 Projects', '20 Invoices', 'Basic Support'] },
        { id: 2, name: 'Pro', price: 19, interval: 'month', features: ['50 Clients', '100 Projects', '500 Invoices', 'Expense Tracking', 'Task Board', 'Priority Support'], popular: true },
        { id: 3, name: 'Business', price: 49, interval: 'month', features: ['Unlimited Clients', 'Unlimited Projects', 'Unlimited Invoices', 'All Features', 'API Access', '24/7 Support'] }
    ];
    res.json({ plans });
});

// Get current subscription
router.get('/my-subscription', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({
            currentPlan: user?.subscription_tier || 'free',
            status: user?.subscription_status || 'active'
        });
    } catch (err) {
        res.json({ currentPlan: 'free', status: 'active' });
    }
});

// Create payment intent
router.post('/create-payment-intent', verifyToken, async (req, res) => {
    try {
        const { planId, planName, amount } = req.body;
        const paymentIntentId = 'pi_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        res.json({ clientSecret: paymentIntentId + '_secret', paymentIntentId: paymentIntentId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Confirm payment and activate subscription
router.post('/confirm-payment', verifyToken, async (req, res) => {
    try {
        const { planId, planName, amount, paymentIntentId } = req.body;
        const userId = req.userId;
        
        console.log(`🔄 Processing subscription for user ${userId}: ${planName} plan - $${amount}`);
        
        // Update user's subscription
        await User.findByIdAndUpdate(userId, {
            subscription_tier: planName.toLowerCase(),
            subscription_status: 'active'
        });
        
        // Record payment
        await Payment.create({
            user_id: userId,
            amount: amount,
            currency: 'usd',
            payment_method: 'stripe',
            status: 'completed',
            description: `${planName} Plan Subscription`,
            paid_at: new Date()
        });
        
        console.log(`✅ Subscription activated! Revenue of $${amount} recorded.`);
        
        res.json({ 
            success: true, 
            message: `Successfully upgraded to ${planName} plan!`,
            plan: planName
        });
    } catch (err) {
        console.error('Payment confirmation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Cancel subscription
router.post('/cancel', verifyToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, {
            subscription_tier: 'free',
            subscription_status: 'canceled'
        });
        res.json({ success: true, message: 'Subscription cancelled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;