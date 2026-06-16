const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Invoice = require('../models/Invoice');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all invoices
router.get('/', verifyToken, async (req, res) => {
    try {
        const invoices = await Invoice.find({ user_id: req.userId }).sort({ created_at: -1 });
        res.json({ invoices });
    } catch (err) {
        console.error('Get invoices error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create invoice
router.post('/', verifyToken, async (req, res) => {
    try {
        console.log('=== INVOICE CREATE REQUEST ===');
        console.log('Request body:', req.body);
        
        const { client_name, client_email, due_date, tax_rate, notes, items, subtotal, total_amount } = req.body;
        
        // Validation
        if (!client_name) {
            return res.status(400).json({ error: 'Client name is required' });
        }
        
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }
        
        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Calculate tax amount
        const taxAmount = (subtotal || 0) * ((tax_rate || 0) / 100);
        const finalTotal = total_amount || (subtotal || 0) + taxAmount;
        
        // Process items
        const processedItems = items.map(item => ({
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            total_price: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0)
        }));
        
        // Create invoice
        const invoice = await Invoice.create({
            user_id: req.userId,
            client_name: client_name,
            client_email: client_email || '',
            invoice_number: invoiceNumber,
            subtotal: Number(subtotal) || 0,
            tax_rate: Number(tax_rate) || 0,
            tax_amount: taxAmount,
            total_amount: finalTotal,
            due_date: due_date || null,
            notes: notes || '',
            items: processedItems,
            status: 'pending'
        });
        
        console.log(`✅ Invoice created: ${invoiceNumber} for ${client_name}`);
        console.log(`   Total: $${finalTotal}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Invoice created successfully',
            invoice: invoice 
        });
        
    } catch (err) {
        console.error('Create invoice error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update invoice status
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const updateData = { status };
        
        if (status === 'paid') {
            updateData.paid_at = new Date();
        }
        
        const invoice = await Invoice.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            updateData,
            { new: true }
        );
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.json({ success: true, invoice });
    } catch (err) {
        console.error('Update invoice error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete invoice
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await Invoice.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
        
        if (!result) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.json({ success: true, message: 'Invoice deleted' });
    } catch (err) {
        console.error('Delete invoice error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;