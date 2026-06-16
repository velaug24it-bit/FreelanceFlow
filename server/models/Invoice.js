const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    description: String,
    quantity: Number,
    unit_price: Number,
    total_price: Number
});

const invoiceSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    invoice_number: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'paid', 'overdue'],
        default: 'draft'
    },
    subtotal: {
        type: Number,
        required: true
    },
    tax_rate: {
        type: Number,
        default: 0
    },
    tax_amount: {
        type: Number,
        default: 0
    },
    total_amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    due_date: Date,
    paid_at: Date,
    notes: String,
    items: [invoiceItemSchema],
    stripe_payment_intent_id: String,
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Invoice', invoiceSchema);