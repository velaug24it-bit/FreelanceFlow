const webpush = require('web-push');

const setup = () => {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.EMAIL_FROM || 'mailto:admin@freelanceflow.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
};

const sendPush = async (subscription, payload = {}) => {
  try {
    if (!subscription) return;
    setup();
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Error sending push:', err.message || err);
    return false;
  }
};

module.exports = { sendPush };
