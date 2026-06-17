const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');

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

// Bulk delete projects
router.delete('/bulk-delete', verifyToken, async (req, res) => {
    try {
        const { projectIds } = req.body;
        if (!projectIds || !Array.isArray(projectIds)) {
            return res.status(400).json({ error: 'projectIds array is required' });
        }
        
        // Check if any projects have invoices
        for (const projectId of projectIds) {
            const invoiceCount = await Invoice.countDocuments({ project_id: projectId });
            if (invoiceCount > 0) {
                const project = await Project.findById(projectId);
                return res.status(400).json({ 
                    error: `Cannot bulk delete. Project "${project ? project.title : projectId}" has ${invoiceCount} invoice(s).`,
                    hasInvoices: true,
                    invoiceCount
                });
            }
        }
        
        await Project.deleteMany({ 
            _id: { $in: projectIds },
            user_id: req.userId
        });
        
        res.json({ success: true, message: `${projectIds.length} project(s) deleted successfully` });
    } catch (err) {
        console.error('Error bulk deleting projects:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete project
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        // Check for invoices associated with this project
        const invoiceCount = await Invoice.countDocuments({ project_id: req.params.id });
        if (invoiceCount > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete project with associated invoices',
                hasInvoices: true,
                invoiceCount 
            });
        }
        
        const project = await Project.findOneAndDelete({ 
            _id: req.params.id,
            user_id: req.userId 
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;