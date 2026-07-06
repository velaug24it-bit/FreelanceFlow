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
const Report = require('../models/Report');
const Review = require('../models/Review');

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
                    from: 'projectposts',
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
                    from: 'projectposts',
                    localField: '_id',
                    foreignField: 'selected_freelancer_id',
                    as: 'freelancer_projects'
                }
            },
            {
                $lookup: {
                    from: 'payments',
                    let: { userId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ['$user_id', '$$userId'] },
                                        { $eq: ['$client_id', '$$userId'] },
                                        { $eq: ['$freelancer_id', '$$userId'] }
                                    ]
                                }
                            }
                        }
                    ],
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
                    // PRESERVED: Total revenue from invoices + completed project payments
                    total_revenue: {
                        $add: [
                            {
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
                            {
                                $sum: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: '$payments',
                                                as: 'p',
                                                cond: {
                                                    $and: [
                                                        { $eq: ['$$p.status', 'completed'] },
                                                        { $eq: ['$$p.freelancer_id', '$_id'] },
                                                        { $ne: [{ $ifNull: ['$$p.project_id', null] }, null] }
                                                    ]
                                                }
                                            }
                                        },
                                        as: 'p',
                                        in: { $toDouble: '$$p.amount' }
                                    }
                                }
                            },
                            {
                                $sum: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: '$freelancer_projects',
                                                as: 'fp',
                                                cond: {
                                                    $or: [
                                                        { $eq: ['$$fp.payment_status', 'paid'] },
                                                        { $eq: ['$$fp.status', 'completed'] }
                                                    ]
                                                }
                                            }
                                        },
                                        as: 'fp',
                                        in: {
                                            $convert: {
                                                input: { $ifNull: ['$$fp.bid_amount', { $ifNull: ['$$fp.budget', 0] }] },
                                                to: 'double',
                                                onError: 0,
                                                onNull: 0
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    // NEW: Total spent by client on projects and platform
                    client_spent: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$payments',
                                        as: 'p',
                                        cond: {
                                            $and: [
                                                { $eq: ['$$p.status', 'completed'] },
                                                {
                                                    $or: [
                                                        { $eq: ['$$p.client_id', '$_id'] },
                                                        { $eq: ['$$p.user_id', '$_id'] }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                },
                                as: 'p',
                                in: { $toDouble: '$$p.amount' }
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
                                                { $eq: [{ $ifNull: ['$$p.package_id', null] }, null] },
                                                { $regexMatch: { input: { $ifNull: ['$$p.description', ''] }, regex: /plan|subscription/i } }
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
                                                {
                                                    $or: [
                                                        { $ne: [{ $ifNull: ['$$p.package_id', null] }, null] },
                                                        { $regexMatch: { input: { $ifNull: ['$$p.description', ''] }, regex: /connects/i } }
                                                    ]
                                                }
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
                                                {
                                                    $or: [
                                                        { $ne: [{ $ifNull: ['$$p.package_id', null] }, null] },
                                                        { $regexMatch: { input: { $ifNull: ['$$p.description', ''] }, regex: /connects/i } }
                                                    ]
                                                }
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
            {
                $match: {
                    status: 'completed',
                    $or: [
                        { package_id: { $ne: null, $exists: true } },
                        { description: { $regex: /connects/i } }
                    ]
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // NEW: Subscription revenue
        const subscriptionRevenue = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    package_id: { $eq: null },
                    description: { $regex: /plan|subscription/i }
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
                    $or: [
                        { package_id: { $ne: null, $exists: true } },
                        { description: { $regex: /connects/i } }
                    ]
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
            {
                $match: {
                    status: 'completed',
                    $or: [
                        { package_id: { $ne: null, $exists: true } },
                        { description: { $regex: /connects/i } }
                    ]
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const subscriptionRevenue = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    package_id: { $eq: null },
                    description: { $regex: /plan|subscription/i }
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
                    $or: [
                        { package_id: { $ne: null, $exists: true } },
                        { description: { $regex: /connects/i } }
                    ]
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
            Project.find({ user_id: user._id }).populate({ path: 'client_id', model: 'Client' }),
            Invoice.find({ user_id: user._id }).populate('client_id'),
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
        // Project revenue from payments where user is freelancer
        const connectsPayments = payments.filter(p => (p.package_id || p.description?.toLowerCase().includes('connects')) && p.status === 'completed');
        const connectsRevenue = connectsPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalConnectsPurchased = connectsPayments.reduce((sum, p) => sum + (p.connects_purchased || 0), 0);

        const subscriptionPayments = payments.filter(p => !p.package_id && (p.description?.toLowerCase().includes('plan') || p.description?.toLowerCase().includes('subscription')) && p.status === 'completed');
        const subscriptionRevenue = subscriptionPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const projectPayments = payments.filter(p => p.project_id && p.status === 'completed' && p.freelancer_id?.toString() === user._id.toString());
        const projectRevenue = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const invoiceRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        const totalRevenue = invoiceRevenue + projectRevenue;
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // Calculate client revenue: Paid invoices + Completed project payments for that client
        const clientsWithRevenue = clients.map(c => {
            const clientInvoices = invoices.filter(inv => inv.client_id?._id?.toString() === c._id.toString() && inv.status === 'paid');
            const invoiceSum = clientInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

            const clientProjectIds = projects.filter(p => p.client_id?._id?.toString() === c._id.toString()).map(p => p._id.toString());
            const clientProjectPayments = payments.filter(p => p.status === 'completed' && p.project_id && clientProjectIds.includes(p.project_id.toString()));
            const projectSum = clientProjectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

            return {
                id: c._id,
                name: c.contact_name,
                company: c.company_name,
                email: c.email,
                total_revenue: invoiceSum + projectSum
            };
        });

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
                active_contracts: projects.filter(p => p.status === 'active' || p.status === 'in_progress').length,
                // NEW
                connects_revenue: connectsRevenue,
                project_revenue: projectRevenue,
                total_connects_purchased: totalConnectsPurchased,
                total_payments: payments.length
            },
            // PRESERVED
            clients: clientsWithRevenue,
            projects: projects.map(p => ({
                id: p._id,
                title: p.title,
                status: p.status,
                budget: p.budget || p.budget_max || 0,
                client_name: p.client_name || p.client_id?.contact_name || p.client_id?.full_name || 'No Client'
            })),
            invoices: invoices.map(i => ({
                id: i._id,
                number: i.invoice_number,
                amount: i.total_amount,
                status: i.status,
                client_name: i.client_id?.contact_name || 'Unknown',
                client_company: i.client_id?.company_name || '-'
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
// GET ALL FREELANCERS WITH STATS (NEW)
// ============================================
router.get('/freelancers', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } });
        const freelancers = await Promise.all(users.map(async (user) => {
            const [clientsCount, projects, invoices, expenses, payments, bids, marketplaceProjects] = await Promise.all([
                Client.countDocuments({ user_id: user._id }),
                Project.find({ user_id: user._id }),
                Invoice.find({ user_id: user._id, status: 'paid' }),
                Expense.find({ user_id: user._id }),
                Payment.find({
                    $or: [
                        { user_id: user._id },
                        { client_id: user._id },
                        { freelancer_id: user._id }
                    ]
                }),
                Bid.find({ freelancer_id: user._id }),
                ProjectPost.find({ selected_freelancer_id: user._id })
            ]);

            const invoiceRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
            const projectPayments = payments.filter(p => p.project_id && p.status === 'completed' && p.freelancer_id?.toString() === user._id.toString());
            const projectRevenue = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const marketplaceRevenue = marketplaceProjects
                .filter(p => p.status === 'completed' || p.payment_status === 'paid')
                .reduce((sum, p) => sum + (parseFloat(p.bid_amount) || parseFloat(p.budget) || 0), 0);
            const totalRevenue = invoiceRevenue + projectRevenue + marketplaceRevenue;

            const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
            const bidsPlaced = bids.length;
            const bidsWon = bids.filter(b => b.status === 'accepted').length;

            return {
                freelancer: {
                    id: user._id,
                    name: user.full_name,
                    email: user.email,
                    subscription_tier: user.subscription_tier || 'free',
                    company_name: user.company_name,
                    joined_date: user.created_at
                },
                stats: {
                    total_clients: clientsCount,
                    total_projects: projects.length,
                    total_revenue: totalRevenue,
                    net_income: totalRevenue - totalExpenses,
                    bids_placed: bidsPlaced,
                    bids_won: bidsWon
                }
            };
        }));

        res.json({ freelancers });
    } catch (err) {
        console.error('❌ Error fetching freelancers:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET SINGLE FREELANCER HISTORY DETAILS (NEW)
// ============================================
router.get('/freelancers/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        const [clients, projects, invoices, expenses, payments, bids] = await Promise.all([
            Client.find({ user_id: user._id }),
            Project.find({ user_id: user._id }).populate({ path: 'client_id', model: 'Client' }),
            Invoice.find({ user_id: user._id }).populate('client_id'),
            Expense.find({ user_id: user._id }),
            Payment.find({
                $or: [
                    { user_id: user._id },
                    { client_id: user._id },
                    { freelancer_id: user._id }
                ]
            }),
            Bid.find({ freelancer_id: user._id })
        ]);

        const invoiceRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        const projectPayments = payments.filter(p => p.project_id && p.status === 'completed' && p.freelancer_id?.toString() === user._id.toString());
        const projectRevenue = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalRevenue = invoiceRevenue + projectRevenue;

        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const bidsPlaced = bids.length;
        const bidsWon = bids.filter(b => b.status === 'accepted').length;
        const conversionRate = bidsPlaced > 0 ? Math.round((bidsWon / bidsPlaced) * 100) : 0;

        const clientsWithRevenue = clients.map(c => {
            const clientInvoices = invoices.filter(inv => inv.client_id?._id?.toString() === c._id.toString() && inv.status === 'paid');
            const invoiceSum = clientInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

            const clientProjectIds = projects.filter(p => p.client_id?._id?.toString() === c._id.toString()).map(p => p._id.toString());
            const clientProjectPayments = payments.filter(p => p.status === 'completed' && p.project_id && clientProjectIds.includes(p.project_id.toString()));
            const projectSum = clientProjectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

            return {
                id: c._id,
                name: c.contact_name,
                company: c.company_name,
                email: c.email,
                total_revenue: invoiceSum + projectSum
            };
        });

        res.json({
            freelancer: {
                id: user._id,
                name: user.full_name,
                email: user.email,
                subscription_tier: user.subscription_tier || 'free',
                company_name: user.company_name,
                joined_date: user.created_at
            },
            stats: {
                total_revenue: totalRevenue,
                net_income: totalRevenue - totalExpenses,
                conversion_rate: conversionRate,
                active_contracts: projects.filter(p => p.status === 'active' || p.status === 'in_progress').length
            },
            clients: clientsWithRevenue,
            projects: projects.map(p => ({
                id: p._id,
                title: p.title,
                status: p.status,
                budget: p.budget || p.budget_max || 0,
                client_name: p.client_name || p.client_id?.contact_name || p.client_id?.full_name || 'No Client'
            })),
            invoices: invoices.map(i => ({
                id: i._id,
                number: i.invoice_number,
                amount: i.total_amount,
                status: i.status,
                client_name: i.client_id?.contact_name || 'Unknown',
                client_company: i.client_id?.company_name || '-'
            }))
        });
    } catch (err) {
        console.error('❌ Error fetching freelancer details:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MODERATION TOOLS (ADDITIVE)
// ============================================
router.get('/moderation/reports', verifyAdmin, async (req, res) => {
    try {
        const status = req.query.status || 'all';
        const filter = status === 'all' ? {} : { status };

        const [reports, summary] = await Promise.all([
            Report.find(filter)
                .populate('reporter_id', 'full_name email')
                .sort({ created_at: -1 })
                .limit(200),
            Report.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        res.json({
            reports,
            summary: summary.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        });
    } catch (err) {
        console.error('Error fetching moderation reports:', err);
        res.status(500).json({ error: err.message });
    }
});

router.patch('/moderation/reports/:id', verifyAdmin, async (req, res) => {
    try {
        const { status, admin_notes = '' } = req.body;
        const allowed = ['open', 'reviewing', 'resolved', 'dismissed'];
        if (status && !allowed.includes(status)) {
            return res.status(400).json({ error: 'Invalid report status' });
        }

        const updates = {};
        if (status) updates.status = status;
        if (admin_notes !== undefined) updates.admin_notes = admin_notes;
        if (['resolved', 'dismissed'].includes(status)) {
            updates.resolved_by = req.adminId;
            updates.resolved_at = new Date();
        }

        const report = await Report.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!report) return res.status(404).json({ error: 'Report not found' });

        res.json({ success: true, report });
    } catch (err) {
        console.error('Error updating moderation report:', err);
        res.status(500).json({ error: err.message });
    }
});

router.patch('/users/:id/moderation', verifyAdmin, async (req, res) => {
    try {
        const allowed = ['active', 'flagged', 'suspended', 'banned'];
        const { moderation_status } = req.body;
        if (!allowed.includes(moderation_status)) {
            return res.status(400).json({ error: 'Invalid moderation status' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { moderation_status },
            { new: true }
        ).select('-password_hash');

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        console.error('Error updating user moderation status:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/moderation/overview', verifyAdmin, async (req, res) => {
    try {
        const [
            openReports,
            reportedProjects,
            reportedProfiles,
            reportedBids,
            reportedReviews,
            reportedDisputes,
            flaggedUsers,
            suspiciousReviews
        ] = await Promise.all([
            Report.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
            Report.countDocuments({ target_type: 'project', status: { $in: ['open', 'reviewing'] } }),
            Report.countDocuments({ target_type: 'profile', status: { $in: ['open', 'reviewing'] } }),
            Report.countDocuments({ target_type: 'bid', status: { $in: ['open', 'reviewing'] } }),
            Report.countDocuments({ target_type: 'review', status: { $in: ['open', 'reviewing'] } }),
            Report.countDocuments({ target_type: 'dispute', status: { $in: ['open', 'reviewing'] } }),
            User.countDocuments({ moderation_status: { $in: ['flagged', 'suspended', 'banned'] } }),
            Review.countDocuments({ rating: { $lte: 2 } })
        ]);

        res.json({
            openReports,
            reportedProjects,
            reportedProfiles,
            reportedBids,
            reportedReviews,
            reportedDisputes,
            flaggedUsers,
            suspiciousReviews
        });
    } catch (err) {
        console.error('Error fetching moderation overview:', err);
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
