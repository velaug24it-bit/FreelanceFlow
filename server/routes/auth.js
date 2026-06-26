const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const sendEmail = require('../utils/email');

// Helper to check token for protected routes
const authenticateToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

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
        
        const verification_token = crypto.randomBytes(32).toString('hex');
        const verification_token_expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        const user = await User.create({
            email,
            full_name,
            password_hash,
            company_name,
            role: 'user',
            subscription_tier: 'free',
            subscription_plan: 'free',
            is_email_verified: false,
            verification_token,
            verification_token_expires
        });
        
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Send email
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const verifyUrl = `${clientUrl}/verify-email/${verification_token}`;
        
        const { previewUrl } = await sendEmail({
            to: user.email,
            subject: 'Verify Your Email - FreelanceFlow',
            text: `Welcome to FreelanceFlow, ${user.full_name}!\n\nPlease verify your email by clicking the following link:\n\n${verifyUrl}\n\nThis link is valid for 24 hours.`,
            html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                     <h2>Welcome to FreelanceFlow, ${user.full_name}!</h2>
                     <p>Please verify your email by clicking the button below:</p>
                     <p><a href="${verifyUrl}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a></p>
                     <p>Or copy and paste this URL into your browser:</p>
                     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
                   </div>`
        });
        
        res.status(201).json({
            success: true,
            token,
            emailPreviewUrl: previewUrl || null,
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                company_name: user.company_name,
                subscription_tier: user.subscription_tier,
                role: user.role,
                is_email_verified: user.is_email_verified
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

        // Check if 2FA is enabled
        if (user.is_2fa_enabled) {
            const tempToken = jwt.sign(
                { id: user._id, email: user.email, require2FA: true },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({
                success: true,
                require2FA: true,
                tempToken,
                email: user.email
            });
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
                role: user.role,
                is_email_verified: user.is_email_verified,
                bio: user.bio,
                skills: user.skills,
                hourly_rate: user.hourly_rate,
                avatar_url: user.avatar_url
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

// Social Login endpoint
router.post('/social-login', async (req, res) => {
    try {
        const { email, full_name, provider, provider_id, avatar_url } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required for social login' });
        }

        let user = await User.findOne({ email });

        if (!user) {
            // Register new social user
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(randomPassword, salt);

            user = await User.create({
                email,
                full_name: full_name || 'Social User',
                password_hash,
                is_email_verified: true, // Social logins authenticate emails
                role: 'user',
                subscription_tier: 'free',
                avatar_url: avatar_url || '',
                bio: '',
                skills: []
            });
        }

        if (user.is_2fa_enabled) {
            const tempToken = jwt.sign(
                { id: user._id, email: user.email, require2FA: true },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({
                success: true,
                require2FA: true,
                tempToken,
                email: user.email
            });
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
                role: user.role,
                is_email_verified: user.is_email_verified,
                bio: user.bio,
                skills: user.skills,
                hourly_rate: user.hourly_rate,
                avatar_url: user.avatar_url
            }
        });
    } catch (err) {
        console.error('Social login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Email Verification
router.post('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            verification_token: token,
            verification_token_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        user.is_email_verified = true;
        user.verification_token = undefined;
        user.verification_token_expires = undefined;
        await user.save();

        res.json({ success: true, message: 'Email verified successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resend Email Verification
router.post('/resend-verification', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (user.is_email_verified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.verification_token = token;
        user.verification_token_expires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const verifyUrl = `${clientUrl}/verify-email/${token}`;

        const { previewUrl } = await sendEmail({
            to: user.email,
            subject: 'Verify Your Email - FreelanceFlow',
            text: `Please verify your email by clicking this link: ${verifyUrl}`,
            html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                     <h3>Verify Your Email - FreelanceFlow</h3>
                     <p>Please verify your email by clicking the button below:</p>
                     <p><a href="${verifyUrl}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a></p>
                     <p>Or copy and paste this URL into your browser:</p>
                     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
                   </div>`
        });

        res.json({
            success: true,
            message: previewUrl
                ? 'Verification email sent! (Dev mode: click the preview link below)'
                : 'Verification email sent! Please check your inbox.',
            previewUrl: previewUrl || null,
            verifyUrl   // Direct verification link (always returned for convenience)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Keep it silent for security
            return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.reset_password_token = token;
        user.reset_password_expires = Date.now() + 3600000; // 1 hour
        await user.save();

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const resetUrl = `${clientUrl}/reset-password/${token}`;

        const { previewUrl } = await sendEmail({
            to: user.email,
            subject: 'Password Reset Request - FreelanceFlow',
            text: `Reset your password by clicking this link: ${resetUrl}`,
            html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                     <h3>Password Reset Request</h3>
                     <p>You requested a password reset. Please click the button below to update your password:</p>
                     <p><a href="${resetUrl}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a></p>
                     <p>This link is valid for 1 hour.</p>
                     <p>If you did not request this, please ignore this email.</p>
                   </div>`
        });

        res.json({
            success: true,
            message: previewUrl
                ? 'Password reset email sent! (Dev mode: click the preview link below)'
                : 'If that email exists, a reset link was sent.',
            previewUrl: previewUrl || null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            reset_password_token: token,
            reset_password_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(password, salt);
        user.reset_password_token = undefined;
        user.reset_password_expires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password has been reset successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Profile Detail (Bio, Skills, Hourly Rate, Name)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, bio, skills, hourly_rate, company_name } = req.body;
        const user = req.user;

        if (full_name) user.full_name = full_name;
        if (bio !== undefined) user.bio = bio;
        if (skills !== undefined) user.skills = skills;
        if (hourly_rate !== undefined) user.hourly_rate = hourly_rate;
        if (company_name) user.company_name = company_name;

        await user.save();

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                full_name: user.full_name,
                company_name: user.company_name,
                subscription_tier: user.subscription_tier,
                role: user.role,
                is_email_verified: user.is_email_verified,
                bio: user.bio,
                skills: user.skills,
                hourly_rate: user.hourly_rate,
                avatar_url: user.avatar_url
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate 2FA Secret
router.post('/generate-2fa', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const secret = authenticator.generateSecret();
        user.two_factor_temp_secret = secret;
        await user.save();

        const otpauth = authenticator.keyuri(user.email, 'FreelanceFlow', secret);
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        res.json({ success: true, qrCode: qrCodeUrl, secret });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify and enable 2FA
router.post('/verify-2fa-setup', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        const user = req.user;

        if (!user.two_factor_temp_secret) {
            return res.status(400).json({ error: '2FA setup was not initialized' });
        }

        const isValid = authenticator.verify({
            token: code,
            secret: user.two_factor_temp_secret
        });

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
        }

        user.two_factor_secret = user.two_factor_temp_secret;
        user.two_factor_temp_secret = undefined;
        user.is_2fa_enabled = true;
        await user.save();

        res.json({ success: true, message: 'Two-Factor Authentication is now enabled!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Disable 2FA
router.post('/disable-2fa', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        user.is_2fa_enabled = false;
        user.two_factor_secret = undefined;
        user.two_factor_temp_secret = undefined;
        await user.save();

        res.json({ success: true, message: 'Two-Factor Authentication disabled successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify 2FA code during login
router.post('/verify-2fa', async (req, res) => {
    try {
        const { tempToken, code } = req.body;
        if (!tempToken) {
            return res.status(400).json({ error: 'Temporary token is required' });
        }

        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (!decoded.require2FA) {
            return res.status(400).json({ error: 'Invalid temp token purpose' });
        }

        const user = await User.findById(decoded.id);
        if (!user || !user.is_2fa_enabled) {
            return res.status(400).json({ error: '2FA is not enabled or user not found' });
        }

        const isValid = authenticator.verify({
            token: code,
            secret: user.two_factor_secret
        });

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid TOTP code' });
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
                role: user.role,
                is_email_verified: user.is_email_verified,
                bio: user.bio,
                skills: user.skills,
                hourly_rate: user.hourly_rate,
                avatar_url: user.avatar_url
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
});

// Dev verify account instantly
router.post('/dev-verify', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        user.is_email_verified = true;
        user.verification_token = undefined;
        user.verification_token_expires = undefined;
        await user.save();
        res.json({ success: true, message: 'Account verified via Dev Mode!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// Google Identity Services - Verify ID Token (popup flow)
// ============================================================
router.post('/google/verify-token', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'No credential provided' });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({ error: 'Google Client ID not configured on server' });
        }

        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: clientId
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        if (!email) {
            return res.status(400).json({ error: 'No email from Google account' });
        }

        // Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(randomPassword, salt);
            user = await User.create({
                email,
                full_name: name || 'Google User',
                password_hash,
                is_email_verified: true,
                avatar_url: picture || null,
                provider: 'google',
                provider_id: googleId
            });
        } else {
            // Update avatar if not set
            if (!user.avatar_url && picture) {
                user.avatar_url = picture;
                await user.save();
            }
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
                role: user.role,
                is_email_verified: user.is_email_verified,
                avatar_url: user.avatar_url
            }
        });
    } catch (err) {
        console.error('Google token verification error:', err);
        res.status(401).json({ error: 'Invalid Google credential' });
    }
});

module.exports = router;

// OAuth redirect routes
router.get('/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/login?error=Google OAuth keys are not configured on the server. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the server .env file.`);
    }
    passport.authenticate('google', { scope: ['profile', 'email'], session: false, prompt: 'select_account' })(req, res, next);
});

