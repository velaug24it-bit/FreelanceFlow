const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'bid_received',
            'bid_accepted',
            'bid_rejected',
            'project_assigned',
            'project_status_updated',  // NEW
            'invoice_paid',
            'invoice_created',
            'new_project',
            'contract_created',
            'subscription_expiring',   // NEW
            'subscription_expired',    // NEW
            'payment_received',
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
    reference_id: {
        type: mongoose.Schema.Types.ObjectId
    },
    reference_type: {
        type: String,
        enum: ['project', 'bid', 'invoice', 'contract', 'subscription', null]
    },
    action_url: {  // NEW: For click navigation
        type: String,
        default: null
    },
    is_read: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient queries
notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);