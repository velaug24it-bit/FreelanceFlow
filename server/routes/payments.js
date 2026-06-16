const express = require('express');
const Payment = require('../models/Payment');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateJWT);

router.get('/', async (req, res) => {
    try {
        const documents = await Payment.find({ user_id: req.userId })
            .populate('invoice_id', 'invoice_number')
            .populate('client_id', 'contact_name')
            .sort({ created_at: -1 })
            .lean();

        const payments = documents.map((payment) => ({
            ...payment,
            invoice_number: payment.invoice_id?.invoice_number || null,
            client_name: payment.client_id?.contact_name || null,
            invoice_id: payment.invoice_id?._id || payment.invoice_id,
            client_id: payment.client_id?._id || payment.client_id
        }));

        res.json({ payments, total: payments.length });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const payments = await Payment.find({ user_id: req.userId }).lean();
        const completed = payments.filter((payment) => payment.status === 'completed');
        const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const monthlyMap = new Map();

        for (const payment of completed) {
            const date = payment.paid_at || payment.created_at;
            const month = date.toISOString().slice(0, 7);
            const current = monthlyMap.get(month) || { month, revenue: 0, count: 0 };
            current.revenue += payment.amount;
            current.count += 1;
            monthlyMap.set(month, current);
        }

        res.json({
            stats: {
                total_payments: payments.length,
                total_revenue: totalRevenue,
                average_payment: payments.length ? totalRevenue / payments.length : 0,
                completed_payments: completed.length,
                pending_payments: payments.filter((payment) => payment.status === 'pending').length
            },
            monthlyRevenue: [...monthlyMap.values()].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12)
        });
    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
