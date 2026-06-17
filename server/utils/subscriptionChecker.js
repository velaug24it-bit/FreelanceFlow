const User = require('../models/User');
const NotificationHelper = require('./notificationHelper');

class SubscriptionChecker {
    static async checkExpiringSubscriptions() {
        try {
            const now = new Date();
            const threeDaysFromNow = new Date(now);
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
            
            // Find users whose subscription ends in 3 days
            const expiringUsers = await User.find({
                subscription_status: 'active',
                subscription_end_date: {
                    $gte: now,
                    $lte: threeDaysFromNow
                },
                subscription_tier: { $ne: 'free' }
            });
            
            for (const user of expiringUsers) {
                await NotificationHelper.createNotification({
                    userId: user._id,
                    type: 'subscription_expiring',
                    title: '⚠️ Subscription Expiring Soon',
                    message: `Your ${user.subscription_tier} plan will expire on ${new Date(user.subscription_end_date).toLocaleDateString()}. Renew now to continue enjoying premium features.`,
                    referenceId: user._id,
                    referenceType: 'subscription',
                    actionUrl: '/subscription'
                });
            }
            
            // Find users whose subscription has expired
            const expiredUsers = await User.find({
                subscription_status: 'active',
                subscription_end_date: { $lt: now },
                subscription_tier: { $ne: 'free' }
            });
            
            for (const user of expiredUsers) {
                await NotificationHelper.createNotification({
                    userId: user._id,
                    type: 'subscription_expired',
                    title: '❌ Subscription Expired',
                    message: `Your ${user.subscription_tier} plan has expired. Your account has been downgraded to Free. Upgrade now to restore access.`,
                    referenceId: user._id,
                    referenceType: 'subscription',
                    actionUrl: '/subscription'
                });
                
                // Downgrade user
                await User.findByIdAndUpdate(user._id, {
                    subscription_tier: 'free',
                    subscription_status: 'inactive'
                });
            }
            
            console.log(`📧 Sent ${expiringUsers.length} expiry reminders, ${expiredUsers.length} expired notifications`);
        } catch (err) {
            console.error('Error checking subscriptions:', err);
        }
    }
}

module.exports = SubscriptionChecker;