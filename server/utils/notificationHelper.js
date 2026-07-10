const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('./email');
const { sendPush } = require('./push');

class NotificationHelper {
    // Create a notification
    static async createNotification({ userId, type, title, message, referenceId, referenceType, actionUrl }) {
        try {
            const notification = await Notification.create({
                user_id: userId,
                type,
                title,
                message,
                reference_id: referenceId,
                reference_type: referenceType,
                action_url: actionUrl,
                created_at: new Date()
            });
            
            // Emit real-time via WebSocket if connected
            if (global.io) {
                global.io.to(userId.toString()).emit('new_notification', notification);
            }

            // Send email / push depending on user preferences asynchronously (non-blocking)
            (async () => {
                try {
                    const user = await User.findById(userId);
                    if (user) {
                        const prefs = user.notification_preferences || {};
                        const emailPrefs = prefs.email || {};
                        const pushPrefs = prefs.push || {};

                        // Default to sending in-app always (we already created it)

                        // Email
                        if ((emailPrefs[type] === undefined ? true : emailPrefs[type]) && user.email) {
                            await sendEmail({
                                to: user.email,
                                subject: title,
                                text: message,
                                html: `<div style="font-family: sans-serif; padding: 10px;"><h3>${title}</h3><p>${message}</p><p><a href="${(process.env.CLIENT_URL||'http://localhost:3000') + (actionUrl||'')}">View</a></p></div>`
                            });
                        }

                        // Push
                        if ((pushPrefs[type] === undefined ? true : pushPrefs[type]) && user.push_subscription) {
                            await sendPush(user.push_subscription, {
                                title,
                                body: message,
                                icon: '/logo192.png',
                                url: (process.env.CLIENT_URL||'http://localhost:3000') + (actionUrl||'/')
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error sending email/push for notification in background:', err);
                }
            })();
            
            return notification;
        } catch (err) {
            console.error('Error creating notification:', err);
            return null;
        }
    }

    // Create notification for multiple users
    static async createBulkNotifications({ userIds, type, title, message, referenceId, referenceType, actionUrl }) {
        const notifications = userIds.map(userId => ({
            user_id: userId,
            type,
            title,
            message,
            reference_id: referenceId,
            reference_type: referenceType,
            action_url: actionUrl,
            created_at: new Date()
        }));
        
        try {
            const result = await Notification.insertMany(notifications);
            
            // Emit real-time via WebSocket
            if (global.io) {
                result.forEach(notification => {
                    global.io.to(notification.user_id.toString()).emit('new_notification', notification);
                });
            }
            
            return result;
        } catch (err) {
            console.error('Error creating bulk notifications:', err);
            return [];
        }
    }

    // Get notification preferences
    static getDefaultPreferences() {
        return {
            bid_received: true,
            bid_accepted: true,
            bid_rejected: true,
            project_assigned: true,
            project_status_updated: true,
            invoice_paid: true,
            invoice_created: true,
            new_project: true,
            contract_created: true,
            subscription_expiring: true,
            subscription_expired: true,
            payment_received: true,
            general: true
        };
    }
}

module.exports = NotificationHelper;