const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stripe_subscription_id: { type: String, unique: true, sparse: true },
    plan_name: { type: String, required: true },
    amount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['active', 'canceled', 'past_due', 'incomplete'],
        default: 'active'
    },
    current_period_start: Date,
    current_period_end: Date,
    canceled_at: Date
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
