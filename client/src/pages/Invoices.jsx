import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trash2, Eye, CheckCircle, AlertCircle, Plus, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to view invoices');
                setLoading(false);
                return;
            }

            console.log('🔍 Fetching invoices...');
            const response = await axios.get(`${API_URL}/invoices`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📦 Invoices response:', response.data);

            // Handle different response formats
            let invoicesData = [];
            if (response.data) {
                if (Array.isArray(response.data)) {
                    invoicesData = response.data;
                } else if (response.data.invoices && Array.isArray(response.data.invoices)) {
                    invoicesData = response.data.invoices;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    invoicesData = response.data.data;
                }
            }

            console.log('📋 Processed invoices:', invoicesData);
            setInvoices(invoicesData);
        } catch (err) {
            console.error('❌ Failed to fetch invoices:', err);
            setError(err.response?.data?.error || 'Failed to load invoices');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchInvoices();
    };

    const markAsPaid = async (id) => {
        if (!window.confirm('Mark this invoice as paid?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/invoices/${id}/status`,
                { status: 'paid' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('✅ Invoice marked as paid!');
            fetchInvoices();
        } catch (err) {
            console.error('Failed to mark as paid:', err);
            alert('Failed to mark invoice as paid');
        }
    };

    const deleteInvoice = async (id) => {
        if (!window.confirm('Are you sure you want to delete this invoice?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/invoices/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('✅ Invoice deleted successfully!');
            fetchInvoices();
        } catch (err) {
            console.error('Failed to delete invoice:', err);
            alert('Failed to delete invoice');
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            paid: { bg: '#d1fae5', color: '#065f46', icon: CheckCircle, label: 'Paid' },
            pending: { bg: '#fef3c7', color: '#92400e', icon: AlertCircle, label: 'Pending' },
            overdue: { bg: '#fee2e2', color: '#991b1b', icon: AlertCircle, label: 'Overdue' },
            draft: { bg: '#f3f4f6', color: '#6b7280', icon: AlertCircle, label: 'Draft' }
        };
        return statusMap[status] || statusMap.pending;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading invoices...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '0.5rem' }}>Invoices</h1>
                    <p style={{ color: '#6b7280', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Manage your invoices and track payments</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: 'clamp(0.4rem, 2vw, 0.5rem) clamp(0.75rem, 3vw, 1rem)',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            opacity: refreshing ? 0.5 : 1,
                            fontSize: 'clamp(0.8rem, 2vw, 0.9rem)'
                        }}
                    >
                        <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                        <span className="mobile-hidden">Refresh</span>
                    </button>
                    <button
                        onClick={() => navigate('/invoices/new')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: 'clamp(0.4rem, 2vw, 0.5rem) clamp(1rem, 3vw, 1.5rem)',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            fontSize: 'clamp(0.8rem, 2vw, 0.9rem)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                    >
                        <Plus size={16} />
                        Create Invoice
                    </button>
                </div>
            </div>

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

            {invoices.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem)',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: '1rem' }}>📄</div>
                    <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', color: '#1f2937', marginBottom: '0.5rem' }}>No invoices yet</h3>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Create your first invoice to get started</p>
                    <button
                        onClick={() => navigate('/invoices/new')}
                        style={{
                            padding: '0.75rem 2rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                    >
                        + Create your first invoice
                    </button>
                </div>
            ) : (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'left' }}>Invoice #</th>
                                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'left' }} className="mobile-hidden">Client</th>
                                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'right' }}>Amount</th>
                                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'left' }} className="mobile-hidden">Due Date</th>
                                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(invoice => {
                                    const statusBadge = getStatusBadge(invoice.status);
                                    const StatusIcon = statusBadge.icon;
                                    const clientName = invoice.client_id?.contact_name ||
                                        invoice.client_name ||
                                        'Unknown Client';

                                    return (
                                        <tr key={invoice._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', fontWeight: '500' }}>
                                                {invoice.invoice_number || 'INV-001'}
                                            </td>
                                            <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)' }} className="mobile-hidden">
                                                {clientName}
                                            </td>
                                            <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'right', fontWeight: '600' }}>
                                                {formatCurrency(invoice.total_amount || 0)}
                                            </td>
                                            <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)' }} className="mobile-hidden">
                                                {formatDate(invoice.due_date)}
                                            </td>
                                            <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '20px',
                                                    background: statusBadge.bg,
                                                    color: statusBadge.color,
                                                    fontSize: '0.75rem'
                                                }}>
                                                    <StatusIcon size={14} />
                                                    {statusBadge.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {invoice.status !== 'paid' && (
                                                        <button
                                                            onClick={() => markAsPaid(invoice._id)}
                                                            style={{
                                                                padding: 'clamp(0.3rem, 1.5vw, 0.35rem) clamp(0.5rem, 2vw, 0.75rem)',
                                                                background: '#10b981',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                                                        >
                                                            <CheckCircle size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteInvoice(invoice._id)}
                                                        style={{
                                                            padding: 'clamp(0.3rem, 1.5vw, 0.35rem) clamp(0.5rem, 2vw, 0.75rem)',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{
                        padding: '1rem',
                        background: '#f9fafb',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.875rem',
                        color: '#6b7280'
                    }}>
                        <span>Showing {invoices.length} invoice(s)</span>
                        <button
                            onClick={handleRefresh}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Invoices;