const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/mongodb');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const projectRoutes = require('./routes/projects');
const invoiceRoutes = require('./routes/invoices');
const expenseRoutes = require('./routes/expenses');
const taskRoutes = require('./routes/tasks');
const milestoneRoutes = require('./routes/milestones');
const templateRoutes = require('./routes/templates');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const subscriptionRoutes = require('./routes/subscriptions');
const marketplaceRoutes = require('./routes/marketplace');
const connectsRoutes = require('./routes/connects');
const razorpayRoutes = require('./routes/razorpay');
const notificationRoutes = require('./routes/notifications');
const checkoutRoutes = require('./routes/checkout');
const paymentRoutes = require('./routes/payments');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');
const { initializeSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// Passport (OAuth)
const passport = require('passport');
try {
    require('./config/passport')();
    app.use(passport.initialize());
} catch (err) {
    console.log('Passport setup skipped:', err.message || err);
}

// Connect to MongoDB
connectDB();

// Initialize Background Task Scheduler
const { initScheduler } = require('./utils/scheduler');
initScheduler();

// ============ CORS CONFIGURATION ============
const allowedOrigins = [
    'http://localhost:3000',
    'https://freelanceflow-frontend.onrender.com',  // Add your frontend URL
    'https://freelanceflow-frontend-uh18.onrender.com'
];

// CORS middleware - this handles preflight automatically
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('⚠️ Blocked CORS from:', origin);
            // Allow all origins for testing
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization']
}));

// REMOVED: app.options('*', cors()); - This was causing the error

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ ROOT ROUTES ============
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to FreelanceFlow API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            api: '/api',
            test: '/api/test',
            health: '/api/health',
            auth: '/api/auth',
            clients: '/api/clients',
            projects: '/api/projects',
            invoices: '/api/invoices'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api', (req, res) => {
    res.json({
        message: 'FreelanceFlow API is running!',
        version: '1.0.0',
        status: 'online',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            clients: '/api/clients',
            projects: '/api/projects',
            invoices: '/api/invoices',
            expenses: '/api/expenses',
            tasks: '/api/tasks',
            reports: '/api/reports',
            admin: '/api/admin',
            subscriptions: '/api/subscriptions',
            marketplace: '/api/marketplace',
            connects: '/api/connects',
            razorpay: '/api/razorpay',
            notifications: '/api/notifications',
            test: '/api/test',
            health: '/api/health'
        }
    });
});

// Test routes
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working!',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// ============ STATIC FILES ============
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/connects', connectsRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', checkoutRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);

// ============ 404 HANDLER ============
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        message: 'The requested endpoint does not exist'
    });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
initializeSocket(server);

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/test`);
    console.log(`🏠 Root: http://localhost:${PORT}/`);
    console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
});
