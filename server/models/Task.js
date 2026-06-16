const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    project_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project' 
    },
    title: { 
        type: String, 
        required: true 
    },
    description: String,
    status: { 
        type: String, 
        enum: ['todo', 'in_progress', 'review', 'done'], 
        default: 'todo' 
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'urgent'], 
        default: 'medium' 
    },
    due_date: Date,
    assigned_to: String,
    created_at: { 
        type: Date, 
        default: Date.now 
    },
    updated_at: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Task', taskSchema);