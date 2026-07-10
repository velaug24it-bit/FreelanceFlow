const User = require('../models/User');
const NotificationHelper = require('./notificationHelper');

class SubscriptionChecker {
    static async checkExpiringSubscriptions() {
        try {
            const now = new Date();
            
            // Find all users who have non-FREE subscription tiers
            const users = await User.find({
                $or: [
                    { subscriptionPlan: { $in: ['PRO', 'BUSINESS'] } },
                    { subscription_tier: { $in: ['pro', 'business'] } }
                ]
            });

            console.log(`⏰ [Subscription Checker] Checking ${users.length} subscriptions...`);

            for (const user of users) {
                // Ensure endDate exists
                const endDate = user.subscriptionEndDate || user.subscription_end_date;
                if (!endDate) continue;

                // Calculate time difference
                const diffTime = new Date(endDate).getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (24 * 60 * 60 * 1000));
                
                const planName = (user.subscriptionPlan || user.subscription_tier || 'FREE').toUpperCase();
                const planTitle = planName.charAt(0) + planName.slice(1).toLowerCase();

                // Expiry Check
                if (diffDays <= 0) {
                    // Downgrade user immediately to FREE
                    user.subscriptionPlan = 'FREE';
                    user.subscriptionStatus = 'EXPIRED';
                    user.subscription_tier = 'free';
                    user.subscription_status = 'expired';
                    user.subscriptionEndDate = null;
                    user.subscription_end_date = null;
                    await user.save();

                    // Send Expired Notification
                    await NotificationHelper.createNotification({
                        userId: user._id,
                        type: 'subscription_expired',
                        title: '❌ Subscription Expired',
                        message: 'Your subscription has expired.',
                        referenceId: user._id,
                        referenceType: 'payment',
                        actionUrl: '/subscription'
                    });

                    console.log(`✅ [Subscription Checker] Downgraded and notified expired user: ${user.email}`);
                } else if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
                    // Avoid duplicate notification on the same day (verify if user received notification in last 12h)
                    // (Since scheduler runs daily, diffDays check is enough, but custom messages are set)
                    let message = `Your ${planTitle} subscription expires in ${diffDays} day${diffDays > 1 ? 's' : ''}.`;
                    
                    if (diffDays === 3) {
                        message = `Your ${planTitle} subscription expires in 3 days. Renew now to continue posting projects.`;
                    }

                    await NotificationHelper.createNotification({
                        userId: user._id,
                        type: 'subscription_expiring',
                        title: '⚠️ Subscription Expiring Soon',
                        message: message,
                        referenceId: user._id,
                        referenceType: 'payment',
                        actionUrl: '/subscription'
                    });

                    console.log(`✅ [Subscription Checker] Sent ${diffDays}-day reminder to user: ${user.email}`);
                }
            }
        } catch (err) {
            console.error('❌ Error checking subscriptions:', err);
        }
    }
}

module.exports = SubscriptionChecker;