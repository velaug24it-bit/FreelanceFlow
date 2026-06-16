const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    status: {
        type: String,
        default: 'active'
    },
    project_type: String,
    budget: Number,
    due_date: Date,
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Project', projectSchema);