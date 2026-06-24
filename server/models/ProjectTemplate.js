const mongoose = require('mongoose');

const projectTemplateSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        default: 'General'
    },
    color: {
        type: String,
        default: '#3b82f6'
    },
    tasks: [{
        title: { type: String },
        description: { type: String, default: '' },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium'
        },
        estimated_hours: { type: Number, default: 0 },
        kanban_column: { type: String, default: 'todo' },
        subtasks: [{
            title: { type: String },
            done: { type: Boolean, default: false }
        }],
        checklist: [{
            title: { type: String },
            done: { type: Boolean, default: false }
        }],
        tags: { type: [String], default: [] }
    }],
    milestones: [{
        title: { type: String },
        description: { type: String, default: '' },
        due_offset_days: { type: Number, default: 7 },   // days from project start
        color: { type: String, default: '#3b82f6' }
    }],
    // Built-in templates flag
    is_builtin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

projectTemplateSchema.index({ user_id: 1 });

module.exports = mongoose.model('ProjectTemplate', projectTemplateSchema);
