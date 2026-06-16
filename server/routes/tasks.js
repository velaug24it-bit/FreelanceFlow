const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');

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

// Get all tasks for a user
router.get('/', verifyToken, async (req, res) => {
    try {
        const tasks = await Task.find({ user_id: req.userId }).sort({ created_at: -1 });
        res.json({ tasks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get task by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, user_id: req.userId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create task
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, description, status, priority, due_date, project_id } = req.body;
        
        const task = await Task.create({
            user_id: req.userId,
            title,
            description,
            status: status || 'todo',
            priority: priority || 'medium',
            due_date,
            project_id
        });
        
        res.status(201).json({ success: true, task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update task
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { title, description, status, priority, due_date, project_id } = req.body;
        
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            { title, description, status, priority, due_date, project_id, updated_at: Date.now() },
            { new: true }
        );
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ success: true, task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update task status (for Kanban drag-and-drop)
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            { status, updated_at: Date.now() },
            { new: true }
        );
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ success: true, task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete task
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ success: true, message: 'Task deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;