const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // Common fields for both types
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  client_name: {
    type: String
  },
  client_email: {
    type: String
  },
  client_company: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on_hold', 'cancelled', 'open', 'in_progress', 'review', 'draft'],
    default: 'active'
  },
  project_type: {
    type: String,
    enum: ['web_development', 'mobile_app', 'design', 'consulting', 'marketing', 'marketplace', 'other'],
    default: 'web_development'
  },

  // Regular project fields
  budget: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  start_date: {
    type: Date
  },
  due_date: {
    type: Date
  },

  // Marketplace project fields
  budget_min: {
    type: Number,
    default: 0
  },
  budget_max: {
    type: Number,
    default: 0
  },
  category: {
    type: String
  },
  duration: {
    type: String
  },
  skills_required: {
    type: [String],
    default: []
  },
  attachments: {
    type: [String],
    default: []
  },
  deadline: {
    type: Date
  },

  // Freelancer details
  selected_freelancer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  selected_freelancer_name: {
    type: String
  },
  freelancer_email: {
    type: String
  },
  freelancer_company: {
    type: String
  },

  // Common tracking fields
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  current_phase: {
    type: String,
    enum: ['planning', 'development', 'testing', 'deployment', 'completed'],
    default: 'planning'
  },
  completed_at: {
    type: Date
  },
  bids_count: {
    type: Number,
    default: 0
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
  collection: 'projectposts'
});

// Indexes for better performance
projectSchema.index({ user_id: 1 });
projectSchema.index({ client_id: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ selected_freelancer_id: 1 });

module.exports = mongoose.model('Project', projectSchema);