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

// Get all users with their data - FIXED to show correct plan
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
                    // IMPORTANT: Get the actual subscription_tier from the user document
                    plan: { $ifNull: ['$subscription_tier', 'free'] },
                    status: { $ifNull: ['$subscription_status', 'active'] },
                    client_count: { $size: '$clients' },
                    project_count: { $size: '$projects' },
                    invoice_count: { $size: '$invoices' },
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
                    subscription_revenue: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$payments',
                                        as: 'p',
                                        cond: { $eq: ['$$p.status', 'completed'] }
                                    }
                                },
                                as: 'p',
                                in: { $toDouble: '$$p.amount' }
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
        
        console.log('Users with plans:', users.map(u => ({ email: u.email, plan: u.plan, status: u.status })));
        res.json({ users });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get dashboard stats
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
        const totalRevenue = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const activeSubscriptions = await User.countDocuments({ 
            subscription_tier: { $in: ['pro', 'business'] },
            role: { $ne: 'admin' }
        });
        
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
            totalUsers,
            totalRevenue: totalRevenue[0]?.total || 0,
            activeSubscriptions,
            monthlyRevenue: monthlyRevenue.map(m => ({
                month: m._id,
                revenue: m.revenue,
                new_subscribers: m.new_subscribers
            }))
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.json({
            totalUsers: 0,
            totalRevenue: 0,
            activeSubscriptions: 0,
            monthlyRevenue: []
        });
    }
});

// Get revenue report
router.get('/revenue', verifyAdmin, async (req, res) => {
    try {
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
        
        const totalEarnings = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        res.json({
            totalEarnings: totalEarnings[0]?.total || 0,
            monthlyRevenue: monthlyRevenue.map(m => ({
                month: m._id,
                revenue: m.revenue,
                new_subscribers: m.new_subscribers
            }))
        });
    } catch (err) {
        console.error('Error fetching revenue:', err);
        res.json({ totalEarnings: 0, monthlyRevenue: [] });
    }
});

// Get single user details
router.get('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password_hash');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const [clients, projects, invoices, expenses, payments] = await Promise.all([
            Client.find({ user_id: user._id }),
            Project.find({ user_id: user._id }),
            Invoice.find({ user_id: user._id }),
            Expense.find({ user_id: user._id }),
            Payment.find({ user_id: user._id })
        ]);
        
        const totalRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const subscriptionPayments = payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        res.json({
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
                total_clients: clients.length,
                total_projects: projects.length,
                total_invoices: invoices.length,
                total_expenses: expenses.length,
                total_revenue: totalRevenue,
                total_expenses_amount: totalExpenses,
                net_income: totalRevenue - totalExpenses,
                subscription_revenue: subscriptionPayments,
                active_contracts: 0
            },
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
            payments: payments.map(p => ({
                id: p._id,
                amount: p.amount,
                status: p.status
            }))
        });
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update user subscription
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
                currency: 'usd',
                payment_method: 'admin',
                status: 'completed',
                description: `${plan} Plan - Admin update`,
                paid_at: new Date()
            });
        }
        
        res.json({ message: 'Subscription updated successfully' });
    } catch (err) {
        console.error('Error updating subscription:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: err.message });
    }
});

// Debug route - Check user plans
router.get('/debug-plans', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { email: 1, full_name: 1, subscription_tier: 1, subscription_status: 1 });
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;