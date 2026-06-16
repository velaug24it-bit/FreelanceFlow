const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');

const router = express.Router();

router.post('/stripe', async (req, res) => {
    try {
        const event = req.body;

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.metadata.userId;
            const planName = session.metadata.planName || session.metadata.plan;

            await Promise.all([
                Payment.create({
                    user_id: userId,
                    amount: session.amount_total / 100,
                    currency: session.currency,
                    payment_method: 'stripe',
                    status: 'completed',
                    paid_at: new Date(),
                    description: `${planName} Subscription`,
                    stripe_payment_id: session.payment_intent
                }),
                User.findByIdAndUpdate(userId, {
                    subscription_tier: planName.toLowerCase(),
                    subscription_plan: planName.toLowerCase(),
                    subscription_status: 'active'
                })
            ]);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

module.exports = router;
