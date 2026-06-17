const socketIO = require('socket.io');

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