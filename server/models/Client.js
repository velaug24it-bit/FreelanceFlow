const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contact_name: { type: String, required: true },
    company_name: String,
    email: { type: String, required: true },
    phone: String,
    address: String,
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', clientSchema);