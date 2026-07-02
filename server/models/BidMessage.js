const mongoose = require('mongoose');

const bidMessageSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectPost', required: true, index: true },
    bid_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', required: true, index: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender_name: { type: String, required: true },
    sender_role: { type: String, enum: ['client', 'freelancer'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

bidMessageSchema.index({ bid_id: 1, created_at: -1 });

module.exports = mongoose.model('BidMessage', bidMessageSchema);
