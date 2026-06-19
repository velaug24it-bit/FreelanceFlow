const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const User = require('../models/User');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = verified.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all clients
router.get('/', verifyToken, async (req, res) => {
    try {
        const clients = await Client.find({ user_id: req.userId }).sort({ created_at: -1 });
        res.json({ clients });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single client
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const client = await Client.findOne({ _id: req.params.id, user_id: req.userId });
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json({ client });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create client
router.post('/', verifyToken, async (req, res) => {
    try {
        const { company_name, contact_name, email, phone, address, notes } = req.body;
        
        const client = await Client.create({
            user_id: req.userId,
            company_name,
            contact_name,
            email,
            phone,
            address,
            notes
        });
        
        res.status(201).json({ client });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update client
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { company_name, contact_name, email, phone, address, notes } = req.body;
        
        const client = await Client.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            { company_name, contact_name, email, phone, address, notes, updated_at: Date.now() },
            { returnDocument: 'after' }
        );
        
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json({ client });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete client
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await Client.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
        
        if (!result) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json({ message: 'Client deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;