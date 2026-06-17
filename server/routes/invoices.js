const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const NotificationHelper = require('../utils/notificationHelper');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = verified.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all invoices
router.get('/', verifyToken, async (req, res) => {
    try {
        const invoices = await Invoice.find({ user_id: req.userId })
            .populate('client_id', 'contact_name company_name')
            .sort({ created_at: -1 });
        res.json({ invoices });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single invoice
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, user_id: req.userId });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json({ invoice });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create invoice - WITH NOTIFICATION
router.post('/', verifyToken, async (req, res) => {
    try {
        const { client_id, due_date, tax_rate, notes, items, subtotal, total_amount } = req.body;
        
        if (!client_id) {
            return res.status(400).json({ error: 'Client ID is required' });
        }
        
        const invoice_number = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const tax_amount = subtotal * (tax_rate / 100);
        
        const invoice = await Invoice.create({
            user_id: req.userId,
            client_id,
            invoice_number,
            subtotal,
            tax_rate,
            tax_amount,
            total_amount,
            due_date,
            notes,
            items,
            status: 'pending'
        });
        
        // ========== NOTIFICATION: Invoice Created for Client ==========
        const client = await Client.findById(client_id);
        if (client) {
            await NotificationHelper.createNotification({
                userId: client.user_id,
                type: 'invoice_created',
                title: '📄 New Invoice Created',
                message: `You have a new invoice #${invoice_number} for $${total_amount}`,
                referenceId: invoice._id,
                referenceType: 'invoice',
                actionUrl: `/invoices/${invoice._id}`
            });
        }
        
        console.log('Invoice created successfully:', invoice_number);
        res.status(201).json({ success: true, invoice });
    } catch (err) {
        console.error('Error creating invoice:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update invoice status (mark as paid) - WITH NOTIFICATION
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const invoiceId = req.params.id;
        
        const invoice = await Invoice.findOne({ _id: invoiceId, user_id: req.userId });
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
            { new: true }
        );
        
        // ========== NOTIFICATION: Invoice Paid ==========
        if (status === 'paid') {
            await NotificationHelper.createNotification({
                userId: req.userId,
                type: 'invoice_paid',
                title: '💰 Invoice Paid',
                message: `Invoice #${invoice.invoice_number} for $${invoice.total_amount} has been paid!`,
                referenceId: invoice._id,
                referenceType: 'invoice',
                actionUrl: `/invoices/${invoice._id}`
            });
            
            // Also notify the client (if they have a user account)
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
                    });
                }
            }
        }
        
        res.json({ success: true, invoice: updatedInvoice });
    } catch (err) {
        console.error('Error updating invoice:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete invoice
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await Invoice.findByIdAndDelete({ _id: req.params.id, user_id: req.userId });
        res.json({ success: true, message: 'Invoice deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;