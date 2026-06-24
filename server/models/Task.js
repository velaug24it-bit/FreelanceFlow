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
    milestone_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Milestone',
        default: null
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
    // Kanban ordering
    kanban_column: {
        type: String,
        enum: ['todo', 'in_progress', 'review', 'done'],
        default: 'todo'
    },
    order: {
        type: Number,
        default: 0
    },
    tags: {
        type: [String],
        default: []
    },
    assigned_to: {
        type: String,
        default: ''
    },
    // Time tracking
    estimated_hours: {
        type: Number,
        default: 0
    },
    total_logged_hours: {
        type: Number,
        default: 0
    },
    is_timer_running: {
        type: Boolean,
        default: false
    },
    timer_started_at: {
        type: Date,
        default: null
    },
    time_logs: [{
        started_at: { type: Date },
        ended_at: { type: Date },
        duration_seconds: { type: Number, default: 0 },
        note: { type: String, default: '' }
    }],
    // Subtasks
    subtasks: [{
        title: { type: String, required: true },
        done: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
        created_at: { type: Date, default: Date.now }
    }],
    // Checklist items (separate from subtasks)
    checklist: [{
        title: { type: String, required: true },
        done: { type: Boolean, default: false },
        order: { type: Number, default: 0 }
    }],
    // File attachments
    attachments: [{
        filename: { type: String },        // stored filename on disk
        original_name: { type: String },   // original user filename
        mimetype: { type: String },
        size: { type: Number },
        path: { type: String },
        uploaded_at: { type: Date, default: Date.now }
    }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

taskSchema.index({ user_id: 1, status: 1 });
taskSchema.index({ project_id: 1, order: 1 });
taskSchema.index({ milestone_id: 1 });

module.exports = mongoose.model('Task', taskSchema);