router.get('/github', (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/login?error=GitHub OAuth keys are not configured on the server. Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to the server .env file.`);
    }
    passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/login?error=Google OAuth keys are not configured on the server.`);
    }
    passport.authenticate('google', { session: false, failureRedirect: (process.env.CLIENT_URL || 'http://localhost:3000') + '/login' }, async (err, user) => {
        if (err || !user) {
            console.error('Google callback error/auth failed:', err);
            return res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/login?error=Google authentication failed.');
        }
        try {
            const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            return res.redirect(`${clientUrl}/oauth-redirect?token=${token}`);
        } catch (err) {
            console.error('Google token generation error:', err);
            return res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/login?error=Server error during token generation.');
        }
    })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        return res.redirect(`${clientUrl}/login?error=GitHub OAuth keys are not configured on the server.`);
    }
    passport.authenticate('github', { session: false, failureRedirect: (process.env.CLIENT_URL || 'http://localhost:3000') + '/login' }, async (err, user) => {
        if (err || !user) {
            console.error('GitHub callback error/auth failed:', err);
            return res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/login?error=GitHub authentication failed.');
        }
        try {
            const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            return res.redirect(`${clientUrl}/oauth-redirect?token=${token}`);
        } catch (err) {
            console.error('GitHub token generation error:', err);
            return res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/login?error=Server error during token generation.');
        }
    })(req, res, next);
});
