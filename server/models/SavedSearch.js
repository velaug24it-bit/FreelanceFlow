const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true, default: 'Saved project search' },
    category: { type: String, trim: true, default: 'Any' },
    skills: { type: [String], default: [] },
    budget_min: { type: Number, default: 0 },
    budget_max: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    matched_project_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProjectPost' }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

savedSearchSchema.index({ user_id: 1, created_at: -1 });
savedSearchSchema.index({ is_active: 1, category: 1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
