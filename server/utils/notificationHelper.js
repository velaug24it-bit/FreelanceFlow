const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('./email');
const { sendPush } = require('./push');

const mapTypeToCategory = (type) => {
    switch (type) {
        case 'invoice_created':
        case 'invoice_paid':
        case 'invoice':
            return 'invoice';
        case 'bid_received':
        case 'bid_accepted':
        case 'bid_rejected':
        case 'project_assigned':
        case 'project_status_updated':
        case 'new_project':
        case 'contract_created':
        case 'job_match':
        case 'prehire_message':
        case 'project':
            return 'project';
        case 'message':
        case 'chat':
            return 'message';
        case 'subscription_expiring':
        case 'subscription_expired':
        case 'subscription':
            return 'subscription';
        case 'payment_received':
        case 'payment_released':
        case 'payment_submitted':
        case 'payment_approved':
        case 'payment_rejected':
        case 'payment':
            return 'payment';
        default:
            return null;
    }
};

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

                        const category = mapTypeToCategory(type);
                        const isEmailEnabled = category ? (emailPrefs[category] === undefined ? true : emailPrefs[category]) : true;
                        const isPushEnabled = category ? (pushPrefs[category] === undefined ? true : pushPrefs[category]) : true;

                        // Email
                        if (isEmailEnabled && user.email) {
                            await sendEmail({
                                to: user.email,
                                subject: title,
                                text: message,
                                html: `<div style="font-family: sans-serif; padding: 10px;"><h3>${title}</h3><p>${message}</p><p><a href="${(process.env.CLIENT_URL||'http://localhost:3000') + (actionUrl||'')}">View</a></p></div>`
                            });
                        }

                        // Push
                        if (isPushEnabled && user.push_subscription) {
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

            // Send email / push depending on user preferences asynchronously (non-blocking)
            (async () => {
                try {
                    const users = await User.find({ _id: { $in: userIds } });
                    const category = mapTypeToCategory(type);

                    for (const user of users) {
                        if (!user) continue;

                        const prefs = user.notification_preferences || {};
                        const emailPrefs = prefs.email || {};
                        const pushPrefs = prefs.push || {};

                        const isEmailEnabled = category ? (emailPrefs[category] === undefined ? true : emailPrefs[category]) : true;
                        const isPushEnabled = category ? (pushPrefs[category] === undefined ? true : pushPrefs[category]) : true;

                        // Email
                        if (isEmailEnabled && user.email) {
                            await sendEmail({
                                to: user.email,
                                subject: title,
                                text: message,
                                html: `<div style="font-family: sans-serif; padding: 10px;"><h3>${title}</h3><p>${message}</p><p><a href="${(process.env.CLIENT_URL||'http://localhost:3000') + (actionUrl||'')}">View</a></p></div>`
                            }).catch(err => console.error(`Error sending email to ${user.email} in bulk notification:`, err));
                        }

                        // Push
                        if (isPushEnabled && user.push_subscription) {
                            await sendPush(user.push_subscription, {
                                title,
                                body: message,
                                icon: '/logo192.png',
                                url: (process.env.CLIENT_URL||'http://localhost:3000') + (actionUrl||'/')
                            }).catch(err => console.error(`Error sending push to ${user.email} in bulk notification:`, err));
                        }
                    }
                } catch (err) {
                    console.error('Error sending bulk email/push notifications in background:', err);
                }
            })();
            
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