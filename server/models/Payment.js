const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  order_id: {
    type: String
  },
  payment_id: {
    type: String
  },
  fee: {
    type: Number,
    default: 0
  },
  net_amount: {
    type: Number,
    default: 0
  },
  paid_at: {
    type: Date
  },
  released_at: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for better performance
paymentSchema.index({ project_id: 1 });
paymentSchema.index({ client_id: 1 });
paymentSchema.index({ freelancer_id: 1 });
paymentSchema.index({ order_id: 1 });

module.exports = mongoose.model('Payment', paymentSchema);