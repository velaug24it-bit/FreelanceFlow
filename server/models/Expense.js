const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    client_name: { type: String },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: String,
    expense_date: { type: Date, required: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);