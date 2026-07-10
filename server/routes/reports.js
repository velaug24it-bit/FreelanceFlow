const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Task = require('../models/Task');
const ProjectPost = require('../models/ProjectPost');

const { requireProPlan } = require('../middleware/planLimits');

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

// Get business summary stats
router.get('/business-summary', verifyToken, requireProPlan('Reports'), async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get all data for this user
        const [clients, projects, invoices, expenses, marketplaceProjects] = await Promise.all([
            Client.find({ user_id: userId }),
            Project.find({ user_id: userId }),
            Invoice.find({ user_id: userId }),
            Expense.find({ user_id: userId }),
            ProjectPost.find({ selected_freelancer_id: userId, payment_status: 'paid' })
        ]);
        
        // Calculate totals
        const invoiceRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
            
        const marketplaceRevenue = marketplaceProjects.reduce((sum, mp) => sum + (mp.bid_amount || 0), 0);
        
        const totalRevenue = invoiceRevenue + marketplaceRevenue;
        
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
        const activeProjects = projects.filter(p => p.status !== 'completed');
        const completedProjects = projects.filter(p => p.status === 'completed');
        
        // Monthly revenue for chart
        const monthlyRevenue = {};
        
        invoices.filter(inv => inv.status === 'paid').forEach(inv => {
            if (inv.paid_at) {
                const month = new Date(inv.paid_at).toISOString().slice(0, 7);
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + inv.total_amount;
            }
        });
        
        marketplaceProjects.forEach(mp => {
            const paidDate = mp.payment_date || mp.completed_at || mp.updated_at;
            if (paidDate) {
                const month = new Date(paidDate).toISOString().slice(0, 7);
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (mp.bid_amount || 0);
            }
        });
        
        // Sort months and get last 6
        const sortedMonths = Object.keys(monthlyRevenue).sort().slice(-6);
        const monthlyChartData = sortedMonths.map(month => ({
            month: month,
            revenue: monthlyRevenue[month]
        }));
        
        res.json({
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            profit: totalRevenue - totalExpenses,
            active_projects: activeProjects.length,
            completed_projects: completedProjects.length,
            total_clients: clients.length,
            pending_invoices_count: pendingInvoices.length,
            pending_invoices_amount: pendingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
            monthly_revenue: monthlyChartData
        });
    } catch (err) {
        console.error('Error fetching business summary:', err);
        res.status(500).json({ error: err.message });
    }
});

// Export data as CSV
router.get('/export/:type', verifyToken, requireProPlan('Reports'), async (req, res) => {
    try {
        const { type } = req.params;
        const userId = req.userId;
        let data = [];
        
        switch(type) {
            case 'clients':
                data = await Client.find({ user_id: userId });
                break;
            case 'projects':
                data = await Project.find({ user_id: userId });
                break;
            case 'invoices':
                data = await Invoice.find({ user_id: userId });
                break;
            case 'expenses':
                data = await Expense.find({ user_id: userId });
                break;
            default:
                return res.status(400).json({ error: 'Invalid export type' });
        }
        
        res.json({ data, type });
    } catch (err) {
        console.error('Error exporting data:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get revenue breakdown by client
router.get('/client-revenue', verifyToken, requireProPlan('Reports'), async (req, res) => {
    try {
        const userId = req.userId;
        const clients = await Client.find({ user_id: userId });
        
        const clientRevenue = await Promise.all(clients.map(async (client) => {
            const invoices = await Invoice.find({ 
                user_id: userId, 
                client_id: client._id,
                status: 'paid' 
            });
            
            const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
            
            return {
                client_name: client.contact_name,
                company_name: client.company_name,
                total_revenue: totalRevenue,
                invoice_count: invoices.length
            };
        }));
        
        // Sort by revenue descending
        clientRevenue.sort((a, b) => b.total_revenue - a.total_revenue);
        
        res.json({ clientRevenue });
    } catch (err) {
        console.error('Error fetching client revenue:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get expense breakdown by category
router.get('/expense-categories', verifyToken, requireProPlan('Reports'), async (req, res) => {
    try {
        const userId = req.userId;
        const expenses = await Expense.find({ user_id: userId });
        
        const categoryBreakdown = {};
        expenses.forEach(exp => {
            categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
        });
        
        const categories = Object.keys(categoryBreakdown).map(category => ({
            category: category,
            total: categoryBreakdown[category],
            count: expenses.filter(e => e.category === category).length
        }));
        
        res.json({ categories });
    } catch (err) {
        console.error('Error fetching expense categories:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;