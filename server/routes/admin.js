const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Models
const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const ProjectPost = require('../models/ProjectPost');
const Bid = require('../models/Bid');
const Contract = require('../models/Contract');

// Admin middleware
const verifyAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(verified.id);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.adminId = verified.id;
        next();
    } catch (err) {
        console.error('Admin verification error:', err);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ============================================
// GET ALL USERS WITH THEIR DATA (PRESERVED + NEW)
// ============================================
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.aggregate([
            { $match: { role: { $ne: 'admin' } } },
            {
                $lookup: {
                    from: 'clients',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'clients'
                }
            },
            {
                $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'projects'
                }
            },
            {
                $lookup: {
                    from: 'invoices',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'invoices'
                }
            },
            {
                $lookup: {
                    from: 'payments',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'payments'
                }
            },
            {
                $addFields: {
                    id: '$_id',
                    // PRESERVED: Get subscription_tier from user document
                    plan: { $ifNull: ['$subscription_tier', 'free'] },
                    status: { $ifNull: ['$subscription_status', 'active'] },
                    client_count: { $size: '$clients' },
                    project_count: { $size: '$projects' },
                    invoice_count: { $size: '$invoices' },
                    // PRESERVED: Total revenue from invoices
                    total_revenue: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$invoices',
                                        as: 'inv',
                                        cond: { $eq: ['$$inv.status', 'paid'] }
                                    }
                                },
                                as: 'inv',
                                in: { $toDouble: '$$inv.total_amount' }
                            }
                        }
                    },
                    // NEW: Subscription revenue from payments
                    subscription_revenue: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$payments',
                                        as: 'p',
                                        cond: {
                                            $and: [
                                                { $eq: ['$$p.status', 'completed'] },
                                                { $ne: ['$$p.package_id', null] }
                                            ]
                                        }
                                    }
                                },
                                as: 'p',
                                in: { $toDouble: '$$p.amount' }
                            }
                        }
                    },
                    // NEW: Connects revenue
                    connects_revenue: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$payments',
                                        as: 'p',
                                        cond: {
                                            $and: [
                                                { $eq: ['$$p.status', 'completed'] },
                                                { $ne: ['$$p.package_id', null] }
                                            ]
                                        }
                                    }
                                },
                                as: 'p',
                                in: { $toDouble: '$$p.amount' }
                            }
                        }
                    },
                    // NEW: Total connects purchased
                    total_connects_purchased: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$payments',
                                        as: 'p',
                                        cond: {
                                            $and: [
                                                { $eq: ['$$p.status', 'completed'] },
                                                { $ne: ['$$p.package_id', null] }
                                            ]
                                        }
                                    }
                                },
                                as: 'p',
                                in: { $toDouble: '$$p.connects_purchased' }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    password_hash: 0,
                    clients: 0,
                    projects: 0,
                    invoices: 0,
                    payments: 0,
                    __v: 0
                }
            },
            { $sort: { created_at: -1 } }
        ]);

        console.log('✅ Users fetched:', users.length);
        res.json({ users });
    } catch (err) {
        console.error('❌ Error fetching users:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET DASHBOARD STATS (PRESERVED + NEW)
// ============================================
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

        // PRESERVED: Revenue from all completed payments
        const totalRevenue = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // PRESERVED: Active subscriptions
        const activeSubscriptions = await User.countDocuments({
            subscription_tier: { $in: ['pro', 'business'] },
            subscription_status: 'active',
            role: { $ne: 'admin' }
        });

        // NEW: Connects revenue
        const connectsRevenue = await Payment.aggregate([
            { $match: { status: 'completed', package_id: { $ne: null } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // NEW: Subscription revenue
        const subscriptionRevenue = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    description: { $regex: /Plan/i }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // NEW: Project revenue
        const projectRevenue = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    project_id: { $ne: null }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // NEW: Total connects sold
        const totalConnectsSold = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    package_id: { $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$connects_purchased' }
                }
            }
        ]);

        // PRESERVED: Monthly revenue (last 6 months)
        const monthlyRevenue = await Payment.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$paid_at' } },
                    revenue: { $sum: '$amount' },
                    new_subscribers: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 6 }
        ]);

        res.json({
            // PRESERVED
            totalUsers,
            totalRevenue: totalRevenue[0]?.total || 0,
            activeSubscriptions,
            monthlyRevenue: monthlyRevenue.map(m => ({
                month: m._id,
                revenue: m.revenue,
                new_subscribers: m.new_subscribers
            })),
            // NEW
            connectsRevenue: connectsRevenue[0]?.total || 0,
            subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
            projectRevenue: projectRevenue[0]?.total || 0,
            totalConnectsSold: totalConnectsSold[0]?.total || 0
        });
    } catch (err) {
        console.error('❌ Error fetching stats:', err);
        res.json({
            totalUsers: 0,
            totalRevenue: 0,
            activeSubscriptions: 0,
            monthlyRevenue: [],
            connectsRevenue: 0,
            subscriptionRevenue: 0,
            projectRevenue: 0,
            totalConnectsSold: 0
        });
    }
});

