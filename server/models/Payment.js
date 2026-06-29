const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // For Project Payments
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false  // Changed from required: true
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Changed from required: true
  },
  freelancer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Changed from required: true
  },

  // For Connects Purchases
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // Common fields
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
  description: {
    type: String
  },
  paid_at: {
    type: Date
  },
  released_at: {
    type: Date
  },
  fee: {
    type: Number,
    default: 0
  },
  net_amount: {
    type: Number,
    default: 0
  },
  bid_amount: {
    type: Number,
    default: 0
  },
  platform_fee: {
    type: Number,
    default: 0
  },
  freelancer_amount: {
    type: Number,
    default: 0
  },
  payment_type: {
    type: String,
    enum: ['project_release', 'connects', 'subscription', 'other'],
    default: 'other'
  },
  // For Connects Purchases
  package_id: {
    type: String
  },
  connects_purchased: {
    type: Number,
    default: 0
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for better performance
paymentSchema.index({ user_id: 1 });
paymentSchema.index({ project_id: 1 });
paymentSchema.index({ client_id: 1 });
paymentSchema.index({ freelancer_id: 1 });
paymentSchema.index({ order_id: 1 });
paymentSchema.index({ transaction_id: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
