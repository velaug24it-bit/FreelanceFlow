const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectPost',
        required: true,
        index: true
    },
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender_name: {
        type: String,
        required: true
    },
    sender_role: {
        type: String,
        enum: ['client', 'freelancer'],
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    read_by: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

chatMessageSchema.index({ project_id: 1, created_at: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
