const mongoose = require('mongoose');

const projectPostSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client_name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  budget_min: {
    type: Number,
    required: true
  },
  budget_max: {
    type: Number,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  skills_required: {
    type: [String],
    default: []
  },
  attachments: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'cancelled'],
    default: 'open'
  },
  bids_count: {
    type: Number,
    default: 0
  },
  deadline: {
    type: Date
  },
  selected_freelancer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Payment fields
  payment_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  amount_released: {
    type: Number,
    default: 0
  },
  release_requested: {
    type: Boolean,
    default: false
  },
  release_requested_at: {
    type: Date
  },
  payment_released_at: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'projectposts' // <-- Specify the collection name
});

// Create indexes
projectPostSchema.index({ client_id: 1 });
projectPostSchema.index({ status: 1 });
projectPostSchema.index({ category: 1 });

module.exports = mongoose.model('Project', projectPostSchema);