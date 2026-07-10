const cron = require('node-cron');
const SubscriptionChecker = require('./subscriptionChecker');

const initScheduler = () => {
    console.log('⏳ Initializing background task scheduler...');

    // Run every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Running daily subscription check...');
        await SubscriptionChecker.checkExpiringSubscriptions();
    });

    console.log('✅ Background task scheduler initialized.');
};

module.exports = { initScheduler };
