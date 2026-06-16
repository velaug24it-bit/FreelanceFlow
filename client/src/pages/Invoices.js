import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/invoices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvoices(response.data.invoices || []);
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const markAsPaid = async (id) => {
        if (!window.confirm('Mark this invoice as paid?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/invoices/${id}/status`, 
                { status: 'paid' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchInvoices();
        } catch (err) {
            console.error('Failed to mark as paid:', err);
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'paid') {
            return <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem' }}>Paid</span>;
        }
        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem' }}>Pending</span>;
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading invoices...</div>;
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem' }}>Invoices</h1>
                <button
                    onClick={() => navigate('/invoices/new')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    + Create Invoice
                </button>
            </div>

            {invoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px' }}>
                    <p>No invoices yet. Create your first invoice!</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Invoice #</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Client</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Due Date</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(invoice => (
                                <tr key={invoice._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{invoice.invoice_number}</td>
                                    <td style={{ padding: '1rem' }}>{invoice.client_name}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                                        ${invoice.total_amount.toFixed(2)}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        {getStatusBadge(invoice.status)}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        {invoice.status !== 'paid' && (
                                            <button
                                                onClick={() => markAsPaid(invoice._id)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Mark Paid
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Invoices;