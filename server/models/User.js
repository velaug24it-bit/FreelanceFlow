const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    password_hash: { type: String, required: true },
    company_name: String,
    role: { type: String, enum: ['user', 'admin', 'freelancer'], default: 'user' },
    subscription_tier: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
    subscription_status: { type: String, default: 'active' },
    
    // ========== CONNECTS SYSTEM ==========
    connects_balance: { type: Number, default: 20 },
    total_connects_used: { type: Number, default: 0 },
    total_connects_purchased: { type: Number, default: 0 },
    
    // ========== COMMISSION RATES ==========
    commission_rate: { type: Number, default: 5 },
    
    // ========== PAYMENT INFO ==========
    stripe_customer_id: String,
    subscription_amount: { type: Number, default: 0 },
    last_payment_date: Date,
    
    // ============================================
    // FREELANCER'S CLIENTS (Clients who hired this freelancer)
    // ============================================
    my_clients: [{
        client_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        client_name: String,
        client_email: String,
        client_company: String,
        project_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProjectPost'
        },
        project_title: String,
        project_description: String,
        budget: Number,
        status: {
            type: String,
            enum: ['ongoing', 'completed', 'cancelled'],
            default: 'ongoing'
        },
        assigned_at: {
            type: Date,
            default: Date.now
        },
        completed_at: Date
    }],

    // ============================================
    // FREELANCER'S PROJECTS (Projects assigned to freelancer)
    // ============================================
    my_projects: [{
        project_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProjectPost'
        },
        project_title: String,
        project_description: String,
        client_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        client_name: String,
        client_email: String,
        budget: Number,
        status: {
            type: String,
            enum: ['ongoing', 'completed', 'cancelled'],
            default: 'ongoing'
        },
        assigned_at: {
            type: Date,
            default: Date.now
        },
        deadline: Date,
        completed_at: Date
    }],

    // Stats for freelancer
    total_clients: { type: Number, default: 0 },
    total_projects_assigned: { type: Number, default: 0 },
    total_earnings: { type: Number, default: 0 },
    favorite_freelancers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // ========== PROFILE COMPLETION & AUTHENTICATION ENHANCEMENTS ==========
    bio: { type: String, default: '' },
    skills: { type: [String], default: [] },
    portfolio_links: { type: [String], default: [] },
    hourly_rate: { type: Number, default: 0 },
    availability_status: {
        type: String,
        enum: ['available', 'busy', 'away'],
        default: 'available'
    },
    response_time_hours: { type: Number, default: 24 },
    moderation_status: {
        type: String,
        enum: ['active', 'flagged', 'suspended', 'banned'],
        default: 'active'
    },
    avatar_url: { type: String, default: '' },
    is_email_verified: { type: Boolean, default: false },
    verification_token: String,
    verification_token_expires: Date,
    reset_password_token: String,
    reset_password_expires: Date,
    two_factor_secret: String,
    two_factor_temp_secret: String,
    is_2fa_enabled: { type: Boolean, default: false },
    // Notification preferences (email, in-app, push) for events
    notification_preferences: {
        type: {
            email: {
                invoice: { type: Boolean, default: true },
                project: { type: Boolean, default: true },
                message: { type: Boolean, default: true },
                subscription: { type: Boolean, default: true }
            },
            in_app: {
                invoice: { type: Boolean, default: true },
                project: { type: Boolean, default: true },
                message: { type: Boolean, default: true },
                subscription: { type: Boolean, default: true }
            },
            push: {
                invoice: { type: Boolean, default: true },
                project: { type: Boolean, default: true },
                message: { type: Boolean, default: true },
                subscription: { type: Boolean, default: true }
            }
        },
        default: {}
    },
    // Push subscription object (Web Push) saved per user
    push_subscription: { type: Object, default: null },
    
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('User', userSchema);
