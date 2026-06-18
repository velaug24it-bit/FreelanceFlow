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
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['razorpay', 'stripe', 'bank_transfer', 'manual'],
    default: 'razorpay'
  },
  transaction_id: {
    type: String
  },
  order_id: {
    type: String
  },
  payment_id: {
    type: String
  },
  paid_at: {
    type: Date
  },
  released_at: {
    type: Date
  },
  notes: {
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
  freelancer_phone: {
    type: String
  },
  payout_status: {
    type: String,
    enum: ['pending', 'manual_required', 'released'],
    default: 'pending'
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
