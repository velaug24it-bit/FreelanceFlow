const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectPost', required: true },
    freelancer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancer_name: { type: String, required: true },
    bid_amount: { type: Number, required: true },
    estimated_days: { type: Number, required: true },
    proposal: { type: String, required: true },
    phone_number: { type: String, required: true },
    portfolio_link: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    is_featured: { type: Boolean, default: false },
    is_shortlisted: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bid', bidSchema);