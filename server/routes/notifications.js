const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const User = require('../models/User');

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

// Get all notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
    try {
        // Prevent intermediate caches or browsers from returning 304 Not Modified
        // for authenticated notification responses.
        res.set('Cache-Control', 'no-store');
        const notifications = await Notification.find({ user_id: req.userId })
            .sort({ created_at: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            user_id: req.userId,
            is_read: false
        });

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get unread count only (lightweight endpoint for polling)
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        // Ensure unread-count is always fresh
        res.set('Cache-Control', 'no-store');
        const unreadCount = await Notification.countDocuments({
            user_id: req.userId,
            is_read: false
        });
        res.json({ unreadCount });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark a single notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            { is_read: true },
            { returnDocument: 'after' }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true, notification });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.userId, is_read: false },
            { is_read: true }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Error marking all as read:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a single notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user_id: req.userId
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted' });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Clear all notifications
router.delete('/', verifyToken, async (req, res) => {
    try {
        await Notification.deleteMany({ user_id: req.userId });
        res.json({ success: true, message: 'All notifications cleared' });
    } catch (err) {
        console.error('Error clearing notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get notification preferences for the user
router.get('/preferences', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('notification_preferences');
        res.json({ notification_preferences: user.notification_preferences || {} });
    } catch (err) {
        console.error('Error fetching preferences:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update notification preferences for the user
router.put('/preferences', verifyToken, async (req, res) => {
    try {
        const updates = req.body.notification_preferences || req.body;
        const user = await User.findById(req.userId);
        user.notification_preferences = Object.assign({}, user.notification_preferences || {}, updates);
        await user.save();
        res.json({ success: true, notification_preferences: user.notification_preferences });
    } catch (err) {
        console.error('Error updating preferences:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Save web push subscription for the user
router.post('/subscribe', verifyToken, async (req, res) => {
    try {
        const subscription = req.body.subscription;
        if (!subscription) return res.status(400).json({ error: 'Subscription required' });
        const user = await User.findById(req.userId);
        user.push_subscription = subscription;
        await user.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving subscription:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove web push subscription
router.delete('/subscribe', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        user.push_subscription = null;
        await user.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Error removing subscription:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;