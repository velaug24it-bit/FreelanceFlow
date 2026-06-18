import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const InvoiceForm = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [formData, setFormData] = useState({
        due_date: '',
        tax_rate: 0,
        notes: ''
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to create an invoice');
                return;
            }

            const response = await axios.get(`${API_URL}/clients`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Fetched clients:', response.data);
            const clientsData = response.data.clients || response.data || [];
            setClients(clientsData);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
            setError('Failed to load clients. Please refresh and try again.');
        }
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index, field, value) => {
        const updatedItems = [...items];
        if (field === 'description') {
            updatedItems[index][field] = value;
        } else {
            updatedItems[index][field] = parseFloat(value) || 0;
        }
        // Calculate total price for the item
        updatedItems[index].total_price = (updatedItems[index].quantity || 0) * (updatedItems[index].unit_price || 0);
        setItems(updatedItems);
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
    };

    const calculateTax = () => {
        return calculateSubtotal() * ((formData.tax_rate || 0) / 100);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    const handleClientChange = (e) => {
        const clientId = e.target.value;
        setSelectedClientId(clientId);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        console.log('=== FORM SUBMISSION ===');
        console.log('Selected client ID:', selectedClientId);
        console.log('Items:', items);

        if (!selectedClientId) {
            setError('Please select a client from the dropdown');
            return;
        }

        if (items.length === 0 || !items[0].description) {
            setError('Please add at least one invoice item with a description');
            return;
        }

        const emptyItem = items.some(item => !item.description.trim());
        if (emptyItem) {
            setError('Please fill in all item descriptions');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to create an invoice');
                setLoading(false);
                return;
            }

            const subtotal = calculateSubtotal();
            const taxAmount = calculateTax();
            const totalAmount = calculateTotal();

            const invoiceData = {
                client_id: selectedClientId,
                due_date: formData.due_date || null,
                tax_rate: parseFloat(formData.tax_rate) || 0,
                notes: formData.notes || '',
                items: items.map(item => ({
                    description: item.description.trim(),
                    quantity: parseFloat(item.quantity) || 1,
                    unit_price: parseFloat(item.unit_price) || 0,
                    total_price: (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0)
                })),
                subtotal: subtotal,
                total_amount: totalAmount
            };

            console.log('Sending invoice data:', invoiceData);

            const response = await axios.post(`${API_URL}/invoices`, invoiceData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response:', response.data);

            if (response.data.success || response.data.invoice) {
                alert('✅ Invoice created successfully!');
                navigate('/invoices');
            } else {
                setError('Failed to create invoice. Please try again.');
            }
        } catch (err) {
            console.error('❌ Error creating invoice:', err);
            console.error('❌ Error response:', err.response?.data);

            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to create invoice. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Create New Invoice</h2>

            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #fecaca'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Client Selection */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Select Client *
                    </label>
                    <select
                        value={selectedClientId}
                        onChange={handleClientChange}
                        required
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem'
                        }}
                    >
                        <option value="">-- Select a client --</option>
                        {clients.map(client => (
                            <option key={client._id || client.id} value={client._id || client.id}>
                                {client.contact_name} {client.company_name ? `(${client.company_name})` : ''}
                            </option>
                        ))}
                    </select>
                    {clients.length === 0 && (
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                            No clients found. <a href="/clients/new" style={{ color: '#3b82f6' }}>Add a client first</a>
                        </p>
                    )}
                </div>

                {/* Show selected client */}
                {selectedClientId && (
                    <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        background: '#d1fae5',
                        borderRadius: '8px',
                        color: '#065f46'
                    }}>
                        ✓ Client selected: <strong>{clients.find(c => (c._id || c.id) === selectedClientId)?.contact_name || 'Selected'}</strong>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Due Date</label>
                        <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Tax Rate (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={formData.tax_rate}
                            onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '1rem'
                            }}
                            placeholder="0"
                        />
                    </div>
                </div>

                <h3 style={{ margin: '1.5rem 0 1rem' }}>Invoice Items</h3>

                {items.map((item, index) => (
                    <div key={index} style={{
                        marginBottom: '1rem',
                        padding: '1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: '#f9fafb'
                    }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description *</label>
                            <input
                                type="text"
                                placeholder="Item description"
                                value={item.description}
                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Quantity</label>
                                <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    min="1"
                                    step="1"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Unit Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                    min="0"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    style={{
                                        padding: '0.75rem',
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        {/* Show item total - removed the unwanted zero display */}
                        {item.quantity > 0 && item.unit_price > 0 && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                Item Total: <strong>${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</strong>
                            </div>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addItem}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '1.5rem',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                >
                    + Add Item
                </button>

                <div style={{
                    padding: '1rem',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    marginBottom: '1.5rem'
                }}>
                    <p><strong>Subtotal:</strong> ${calculateSubtotal().toFixed(2)}</p>
                    <p><strong>Tax ({formData.tax_rate || 0}%):</strong> ${calculateTax().toFixed(2)}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                        <strong>Total:</strong> ${calculateTotal().toFixed(2)}
                    </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows="3"
                        placeholder="Payment terms, thank you message, etc."
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: loading ? '#9ca3af' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.background = '#059669';
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.currentTarget.style.background = '#10b981';
                        }}
                    >
                        {loading ? 'Creating Invoice...' : 'Create Invoice'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/invoices')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InvoiceForm;