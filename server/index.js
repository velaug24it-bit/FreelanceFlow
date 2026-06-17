const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/mongodb');
const { initializeSocket } = require('./socket');
const SubscriptionChecker = require('./utils/subscriptionChecker');

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const projectRoutes = require('./routes/projects');
const invoiceRoutes = require('./routes/invoices');
const expenseRoutes = require('./routes/expenses');
const taskRoutes = require('./routes/tasks');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const subscriptionRoutes = require('./routes/subscriptions');
const marketplaceRoutes = require('./routes/marketplace');
const connectsRoutes = require('./routes/connects');
const razorpayRoutes = require('./routes/razorpay');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize Socket.IO
initializeSocket(server);

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/connects', connectsRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/notifications', notificationRoutes);

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date() });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Run subscription checker every 12 hours
setInterval(() => {
    SubscriptionChecker.checkExpiringSubscriptions();
}, 12 * 60 * 60 * 1000); // 12 hours

// Run once on startup
setTimeout(() => {
    SubscriptionChecker.checkExpiringSubscriptions();
}, 5000); // 5 seconds after startup

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/test`);
    console.log(`📨 Notifications endpoint: /api/notifications`);
});