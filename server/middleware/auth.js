const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists
        const user = await User.findById(decoded.id).select('-password_hash');
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Check if user is active
        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Account suspended' });
        }
        
        req.user = user;
        req.userId = decoded.id;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(500).json({ error: 'Authentication error' });
    }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Check if user is freelancer
const isFreelancer = (req, res, next) => {
    if (req.user && req.user.role === 'freelancer') {
        next();
    } else {
        res.status(403).json({ error: 'Freelancer access required' });
    }
};

// Check if user is client
const isClient = (req, res, next) => {
    if (req.user && req.user.role === 'client') {
        next();
    } else {
        res.status(403).json({ error: 'Client access required' });
    }
};

// Optional: Rate limiting by user
const rateLimit = (maxRequests = 100, windowMs = 60000) => {
    const requests = {};
    return (req, res, next) => {
        const userId = req.userId || req.ip;
        const now = Date.now();
        
        if (!requests[userId]) {
            requests[userId] = [];
        }
        
        // Clean old requests
        requests[userId] = requests[userId].filter(time => now - time < windowMs);
        
        if (requests[userId].length >= maxRequests) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
        
        requests[userId].push(now);
        next();
    };
};

module.exports = {
    verifyToken,
    isAdmin,
    isFreelancer,
    isClient,
    rateLimit
};