const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Expense = require('../models/Expense');

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

// Get all expenses
router.get('/', verifyToken, async (req, res) => {
    try {
        const expenses = await Expense.find({ user_id: req.userId }).sort({ expense_date: -1 });
        res.json({ expenses });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create expense
router.post('/', verifyToken, async (req, res) => {
    try {
        const { category, amount, description, expense_date, client_id, client_name } = req.body;
        
        const expense = await Expense.create({
            user_id: req.userId,
            client_id: client_id || null,
            client_name: client_name || '',
            category,
            amount,
            description,
            expense_date
        });
        
        res.status(201).json({ success: true, expense });
    } catch (err) {
        console.error('Error creating expense:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete expense
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await Expense.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;