const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name, company_name } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        
        const user = await User.create({
            email,
            full_name,
            password_hash,
            company_name,
            role: 'user',
            subscription_tier: 'free',
            subscription_plan: 'free'
        });
        
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                company_name: user.company_name,
                subscription_tier: user.subscription_tier,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                company_name: user.company_name,
                subscription_tier: user.subscription_tier,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password_hash');
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        res.json({ user });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Admin login route
router.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Admin login attempt:', email);
        
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check if user is admin
        if (user.role !== 'admin') {
            console.log('User is not admin:', user.role);
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('Invalid password');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('✅ Admin login successful:', email);
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                subscription_tier: user.subscription_tier
            }
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
