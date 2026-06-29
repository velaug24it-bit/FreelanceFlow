import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Download, Printer } from 'lucide-react';

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newExpense, setNewExpense] = useState({
        category: '',
        amount: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
        client_id: '',
        client_name: ''
    });

    useEffect(() => {
        fetchExpenses();
        fetchClients();
    }, []);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/expenses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenses(response.data.expenses || []);
        } catch (err) {
            console.error('Failed to fetch expenses:', err);
            setError('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/clients', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClients(response.data.clients || []);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
        }
    };

    const handleClientChange = (e) => {
        const selectedClientId = e.target.value;
        const selectedClient = clients.find(c => c._id === selectedClientId);
        setNewExpense({
            ...newExpense,
            client_id: selectedClientId,
            client_name: selectedClient ? selectedClient.contact_name : ''
        });
    };

    const addExpense = async () => {
        if (!newExpense.category) {
            setError('Please enter a category');
            return;
        }
        if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (!newExpense.expense_date) {
            setError('Please select a date');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/expenses', newExpense, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNewExpense({
                category: '',
                amount: '',
                description: '',
                expense_date: new Date().toISOString().split('T')[0],
                client_id: '',
                client_name: ''
            });
            setShowForm(false);
            fetchExpenses();

        } catch (err) {
            console.error('Failed to add expense:', err);
            setError('Failed to add expense. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteExpense = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/expenses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchExpenses();
        } catch (err) {
            console.error('Failed to delete expense:', err);
            setError('Failed to delete expense');
        }
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

    const openPrintableExpense = (expense, mode = 'print') => {
        const html = `
            <html>
                <head>
                    <title>Expense ${expense.category || 'Record'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
                        .box { border: 1px solid #e5e7eb; padding: 16px; border-radius: 10px; margin-bottom: 16px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                        .bold { font-weight: 700; }
                    </style>
                </head>
                <body>
                    <h2>Expense Receipt</h2>
                    <div class="box">
                        <div class="row"><span>Category</span><span class="bold">${expense.category || 'Other'}</span></div>
                        <div class="row"><span>Client</span><span>${expense.client_name || '-'}</span></div>
                        <div class="row"><span>Date</span><span>${new Date(expense.expense_date).toLocaleDateString()}</span></div>
                        <div class="row"><span>Amount</span><span class="bold">$${parseFloat(expense.amount || 0).toFixed(2)}</span></div>
                    </div>
                    <div class="box">
                        <p><strong>Description</strong></p>
                        <p>${expense.description || 'No description provided.'}</p>
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const getCategoryColor = (category) => {
        const colors = {
            'Software': '#e0e7ff',
            'Hardware': '#d1fae5',
            'Marketing': '#fef3c7',
            'Office': '#fce7f3',
            'Travel': '#ffe4e6',
            'Other': '#f3f4f6'
        };
        return colors[category] || '#f3f4f6';
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading expenses...</div>;
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Expense Tracking</h1>
                    <p style={{ color: '#6b7280' }}>Track business expenses by client</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    <Plus size={18} />
                    Add Expense
                </button>
            </div>

            {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {expenses.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    color: 'white',
                    marginBottom: '2rem'
                }}>
                    <p style={{ opacity: 0.9, marginBottom: '0.5rem' }}>Total Expenses</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>${totalExpenses.toFixed(2)}</p>
                    <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>All time expenses</p>
                </div>
            )}

            {showForm && (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Add New Expense</h3>
                    
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Category *</label>
                            <select
                                value={newExpense.category}
                                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }}
                                required
                            >
                                <option value="">Select Category</option>
                                <option value="Software">Software</option>
                                <option value="Hardware">Hardware</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Office">Office Supplies</option>
                                <option value="Travel">Travel</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Client (Optional)</label>
                            <select
                                value={newExpense.client_id}
                                onChange={handleClientChange}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }}
                            >
                                <option value="">-- Select Client (Optional) --</option>
                                {clients.map(client => (
                                    <option key={client._id} value={client._id}>
                                        {client.contact_name} {client.company_name ? `(${client.company_name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Amount ($) *</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={newExpense.amount}
                                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Date *</label>
                            <input
                                type="date"
                                value={newExpense.expense_date}
                                onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }}
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Description</label>
                            <textarea
                                placeholder="Describe this expense (optional)"
                                value={newExpense.description}
                                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                rows="2"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            onClick={addExpense}
                            disabled={submitting}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                opacity: submitting ? 0.5 : 1
                            }}
                        >
                            {submitting ? 'Saving...' : 'Save Expense'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {expenses.length === 0 && !showForm && (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '3rem',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💰</div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Expenses Yet</h3>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                        Start tracking your business expenses by adding your first expense.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Plus size={18} />
                        Add Your First Expense
                    </button>
                </div>
            )}

            {expenses.length > 0 && (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    overflow: 'auto',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead style={{ background: '#f9fafb' }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Category</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Client</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Description</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(expense => (
                                <tr key={expense._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            background: getCategoryColor(expense.category),
                                            borderRadius: '12px',
                                            fontSize: '0.875rem'
                                        }}>
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {expense.client_name || '-'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {expense.description || '-'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {new Date(expense.expense_date).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                                        ${parseFloat(expense.amount).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => openPrintableExpense(expense, 'download')}
                                                title="Download PDF"
                                                style={{
                                                    padding: '0.5rem',
                                                    background: '#6366f1',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: 'white'
                                                }}
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button
                                                onClick={() => openPrintableExpense(expense, 'print')}
                                                title="Print"
                                                style={{
                                                    padding: '0.5rem',
                                                    background: '#0f766e',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: 'white'
                                                }}
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button
                                                onClick={() => deleteExpense(expense._id)}
                                                style={{
                                                    padding: '0.5rem',
                                                    background: '#fee2e2',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: '#dc2626'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot style={{ background: '#f9fafb', fontWeight: 'bold' }}>
                            <tr>
                                <td colSpan="4" style={{ padding: '1rem', textAlign: 'right' }}>Total:</td>
                                <td style={{ padding: '1rem', textAlign: 'right', color: '#dc2626' }}>
                                    ${totalExpenses.toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Expenses;