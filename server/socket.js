const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const ProjectPost = require('./models/ProjectPost');

let io;

function initializeSocket(server) {
    io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            credentials: true
        }
    });
    
    // Make io accessible globally
    global.io = io;
    
    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);
        
        // Join user's room for private notifications
        const userId = socket.handshake.query.userId;
        if (userId) {
            socket.join(userId);
            console.log(`📨 User ${userId} joined their notification room`);
        }
        
        socket.on('join_project_chat', async ({ projectId, token } = {}) => {
            try {
                if (!projectId || !token) return;

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const project = await ProjectPost.findById(projectId).select('client_id selected_freelancer_id status');
                if (!project || !project.selected_freelancer_id) return;

                const currentUserId = decoded.id?.toString();
                const isClient = project.client_id?.toString() === currentUserId;
                const isFreelancer = project.selected_freelancer_id?.toString() === currentUserId;

                if ((isClient || isFreelancer) && ['in_progress', 'review', 'completed'].includes(project.status)) {
                    socket.join(`project_chat_${projectId}`);
                    console.log(`ðŸ’¬ User ${currentUserId} joined project chat ${projectId}`);
                }
            } catch (err) {
                console.log('Project chat join failed:', err.message);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);
        });
    });
    
    return io;
}

function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}

module.exports = { initializeSocket, getIO };
