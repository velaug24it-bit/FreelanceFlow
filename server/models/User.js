const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    password_hash: { type: String, required: true },
    company_name: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    subscription_tier: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
    subscription_status: { type: String, default: 'active' },
    
    // ========== CONNECTS SYSTEM ==========
    connects_balance: { type: Number, default: 20 }, // Free users get 20 connects/month
    total_connects_used: { type: Number, default: 0 },
    total_connects_purchased: { type: Number, default: 0 },
    
    // ========== COMMISSION RATES ==========
    commission_rate: { type: Number, default: 5 }, // 5% for free, 2% for pro, 1% for business
    
    // ========== PAYMENT INFO ==========
    stripe_customer_id: String,
    subscription_amount: { type: Number, default: 0 },
    last_payment_date: Date,
    
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('User', userSchema);