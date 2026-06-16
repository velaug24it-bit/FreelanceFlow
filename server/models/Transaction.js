const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transaction_id: { type: String, unique: true },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectPost' },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    freelancer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Amount breakdown
    amount: { type: Number, required: true }, // Original bid amount
    client_fee: { type: Number, default: 0 }, // Fee charged to client (5%)
    platform_earnings: { type: Number, default: 0 }, // What platform earns
    freelancer_earnings: { type: Number, default: 0 }, // What freelancer gets
    
    // Payment status
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'released', 'refunded'], 
        default: 'pending' 
    },
    
    // Payment details
    payment_method: { type: String, enum: ['razorpay', 'stripe', 'bank'], default: 'razorpay' },
    payment_id: String,
    
    created_at: { type: Date, default: Date.now },
    completed_at: Date
});

// Generate transaction ID before saving
transactionSchema.pre('save', function(next) {
    if (!this.transaction_id) {
        this.transaction_id = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);