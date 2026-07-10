const mongoose = require('mongoose');

const projectPostSchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Present only on generated Project records that were historically written
    // into this collection. Real marketplace posts do not set this field.
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    client_name: {
        type: String,
        required: true
    },

    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    category: {
        type: String,
        enum: [
            'Web Development',
            'Mobile App',
            'Design',
            'Content Writing',
            'Marketing',
            'Other'
        ],
        required: true
    },

    budget_min: {
        type: Number,
        required: true
    },

    budget_max: {
        type: Number,
        required: true
    },

    duration: {
        type: String,
        required: true
    },

    skills_required: [String],

    attachments: [String],

    // Status tracking
    status: {
        type: String,
        enum: [
            'open',
            'in_progress',
            'review',
            'completed',
            'cancelled'
        ],
        default: 'open'
    },

    // Progress tracking
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    current_phase: {
        type: String,
        enum: [
            'planning',
            'development',
            'testing',
            'deployment',
            'completed'
        ],
        default: 'planning'
    },

    selected_freelancer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    selected_freelancer_name: {
        type: String
    },

    bids_count: {
        type: Number,
        default: 0
    },

    // Status updates
    status_updates: [{
        message: String,
        status: String,
        progress: Number,

        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        updated_by_name: String,

        created_at: {
            type: Date,
            default: Date.now
        }
    }],

    created_at: {
        type: Date,
        default: Date.now
    },

    deadline: {
        type: Date
    },

    started_at: {
        type: Date
    },



    // Payment tracking
    payment_status: {
        type: String,
        enum: ['unpaid', 'pending', 'processing', 'paid', 'failed', 'refunded', 'payment_pending_verification'],
        default: 'unpaid'
    },
    
    // Manual Payment fields (UPI)
    payment_screenshot: String,
    final_delivery_document: String,
    payment_date: Date,
    payment_verified_by_freelancer: { type: Boolean, default: false },
    verification_date: Date,
    rejection_reason: String,

    payment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },

    release_requested: {
        type: Boolean,
        default: false
    },

    release_requested_at: {
        type: Date
    },

    amount_released: {
        type: Number,
        default: 0
    },

    bid_amount: {
        type: Number,
        default: 0
    },

    platform_fee: {
        type: Number,
        default: 0
    },

    freelancer_amount: {
        type: Number,
        default: 0
    },

    payment_released_at: {
        type: Date
    },
    is_featured: {
        type: Boolean,
        default: false
    },
    demo_video_url: {
        type: String,
        default: ''
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('ProjectPost', projectPostSchema);