// ============================================
// GET REVENUE REPORT (PRESERVED + NEW)
// ============================================
router.get('/revenue', verifyAdmin, async (req, res) => {
    try {
        // PRESERVED: Monthly revenue (last 12 months)
        const monthlyRevenue = await Payment.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$paid_at' } },
                    revenue: { $sum: '$amount' },
                    new_subscribers: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 12 }
        ]);

        // PRESERVED: Total earnings
        const totalEarnings = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // NEW: Revenue breakdown by type
        const connectsRevenue = await Payment.aggregate([
            { $match: { status: 'completed', package_id: { $ne: null } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const subscriptionRevenue = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    description: { $regex: /Plan/i }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const projectRevenue = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    project_id: { $ne: null }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalConnectsSold = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    package_id: { $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$connects_purchased' }
                }
            }
        ]);

        res.json({
            // PRESERVED
            totalEarnings: totalEarnings[0]?.total || 0,
            monthlyRevenue: monthlyRevenue.map(m => ({
                month: m._id,
                revenue: m.revenue,
                new_subscribers: m.new_subscribers
            })),
            // NEW
            connectsRevenue: connectsRevenue[0]?.total || 0,
            subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
            projectRevenue: projectRevenue[0]?.total || 0,
            totalConnectsSold: totalConnectsSold[0]?.total || 0
        });
    } catch (err) {
        console.error('❌ Error fetching revenue:', err);
        res.json({
            totalEarnings: 0,
            monthlyRevenue: [],
            connectsRevenue: 0,
            subscriptionRevenue: 0,
            projectRevenue: 0,
            totalConnectsSold: 0
        });
    }
});

