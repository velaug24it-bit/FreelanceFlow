const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectPost', required: true },
    reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewer_name: { type: String, required: true },
    reviewee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee_name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
    created_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

reviewSchema.index({ project_id: 1, reviewer_id: 1, reviewee_id: 1 }, { unique: true });
reviewSchema.index({ reviewee_id: 1, created_at: -1 });

module.exports = mongoose.model('Review', reviewSchema);
