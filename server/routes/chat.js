const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ProjectPost = require('../models/ProjectPost');
const ChatMessage = require('../models/ChatMessage');
const NotificationHelper = require('../utils/notificationHelper');

const getProjectChatAccess = async (projectId, userId) => {
    const project = await ProjectPost.findById(projectId);
    if (!project) {
        return { error: 'Project not found', status: 404 };
    }

    const isClient = project.client_id?.toString() === userId.toString();
    const isFreelancer = project.selected_freelancer_id?.toString() === userId.toString();

    if (!isClient && !isFreelancer) {
        return { error: 'You do not have access to this project chat', status: 403 };
    }

    if (!project.selected_freelancer_id || !['in_progress', 'review', 'completed'].includes(project.status)) {
        return { error: 'Chat is available after a bid is accepted', status: 400 };
    }

    return {
        project,
        senderRole: isClient ? 'client' : 'freelancer'
    };
};

router.get('/projects/:projectId/messages', verifyToken, async (req, res) => {
    try {
        const access = await getProjectChatAccess(req.params.projectId, req.userId);
        if (access.error) {
            return res.status(access.status).json({ error: access.error });
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
        const messages = await ChatMessage.find({ project_id: req.params.projectId })
            .sort({ created_at: -1 })
            .limit(limit)
            .lean();

        res.json({ messages: messages.reverse() });
    } catch (err) {
        console.error('Error fetching chat messages:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/projects/:projectId/messages', verifyToken, async (req, res) => {
    try {
        const { message } = req.body;
        const cleanMessage = typeof message === 'string' ? message.trim() : '';

        if (!cleanMessage) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const access = await getProjectChatAccess(req.params.projectId, req.userId);
        if (access.error) {
            return res.status(access.status).json({ error: access.error });
        }

        const chatMessage = await ChatMessage.create({
            project_id: req.params.projectId,
            sender_id: req.userId,
            sender_name: req.user.full_name,
            sender_role: access.senderRole,
            message: cleanMessage,
            read_by: [req.userId]
        });

        if (global.io) {
            global.io
                .to(`project_chat_${req.params.projectId}`)
                .emit('project_chat_message', chatMessage);
        }

        // Create notification for the other participant
        const recipientId = access.senderRole === 'client'
            ? access.project.selected_freelancer_id
            : access.project.client_id;

        if (recipientId) {
            await NotificationHelper.createNotification({
                userId: recipientId,
                type: 'message',
                title: `New chat message on ${access.project.title}`,
                message: `${req.user.full_name}: ${cleanMessage}`,
                referenceId: access.project._id,
                referenceType: 'project',
                actionUrl: `/projects/${access.project._id}`
            });
        }

        res.status(201).json({ success: true, message: chatMessage });
    } catch (err) {
        console.error('Error sending chat message:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
