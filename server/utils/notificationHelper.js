const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('./email');
const { sendPush } = require('./push');

const DEFAULT_CHANNEL_PREFERENCES = {
    email: {
        invoice: true,
        project: true,
        message: true,
        subscription: true,
        payment: true
    },
    in_app: {
        invoice: true,
        project: true,
        message: true,
        subscription: true,
        payment: true
    },
    push: {
        invoice: true,
        project: true,
        message: true,
        subscription: true,
        payment: true
    }
};

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
        case 'project_completed':
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

const isChannelEnabled = (prefs, channel, category, type) => {
    const channelPrefs = prefs?.[channel] || {};

    if (type && channelPrefs[type] !== undefined) {
        return channelPrefs[type] !== false;
    }

    if (category && channelPrefs[category] !== undefined) {
        return channelPrefs[category] !== false;
    }

    if (type && prefs?.[type] !== undefined) {
        return prefs[type] !== false;
    }

    return true;
};

const getClientUrl = () => (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    'https://freelanceflow-frontend-uh18.onrender.com'
).replace(/\/$/, '');

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
                        const category = mapTypeToCategory(type);
                        const isEmailEnabled = isChannelEnabled(prefs, 'email', category, type);
                        const isPushEnabled = isChannelEnabled(prefs, 'push', category, type);

                        // Email
                        if (isEmailEnabled && user.email) {
                            const clientUrl = getClientUrl();
                            const fullUrl = actionUrl ? clientUrl + actionUrl : clientUrl;
                            const emailResult = await sendEmail({
                                to: user.email,
                                subject: `[FreelanceFlow] ${title}`,
                                text: `${title}\n\n${message}\n\nView here: ${fullUrl}\n\nYou received this because you have email notifications enabled on FreelanceFlow.`,
                                html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)"><tr><td style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:32px 40px;text-align:center"><h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">FreelanceFlow</h1><p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">Professional Freelancing Platform</p></td></tr><tr><td style="padding:36px 40px"><h2 style="color:#1e293b;margin:0 0 16px;font-size:20px">${title}</h2><p style="color:#475569;margin:0 0 24px;font-size:15px;line-height:1.6">${message}</p><a href="${fullUrl}" style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">View Details</a></td></tr><tr><td style="padding:20px 40px;border-top:1px solid #e2e8f0;background:#f8fafc"><p style="color:#94a3b8;font-size:12px;margin:0;text-align:center">You received this because you have email notifications enabled on FreelanceFlow.<br>To manage your notification preferences, visit your <a href="${clientUrl}/settings" style="color:#3b82f6">account settings</a>.</p></td></tr></table></td></tr></table></body></html>`
                            });
                            if (emailResult?.error) {
                                console.error(`Notification email failed for ${user.email}:`, emailResult.error);
                            }
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
                        const isEmailEnabled = isChannelEnabled(prefs, 'email', category, type);
                        const isPushEnabled = isChannelEnabled(prefs, 'push', category, type);

                        // Email
                        if (isEmailEnabled && user.email) {
                            const clientUrl = getClientUrl();
                            const fullUrl = actionUrl ? clientUrl + actionUrl : clientUrl;
                            const emailResult = await sendEmail({
                                to: user.email,
                                subject: `[FreelanceFlow] ${title}`,
                                text: `${title}\n\n${message}\n\nView here: ${fullUrl}\n\nYou received this because you have email notifications enabled on FreelanceFlow.`,
                                html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)"><tr><td style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:32px 40px;text-align:center"><h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">FreelanceFlow</h1><p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">Professional Freelancing Platform</p></td></tr><tr><td style="padding:36px 40px"><h2 style="color:#1e293b;margin:0 0 16px;font-size:20px">${title}</h2><p style="color:#475569;margin:0 0 24px;font-size:15px;line-height:1.6">${message}</p><a href="${fullUrl}" style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">View Details</a></td></tr><tr><td style="padding:20px 40px;border-top:1px solid #e2e8f0;background:#f8fafc"><p style="color:#94a3b8;font-size:12px;margin:0;text-align:center">You received this because you have email notifications enabled on FreelanceFlow.<br>To manage your notification preferences, visit your <a href="${clientUrl}/settings" style="color:#3b82f6">account settings</a>.</p></td></tr></table></td></tr></table></body></html>`
                            }).catch(err => console.error(`Error sending email to ${user.email} in bulk notification:`, err));
                            if (emailResult?.error) {
                                console.error(`Bulk notification email failed for ${user.email}:`, emailResult.error);
                            }
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
        return JSON.parse(JSON.stringify(DEFAULT_CHANNEL_PREFERENCES));
    }

    static normalizePreferences(preferences = {}) {
        const defaults = NotificationHelper.getDefaultPreferences();

        return {
            email: { ...defaults.email, ...(preferences.email || {}) },
            in_app: { ...defaults.in_app, ...(preferences.in_app || {}) },
            push: { ...defaults.push, ...(preferences.push || {}) }
        };
    }
}

module.exports = NotificationHelper;
