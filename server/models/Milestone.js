const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    due_date: {
        type: Date
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'overdue'],
        default: 'not_started'
    },
    order: {
        type: Number,
        default: 0
    },
    color: {
        type: String,
        default: '#3b82f6'
    },
    completed_at: {
        type: Date
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

milestoneSchema.index({ project_id: 1, order: 1 });

module.exports = mongoose.model('Milestone', milestoneSchema);
