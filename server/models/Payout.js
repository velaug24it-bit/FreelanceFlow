const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectPost',
    required: true
  },
  freelancer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  payment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: false
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paid_at: {
    type: Date
  },
  notes: {
    type: String
  },
  description: {
    type: String
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

payoutSchema.index({ freelancer_id: 1, status: 1 });
payoutSchema.index({ project_id: 1 });
payoutSchema.index({ payment_id: 1 });

module.exports = mongoose.model('Payout', payoutSchema);
