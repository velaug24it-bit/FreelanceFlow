const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Client = require('../models/Client');

// Verify token middleware
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

// Get all projects
router.get('/', verifyToken, async (req, res) => {
    try {
        const projects = await Project.find({ user_id: req.userId })
            .populate('client_id', 'contact_name company_name')
            .sort({ created_at: -1 });
        res.json({ projects });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create project
router.post('/', verifyToken, async (req, res) => {
    try {
        const { client_id, title, description, budget, due_date, project_type } = req.body;
        
        // Validate client_id is a valid ObjectId
        let validClientId = null;
        if (client_id && mongoose.Types.ObjectId.isValid(client_id)) {
            validClientId = client_id;
        } else {
            // If client_id is not valid, try to find client by name
            const client = await Client.findOne({ 
                user_id: req.userId,
                contact_name: client_id 
            });
            if (client) {
                validClientId = client._id;
            }
        }
        
        const project = await Project.create({
            user_id: req.userId,
            client_id: validClientId,
            title,
            description,
            budget,
            due_date,
            project_type,
            status: 'active'
        });
        
        res.status(201).json({ project });
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;