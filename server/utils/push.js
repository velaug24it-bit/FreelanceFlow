const webpush = require('web-push');

const setup = () => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@freelanceflow.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
};

const sendPush = async (subscription, payload = {}) => {
  try {
    if (!subscription) return;
    if (!setup()) {
      console.error('Error sending push: VAPID keys are not configured');
      return false;
    }
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Error sending push:', err.message || err);
    return false;
  }
};

const getPublicVapidKey = () => process.env.VAPID_PUBLIC_KEY || null;

module.exports = { sendPush, getPublicVapidKey };
