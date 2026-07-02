const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reporter_name: { type: String, required: true },
    target_type: {
        type: String,
        enum: ['project', 'profile', 'bid', 'review', 'dispute'],
        required: true
    },
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    target_label: { type: String, default: '' },
    reason: { type: String, required: true, trim: true },
    details: { type: String, trim: true, default: '', maxlength: 2000 },
    status: {
        type: String,
        enum: ['open', 'reviewing', 'resolved', 'dismissed'],
        default: 'open'
    },
    admin_notes: { type: String, trim: true, default: '' },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolved_at: Date
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

reportSchema.index({ status: 1, created_at: -1 });
reportSchema.index({ target_type: 1, target_id: 1 });

module.exports = mongoose.model('Report', reportSchema);
