const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

const limits = {
    free: { maxClients: 5, maxProjects: 10, maxInvoices: 20, features: ['Basic Features', '5 Clients', '10 Projects', '20 Invoices'] },
    pro: { maxClients: 50, maxProjects: 100, maxInvoices: 500, features: ['All Free Features', '50 Clients', '100 Projects', '500 Invoices', 'Expense Tracking', 'Task Board', 'Reports'] },
    business: { maxClients: 999999, maxProjects: 999999, maxInvoices: 999999, features: ['All Pro Features', 'Unlimited Everything', 'Team Members', 'Priority Support', 'API Access', 'White Label'] }
};

router.get('/current', authenticateJWT, async (req, res) => {
    try {
        const [user, subscription] = await Promise.all([
            User.findById(req.userId).select('subscription_tier subscription_plan subscription_status subscription_end_date'),
            Subscription.findOne({ user_id: req.userId, status: 'active' }).sort({ created_at: -1 })
        ]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            plan: user.subscription_tier || user.subscription_plan || 'free',
            status: user.subscription_status,
            endDate: user.subscription_end_date,
            subscription
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/limits', authenticateJWT, async (req, res) => {
    try {
        const [user, clients, projects, invoices] = await Promise.all([
            User.findById(req.userId).select('subscription_tier subscription_plan'),
            Client.countDocuments({ user_id: req.userId }),
            Project.countDocuments({ user_id: req.userId }),
            Invoice.countDocuments({ user_id: req.userId })
        ]);
        const plan = user?.subscription_tier || user?.subscription_plan || 'free';

        res.json({
            plan,
            limits: limits[plan] || limits.free,
            usage: { clients, projects, invoices }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/create-checkout', authenticateJWT, async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(503).json({ error: 'Stripe is not configured' });
        }

        const plans = {
            pro: { name: 'Pro Plan', price: 1900 },
            business: { name: 'Business Plan', price: 4900 }
        };
        const plan = plans[req.body.planId];
        if (!plan) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.stripe_customer_id) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.full_name,
                metadata: { userId: req.userId }
            });
            user.stripe_customer_id = customer.id;
            await user.save();
        }

        const session = await stripe.checkout.sessions.create({
            customer: user.stripe_customer_id,
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: plan.name, description: `Monthly subscription for ${plan.name}` },
                    unit_amount: plan.price,
                    recurring: { interval: 'month' }
                },
                quantity: 1
            }],
            mode: 'subscription',
            success_url: req.body.successUrl || `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: req.body.cancelUrl || `${process.env.CLIENT_URL}/pricing`,
            metadata: { userId: req.userId, plan: req.body.planId }
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/create-portal', authenticateJWT, async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(503).json({ error: 'Stripe is not configured' });
        }
        const user = await User.findById(req.userId).select('stripe_customer_id');
        if (!user?.stripe_customer_id) {
            return res.status(400).json({ error: 'No subscription found' });
        }
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${process.env.CLIENT_URL}/settings`
        });
        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/webhook', async (req, res) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({ error: 'Stripe webhook is not configured' });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            req.headers['stripe-signature'],
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const periodStart = new Date();
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            await Promise.all([
                User.findByIdAndUpdate(session.metadata.userId, {
                    subscription_tier: session.metadata.plan,
                    subscription_plan: session.metadata.plan,
                    subscription_status: 'active',
                    subscription_end_date: periodEnd
                }),
                Subscription.findOneAndUpdate(
                    { stripe_subscription_id: session.subscription },
                    {
                        user_id: session.metadata.userId,
                        plan_name: session.metadata.plan,
                        amount: session.amount_total / 100,
                        status: 'active',
                        current_period_start: periodStart,
                        current_period_end: periodEnd
                    },
                    { upsert: true, new: true }
                ),
                Payment.create({
                    user_id: session.metadata.userId,
                    amount: session.amount_total / 100,
                    currency: session.currency,
                    payment_method: 'stripe',
                    stripe_payment_id: session.payment_intent,
                    status: 'completed',
                    paid_at: new Date()
                })
            ]);
        } else if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            await Subscription.findOneAndUpdate(
                { stripe_subscription_id: invoice.subscription },
                { status: 'active', current_period_end: new Date(invoice.period_end * 1000) }
            );
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const existing = await Subscription.findOneAndUpdate(
                { stripe_subscription_id: subscription.id },
                { status: 'canceled', canceled_at: new Date() },
                { new: true }
            );
            if (existing) {
                await User.findByIdAndUpdate(existing.user_id, {
                    subscription_tier: 'free',
                    subscription_plan: 'free',
                    subscription_status: 'canceled'
                });
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
