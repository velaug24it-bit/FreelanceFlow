const cron = require('node-cron');
const SubscriptionChecker = require('./subscriptionChecker');
const User = require('../models/User');

const initScheduler = () => {
    console.log('⏳ Initializing background task scheduler...');

    // Run every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Running daily subscription check...');
        await SubscriptionChecker.checkExpiringSubscriptions();
    });

    // Run on the 1st day of every month at midnight (00:00)
    cron.schedule('0 0 1 * *', async () => {
        console.log('⏰ Running monthly connects reset...');
        try {
            const result = await User.updateMany(
                {}, 
                { $set: { connects_balance: 50 } }
            );
            console.log(`✅ Successfully reset connects for ${result.modifiedCount} users.`);
        } catch (error) {
            console.error('Error resetting monthly connects:', error);
        }
    });

    console.log('✅ Background task scheduler initialized.');
};

module.exports = { initScheduler };
