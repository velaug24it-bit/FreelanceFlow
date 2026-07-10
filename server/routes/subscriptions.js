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
        { id: 1, name: 'Free', price: 0, interval: 'month', features: ['Max 2 Bids & 2 Saved Projects', 'Max 2 Portfolio Items & 2 Boosts', 'Max 2 active contracts & hiring slots', 'Max 2 Projects Posted & 2 Active Projects', 'Basic Support'] },
        { id: 2, name: 'Pro', price: 249, interval: 'month', features: ['Max 10 Bids & 10 Saved Projects', 'Max 10 Portfolio Items & 10 Boosts', 'Max 10 active contracts & hiring slots', 'Max 10 Projects Posted & 10 Active Projects', 'Expense Tracking & Task Board', 'Priority Support'], popular: true },
        { id: 3, name: 'Business', price: 499, interval: 'month', features: ['Unlimited Bids & Saved Projects', 'Unlimited Portfolio Items & Boosts', 'Unlimited contracts & hiring slots', 'Unlimited Projects Posted & Active Projects', 'Team member access & API access', '24/7 Dedicated Support'] }
    ];
    res.json({ plans });
});

router.get('/my-subscription', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({
            currentPlan: user?.subscription_tier || 'free',
            status: user?.subscription_status || 'active',
            subscriptionPlan: user?.subscriptionPlan || 'FREE',
            subscriptionStatus: user?.subscriptionStatus || 'ACTIVE',
            subscriptionStartDate: user?.subscriptionStartDate || user?.created_at,
            subscriptionEndDate: user?.subscriptionEndDate,
            autoCalculatedExpiry: user?.autoCalculatedExpiry,
            remainingDays: user?.remainingDays || 0
        });
    } catch (err) {
        res.json({ currentPlan: 'free', status: 'active', subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE' });
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
        
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // Update user's subscription
        await User.findByIdAndUpdate(userId, {
            subscription_tier: planName.toLowerCase(),
            subscription_status: 'active',
            subscription_end_date: endDate,
            subscriptionPlan: planName.toUpperCase(),
            subscriptionStatus: 'ACTIVE',
            subscriptionStartDate: now,
            subscriptionEndDate: endDate,
            autoCalculatedExpiry: endDate
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
            subscription_status: 'canceled',
            subscriptionPlan: 'FREE',
            subscriptionStatus: 'CANCELLED'
        });
        res.json({ success: true, message: 'Subscription cancelled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;