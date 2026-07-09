const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unit_price: {
        type: Number,
        required: true,
        min: 0
    },
    total_price: {
        type: Number,
        required: true
    }
});

const invoiceSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
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
        default: 'pending'
    },
    subtotal: {
        type: Number,
        required: true,
        default: 0
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
        required: true,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    due_date: {
        type: Date
    },
    paid_at: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    },
    items: [invoiceItemSchema]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Create indexes for better performance
invoiceSchema.index({ user_id: 1 });
invoiceSchema.index({ client_id: 1 });
invoiceSchema.index({ status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);