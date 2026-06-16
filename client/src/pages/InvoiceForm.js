import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const InvoiceForm = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedClientName, setSelectedClientName] = useState('');
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
            const response = await axios.get('/api/clients', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Fetched clients:', response.data.clients);
            setClients(response.data.clients || []);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
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
        const client = clients.find(c => c._id === clientId);
        if (client) {
            setSelectedClientName(client.contact_name);
            console.log('Selected client:', client.contact_name);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        console.log('=== FORM SUBMISSION ===');
        console.log('Selected client ID:', selectedClientId);
        console.log('Selected client name:', selectedClientName);
        
        if (!selectedClientName) {
            setError('Please select a client from the dropdown');
            return;
        }
        
        if (items.length === 0 || !items[0].description) {
            setError('Please add at least one invoice item');
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            
            const invoiceData = {
                client_name: selectedClientName,
                due_date: formData.due_date,
                tax_rate: parseFloat(formData.tax_rate) || 0,
                notes: formData.notes,
                items: items.map(item => ({
                    description: item.description,
                    quantity: parseFloat(item.quantity) || 1,
                    unit_price: parseFloat(item.unit_price) || 0
                })),
                subtotal: calculateSubtotal(),
                total_amount: calculateTotal()
            };
            
            console.log('Sending to backend:', invoiceData);
            
            const response = await axios.post('/api/invoices', invoiceData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Response:', response.data);
            
            if (response.data.success) {
                navigate('/invoices');
            }
        } catch (err) {
            console.error('Error:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to create invoice');
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
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }}>
                    {error}
                </div>
            )}
            
            <form onSubmit={handleSubmit}>
                {/* Client Selection */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Select Client *</label>
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
                            <option key={client._id} value={client._id}>
                                {client.contact_name} {client.company_name ? `(${client.company_name})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Show selected client */}
                {selectedClientName && (
                    <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        background: '#d1fae5',
                        borderRadius: '8px',
                        color: '#065f46'
                    }}>
                        ✓ Client selected: <strong>{selectedClientName}</strong>
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
                                borderRadius: '8px'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Tax Rate (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.tax_rate}
                            onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px'
                            }}
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
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description</label>
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
                                    borderRadius: '8px'
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
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px'
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
                                        borderRadius: '8px'
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
                                        cursor: 'pointer'
                                    }}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
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
                        marginBottom: '1.5rem'
                    }}
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
                            borderRadius: '8px'
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
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            opacity: loading ? 0.5 : 1
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
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InvoiceForm;