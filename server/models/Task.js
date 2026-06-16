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
    description: {
        type: String,
        default: ''
    },
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
    due_date: {
        type: Date,
        default: null
    },
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

// Index for better performance
taskSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);