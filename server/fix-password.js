const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function fixPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        if (!email || !password) {
            throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                password_hash: passwordHash,
                role: 'admin',
                subscription_tier: 'business',
                subscription_plan: 'business',
                subscription_status: 'active'
            },
            { new: true }
        ).select('email role');

        if (!user) {
            throw new Error(`No MongoDB user found for ${email}`);
        }

        console.log('Admin password updated:', user);
    } catch (error) {
        console.error('Error:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

fixPassword();
