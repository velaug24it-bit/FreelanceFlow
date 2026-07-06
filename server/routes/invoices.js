const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const { checkResourceLimit } = require('../middleware/planLimits');
const NotificationHelper = require('../utils/notificationHelper');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = verified.id;
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all invoices
router.get('/', verifyToken, async (req, res) => {
    try {
        const invoices = await Invoice.find({ user_id: req.userId })
            .populate('client_id', 'contact_name company_name email')
            .sort({ created_at: -1 });
        res.json({ invoices });
    } catch (err) {
        console.error('Error fetching invoices:', err);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// Get single invoice
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user_id: req.userId
        }).populate('client_id', 'contact_name company_name email');

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json({ invoice });
    } catch (err) {
        console.error('Error fetching invoice:', err);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Create invoice
router.post('/', verifyToken, checkResourceLimit('invoices'), async (req, res) => {
    try {
        const { client_id, due_date, tax_rate, notes, items, subtotal, total_amount } = req.body;

        console.log('📝 Creating invoice with data:', req.body);

        // Validate required fields
        if (!client_id) {
            return res.status(400).json({ error: 'Client ID is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(client_id)) {
            return res.status(400).json({ error: 'Invalid client ID format' });
        }

        // Verify client exists and belongs to user
        const client = await Client.findOne({
            _id: client_id,
            user_id: req.userId
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one invoice item is required' });
        }

        // Validate each item
        for (const item of items) {
            if (!item.description || !item.description.trim()) {
                return res.status(400).json({ error: 'Item description is required' });
            }
            if (!item.quantity || item.quantity <= 0) {
                return res.status(400).json({ error: 'Item quantity must be greater than 0' });
            }
            if (item.unit_price === undefined || item.unit_price < 0) {
                return res.status(400).json({ error: 'Item unit price must be a positive number' });
            }
        }

        // Generate invoice number
        const invoice_number = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // Calculate tax amount
        const taxAmount = subtotal * (tax_rate / 100);

        // Create invoice
        const invoice = await Invoice.create({
            user_id: req.userId,
            client_id: client_id,
            invoice_number,
            status: 'pending',
            subtotal: subtotal || 0,
            tax_rate: tax_rate || 0,
            tax_amount: taxAmount || 0,
            total_amount: total_amount || subtotal + taxAmount,
            currency: 'USD',
            due_date: due_date || null,
            notes: notes || '',
            items: items.map(item => ({
                description: item.description.trim(),
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.quantity * item.unit_price
            }))
        });

        console.log('✅ Invoice created successfully:', invoice_number);

        // Create notification
        if (client) {
            await NotificationHelper.createNotification({
                userId: client.user_id,
                type: 'invoice_created',
                title: '📄 New Invoice Created',
                message: `You have a new invoice #${invoice_number} for $${total_amount}`,
                referenceId: invoice._id,
                referenceType: 'invoice',
                actionUrl: `/invoices/${invoice._id}`
            }).catch(err => console.error('Notification error:', err));
        }

        res.status(201).json({
            success: true,
            invoice,
            message: 'Invoice created successfully'
        });
    } catch (err) {
        console.error('❌ Error creating invoice:', err);
        res.status(500).json({
            error: 'Failed to create invoice',
            details: err.message
        });
    }
});

// Update invoice status (mark as paid)
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const invoiceId = req.params.id;

        const invoice = await Invoice.findOne({
            _id: invoiceId,
            user_id: req.userId
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const updateData = { status };
        if (status === 'paid') {
            updateData.paid_at = new Date();
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(
            invoiceId,
            updateData,
            { returnDocument: 'after' }
        );

        // Create notification for payment
        if (status === 'paid') {
            await NotificationHelper.createNotification({
                userId: req.userId,
                type: 'invoice_paid',
                title: '💰 Invoice Paid',
                message: `Invoice #${invoice.invoice_number} for $${invoice.total_amount} has been paid!`,
                referenceId: invoice._id,
                referenceType: 'invoice',
                actionUrl: `/invoices/${invoice._id}`
            }).catch(err => console.error('Notification error:', err));

            // Also notify the client
            if (invoice.client_id) {
                const client = await Client.findById(invoice.client_id);
                if (client) {
                    await NotificationHelper.createNotification({
                        userId: client.user_id,
                        type: 'payment_received',
                        title: '💳 Payment Received',
                        message: `Payment of $${invoice.total_amount} has been received for invoice #${invoice.invoice_number}`,
                        referenceId: invoice._id,
                        referenceType: 'invoice',
                        actionUrl: `/invoices/${invoice._id}`
                    }).catch(err => console.error('Notification error:', err));
                }
            }
        }

        res.json({
            success: true,
            invoice: updatedInvoice,
            message: 'Invoice status updated'
        });
    } catch (err) {
        console.error('Error updating invoice:', err);
        res.status(500).json({ error: 'Failed to update invoice' });
    }
});

// Delete invoice
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const invoice = await Invoice.findOneAndDelete({
            _id: req.params.id,
            user_id: req.userId
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({
            success: true,
            message: 'Invoice deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting invoice:', err);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
});

module.exports = router;