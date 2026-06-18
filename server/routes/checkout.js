const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const getRazorpay = () => {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials are not configured');
    }

    return new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET
    });
};

const signaturesMatch = (expected, received) => {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received || '');

    if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

// Standard Checkout: create a Razorpay order.
router.post('/create-order', verifyToken, async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        const currency = req.body.currency || 'INR';
        const receipt = req.body.receipt || `receipt_${Date.now()}`;

        if (!Number.isInteger(amount) || amount < 100) {
            return res.status(400).json({ error: 'Amount must be at least 100 paise' });
        }

        if (typeof currency !== 'string' || currency.length !== 3) {
            return res.status(400).json({ error: 'Currency must be a 3-character code' });
        }

        const order = await getRazorpay().orders.create({
            amount,
            currency: currency.toUpperCase(),
            receipt: receipt.toString().slice(0, 40),
            notes: {
                userId: req.userId.toString(),
                type: 'standard_checkout'
            }
        });

        res.json({
            order_id: order.id,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Razorpay order creation failed:', err);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

// Standard Checkout: verify Razorpay payment signature.
router.post('/verify-payment', verifyToken, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification fields' });
        }

        if (!process.env.RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay secret is not configured');
        }

        const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(payload)
            .digest('hex');

        if (!signaturesMatch(expectedSignature, razorpay_signature)) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id
        });
    } catch (err) {
        console.error('Razorpay payment verification failed:', err);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

module.exports = router;
