const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'payment_received',
      'payment_released',
      'project_completed',
      'project_status_updated',
      'bid_received',
      'bid_accepted',
      'bid_rejected',
      'invoice_paid',
      'invoice_created',
      'new_project',
      'job_match',
      'prehire_message',
      'moderation_report',
      'subscription_expiring',
      'subscription_expired',
      'general'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  reference_type: {
    type: String,
    enum: ['project', 'invoice', 'contract', 'payment']
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  action_url: {
    type: String
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'created_at'
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
