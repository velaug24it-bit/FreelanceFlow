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
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on_hold', 'cancelled'],
    default: 'active'
  },
  project_type: {
    type: String,
    enum: ['web_development', 'mobile_app', 'design', 'consulting', 'marketing', 'other'],
    default: 'web_development'
  },
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
  selected_freelancer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  selected_freelancer_name: {
    type: String
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
  }
});

// Index for better query performance
projectSchema.index({ user_id: 1 });
projectSchema.index({ client_id: 1 });
projectSchema.index({ status: 1 });

module.exports = mongoose.model('Project', projectSchema);