// ============================================
// GET SINGLE USER DETAILS WITH FULL HISTORY (NEW)
// ============================================
router.get('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password_hash');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get all data
        const [clients, projects, invoices, expenses, payments, projectPosts, bids] = await Promise.all([
            Client.find({ user_id: user._id }),
            Project.find({ user_id: user._id }),
            Invoice.find({ user_id: user._id }),
            Expense.find({ user_id: user._id }),
            Payment.find({
                $or: [
                    { user_id: user._id },
                    { client_id: user._id },
                    { freelancer_id: user._id }
                ]
            }).sort({ created_at: -1 }),
            ProjectPost.find({ client_id: user._id }),
            Bid.find({ freelancer_id: user._id })
        ]);

        // Calculate stats
        const totalRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // NEW: Connects revenue
        const connectsPayments = payments.filter(p => p.package_id && p.status === 'completed');
        const connectsRevenue = connectsPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalConnectsPurchased = connectsPayments.reduce((sum, p) => sum + (p.connects_purchased || 0), 0);

        // NEW: Subscription revenue
        const subscriptionPayments = payments.filter(p => p.description?.includes('Plan') && p.status === 'completed');
        const subscriptionRevenue = subscriptionPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // NEW: Project payments
        const projectPayments = payments.filter(p => p.project_id && p.status === 'completed');
        const projectRevenue = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // NEW: Payment history with details
        const paymentHistory = payments.map(p => ({
            id: p._id,
            amount: p.amount,
            currency: p.currency || 'USD',
            status: p.status,
            description: p.description ||
                (p.package_id ? `${p.connects_purchased || 0} Connects Package` : 'Payment'),
            type: p.package_id ? 'connects' :
                p.description?.includes('Plan') ? 'subscription' :
                    p.project_id ? 'project' : 'other',
            created_at: p.created_at,
            paid_at: p.paid_at
        }));

        res.json({
            // PRESERVED
            user: {
                id: user._id,
                name: user.full_name,
                email: user.email,
                company_name: user.company_name,
                subscription_tier: user.subscription_tier || 'free',
                subscription_status: user.subscription_status || 'active',
                connects_balance: user.connects_balance || 0,
                joined_date: user.created_at
            },
            stats: {
                // PRESERVED
                total_clients: clients.length,
                total_projects: projects.length,
                total_invoices: invoices.length,
                total_expenses: expenses.length,
                total_revenue: totalRevenue,
                total_expenses_amount: totalExpenses,
                net_income: totalRevenue - totalExpenses,
                subscription_revenue: subscriptionRevenue,
                active_contracts: 0,
                // NEW
                connects_revenue: connectsRevenue,
                project_revenue: projectRevenue,
                total_connects_purchased: totalConnectsPurchased,
                total_payments: payments.length
            },
            // PRESERVED
            clients: clients.map(c => ({
                id: c._id,
                name: c.contact_name,
                company: c.company_name,
                email: c.email,
                total_revenue: c.total_revenue || 0
            })),
            projects: projects.map(p => ({
                id: p._id,
                title: p.title,
                status: p.status,
                budget: p.budget
            })),
            invoices: invoices.map(i => ({
                id: i._id,
                number: i.invoice_number,
                amount: i.total_amount,
                status: i.status
            })),
            expenses: expenses.map(e => ({
                id: e._id,
                category: e.category,
                amount: e.amount,
                description: e.description
            })),
            // NEW: Payment history
            payments: paymentHistory,
            // NEW: Project posts
            projectPosts: projectPosts.map(p => ({
                id: p._id,
                title: p.title,
                status: p.status,
                budget_max: p.budget_max
            })),
            // NEW: Bids
            bids: bids.map(b => ({
                id: b._id,
                amount: b.amount,
                status: b.status,
                project_title: b.project_title
            }))
        });
    } catch (err) {
        console.error('❌ Error fetching user details:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// UPDATE USER SUBSCRIPTION (PRESERVED)
// ============================================
router.put('/users/:id/subscription', verifyAdmin, async (req, res) => {
    try {
        const { plan, status } = req.body;

        await User.findByIdAndUpdate(req.params.id, {
            subscription_tier: plan,
            subscription_status: status
        });

        // If upgrading to paid plan, add a payment record
        if (plan !== 'free') {
            const amount = plan === 'pro' ? 19 : 49;
            await Payment.create({
                user_id: req.params.id,
                amount: amount,
                currency: 'USD',
                payment_method: 'admin',
                status: 'completed',
                description: `${plan} Plan - Admin update`,
                paid_at: new Date()
            });
        }

        res.json({ message: 'Subscription updated successfully' });
    } catch (err) {
        console.error('❌ Error updating subscription:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE USER (PRESERVED)
// ============================================
router.delete('/users/:id', verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('❌ Error deleting user:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DEBUG ROUTE (PRESERVED)
// ============================================
router.get('/debug-plans', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { email: 1, full_name: 1, subscription_tier: 1, subscription_status: 1 });
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;