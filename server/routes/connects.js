const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Try to load Razorpay, but don't fail if not installed
let razorpay;
try {
    razorpay = require('razorpay');
} catch (err) {
    console.log('⚠️ Razorpay not installed. Connects purchase will use mock mode.');
}

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

// Connects packages
const CONNECTS_PACKAGES = [
    { id: 1, connects: 50, price: 5, price_inr: 5, popular: false },
    { id: 2, connects: 120, price: 10, price_inr: 10, popular: true },
    { id: 3, connects: 300, price: 20, price_inr: 20, popular: false },
    { id: 4, connects: 800, price: 50, price_inr: 50, popular: false }
];

// Get connects packages
router.get('/packages', async (req, res) => {
    res.json({ packages: CONNECTS_PACKAGES });
});

// Get user's connects balance
router.get('/balance', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({ 
            connects_balance: user.connects_balance || 20,
            total_connects_used: user.total_connects_used || 0,
            subscription_tier: user.subscription_tier || 'free'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create order for connects purchase (Mock version - no actual payment)
router.post('/purchase-order', verifyToken, async (req, res) => {
    try {
        const { packageId } = req.body;
        const pkg = CONNECTS_PACKAGES.find(p => p.id === packageId);
        
        if (!pkg) {
            return res.status(400).json({ error: 'Invalid package' });
        }
        
        // For testing, create a mock order
        const mockOrderId = 'mock_order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        res.json({
            success: true,
            orderId: mockOrderId,
            amount: pkg.price * 100,
            currency: 'INR',
            key: 'mock_key',
            package: pkg,
            mock: true
        });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Verify connects purchase and add credits (Mock version)
router.post('/verify-purchase', verifyToken, async (req, res) => {
    try {
        const { packageId } = req.body;
        const pkg = CONNECTS_PACKAGES.find(p => p.id === packageId);
        
        if (!pkg) {
            return res.status(400).json({ error: 'Invalid package' });
        }
        
        // Add connects to user
        await User.findByIdAndUpdate(req.userId, {
            $inc: { 
                connects_balance: pkg.connects,
                total_connects_purchased: pkg.connects
            }
        });
        
        res.json({
            success: true,
            message: `Added ${pkg.connects} connects to your account!`
        });
    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Monthly connects reset (call this via cron job)
router.post('/reset-monthly-connects', async (req, res) => {
    try {
        // Reset connects for free users to 20, pro users to 200
        await User.updateMany(
            { subscription_tier: 'free' },
            { connects_balance: 20 }
        );
        await User.updateMany(
            { subscription_tier: 'pro' },
            { connects_balance: 200 }
        );
        await User.updateMany(
            { subscription_tier: 'business' },
            { connects_balance: 500 }
        );
        
        res.json({ success: true, message: 'Monthly connects reset' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;