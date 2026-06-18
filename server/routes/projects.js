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

// Get all projects for the authenticated user
router.get('/', verifyToken, async (req, res) => {
    try {
        const projects = await Project.find({ user_id: req.userId })
            .populate('client_id', 'contact_name company_name email')
            .sort({ created_at: -1 });

        res.json({ projects });
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Get a single project by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            user_id: req.userId
        }).populate('client_id', 'contact_name company_name email');

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ project });
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// Create a new project
router.post('/', verifyToken, async (req, res) => {
    try {
        const { client_id, title, description, budget, due_date, project_type, status } = req.body;

        // Validate required fields
        if (!title) {
            return res.status(400).json({ error: 'Project title is required' });
        }

        // Validate client_id is a valid ObjectId
        let validClientId = null;
        if (client_id) {
            if (mongoose.Types.ObjectId.isValid(client_id)) {
                // Check if client exists and belongs to user
                const clientExists = await Client.findOne({
                    _id: client_id,
                    user_id: req.userId
                });
                if (clientExists) {
                    validClientId = client_id;
                } else {
                    return res.status(400).json({ error: 'Invalid client selected' });
                }
            } else {
                return res.status(400).json({ error: 'Invalid client ID format' });
            }
        }

        // Create the project
        const projectData = {
            user_id: req.userId,
            title: title.trim(),
            description: description ? description.trim() : '',
            budget: parseFloat(budget) || 0,
            due_date: due_date || null,
            project_type: project_type || 'web_development',
            status: status || 'active'
        };

        if (validClientId) {
            projectData.client_id = validClientId;
        }

        const project = await Project.create(projectData);

        // Populate client info for response
        const populatedProject = await Project.findById(project._id)
            .populate('client_id', 'contact_name company_name');

        res.status(201).json({
            success: true,
            project: populatedProject,
            message: 'Project created successfully'
        });
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({
            error: 'Failed to create project',
            details: err.message
        });
    }
});

// Update a project
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { title, description, budget, due_date, project_type, status, progress, current_phase } = req.body;

        // Find and update the project
        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            {
                title: title?.trim(),
                description: description?.trim(),
                budget: parseFloat(budget) || 0,
                due_date: due_date || null,
                project_type: project_type || 'web_development',
                status: status || 'active',
                progress: progress !== undefined ? progress : 0,
                current_phase: current_phase || 'planning'
            },
            { new: true, runValidators: true }
        ).populate('client_id', 'contact_name company_name');

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            project,
            message: 'Project updated successfully'
        });
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Update project status
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status, progress, current_phase } = req.body;

        const updateData = { status };
        if (progress !== undefined) updateData.progress = progress;
        if (current_phase) updateData.current_phase = current_phase;
        if (status === 'completed') updateData.completed_at = new Date();

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            updateData,
            { new: true }
        ).populate('client_id', 'contact_name company_name');

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            project,
            message: 'Project status updated successfully'
        });
    } catch (err) {
        console.error('Error updating project status:', err);
        res.status(500).json({ error: 'Failed to update project status' });
    }
});

// Delete a project
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        // Check for invoices associated with this project
        const invoiceCount = await Invoice.countDocuments({
            project_id: req.params.id,
            user_id: req.userId
        });

        if (invoiceCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete project with associated invoices',
                hasInvoices: true,
                invoiceCount,
                message: `This project has ${invoiceCount} invoice(s). Please delete them first.`
            });
        }

        const project = await Project.findOneAndDelete({
            _id: req.params.id,
            user_id: req.userId
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Bulk delete projects
router.delete('/bulk-delete', verifyToken, async (req, res) => {
    try {
        const { projectIds } = req.body;

        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({ error: 'projectIds array is required' });
        }

        // Check if any projects have invoices
        const projectsWithInvoices = [];
        for (const projectId of projectIds) {
            if (!mongoose.Types.ObjectId.isValid(projectId)) continue;

            const invoiceCount = await Invoice.countDocuments({
                project_id: projectId,
                user_id: req.userId
            });

            if (invoiceCount > 0) {
                const project = await Project.findById(projectId);
                projectsWithInvoices.push({
                    id: projectId,
                    title: project?.title || 'Unknown',
                    invoiceCount
                });
            }
        }

        if (projectsWithInvoices.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete projects with associated invoices',
                hasInvoices: true,
                projectsWithInvoices,
                message: `${projectsWithInvoices.length} project(s) have invoices. Please delete them first.`
            });
        }

        // Delete the projects
        const result = await Project.deleteMany({
            _id: { $in: projectIds },
            user_id: req.userId
        });

        res.json({
            success: true,
            message: `${result.deletedCount} project(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Error bulk deleting projects:', err);
        res.status(500).json({ error: 'Failed to delete projects' });
    }
});

module.exports = router;