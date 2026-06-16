const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    title: String,
    amount: Number,
    due_date: Date,
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
});

const contractSchema = new mongoose.Schema({
    project_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ProjectPost', 
        required: true 
    },
    client_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    freelancer_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    agreed_amount: { 
        type: Number, 
        required: true 
    },
    client_fee: { 
        type: Number, 
        default: 0 
    },
    platform_earnings: { 
        type: Number, 
        default: 0 
    },
    total_client_charge: { 
        type: Number, 
        default: 0 
    },
    start_date: { 
        type: Date, 
        required: true 
    },
    end_date: { 
        type: Date, 
        required: true 
    },
    milestones: [milestoneSchema],
    status: { 
        type: String, 
        enum: ['active', 'completed', 'cancelled', 'disputed'], 
        default: 'active' 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Contract', contractSchema);