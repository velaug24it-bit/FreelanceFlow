const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // ... existing fields ...
  
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

module.exports = mongoose.model('Project', projectSchema);