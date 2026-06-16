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

// Get all tasks for a user (grouped by status)
router.get('/', verifyToken, async (req, res) => {
    try {
        const tasks = await Task.find({ user_id: req.userId }).sort({ created_at: -1 });
        
        // Group tasks by status
        const groupedTasks = {
            todo: tasks.filter(t => t.status === 'todo'),
            in_progress: tasks.filter(t => t.status === 'in_progress'),
            review: tasks.filter(t => t.status === 'review'),
            done: tasks.filter(t => t.status === 'done')
        };
        
        res.json({ tasks, kanban: groupedTasks });
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create a new task
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, description, status, priority, due_date, project_id } = req.body;
        
        // Validate required fields
        if (!title) {
            return res.status(400).json({ error: 'Task title is required' });
        }
        
        const task = await Task.create({
            user_id: req.userId,
            title,
            description: description || '',
            status: status || 'todo',
            priority: priority || 'medium',
            due_date: due_date || null,
            project_id: project_id || null
        });
        
        res.status(201).json({ success: true, task });
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update task
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { title, description, status, priority, due_date } = req.body;
        
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            { title, description, status, priority, due_date, updated_at: Date.now() },
            { new: true }
        );
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ success: true, task });
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update task status (for drag and drop)
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }
        
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
        console.error('Error updating task status:', err);
        res.status(500).json({ error: err.message });
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
        console.error('Error deleting task:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;