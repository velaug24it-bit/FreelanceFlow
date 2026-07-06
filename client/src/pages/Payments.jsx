import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader, CheckCircle, Clock, AlertCircle, DollarSign, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Payments = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientPayments, setClientPayments] = useState([]);
  const [freelancerPayments, setFreelancerPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(${API_URL}/marketplace/payments/dashboard, {
        headers: { Authorization: \Bearer \\ }
      });
      if (res.data.success) {
        setClientPayments(res.data.asClient || []);
        setFreelancerPayments(res.data.asFreelancer || []);
      }
    } catch (err) {
      setError('Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: '#d1fae5', color: '#065f46', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}><CheckCircle size={12}/> Paid</span>;
      case 'payment_pending_verification':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}><Clock size={12}/> Pending Verification</span>;
      case 'failed':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}><AlertCircle size={12}/> Rejected</span>;
      default:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}><Clock size={12}/> Action Required</span>;
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }}/></div>;

  const totalEarnings = freelancerPayments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + (p.bid_amount || p.budget_max || 0), 0);
  const pendingEarnings = freelancerPayments.filter(p => p.payment_status === 'payment_pending_verification' || !p.payment_status || p.payment_status === 'pending').reduce((sum, p) => sum + (p.bid_amount || p.budget_max || 0), 0);

  const totalSpent = clientPayments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + (p.bid_amount || p.budget_max || 0), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1e293b' }}>Payments Dashboard</h1>

      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}

      {user?.role === 'freelancer' || user?.is_freelancer || freelancerPayments.length > 0 ? (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={24}/> Freelancer Earnings</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Earnings (Paid)</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>?{totalEarnings.toLocaleString()}</p>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Pending / Verification</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>?{pendingEarnings.toLocaleString()}</p>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>Payment History</h3>
            </div>
            <div style={{ padding: '0 1.5rem' }}>
              {freelancerPayments.length === 0 ? (
                <p style={{ padding: '1.5rem 0', color: '#64748b', textAlign: 'center' }}>No payments found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem 0', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Project</th>
                      <th style={{ padding: '1rem 0', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Client</th>
                      <th style={{ padding: '1rem 0', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Amount</th>
                      <th style={{ padding: '1rem 0', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Status</th>
                      <th style={{ padding: '1rem 0', textAlign: 'right', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {freelancerPayments.map(p => (
                      <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 0', fontWeight: '500' }}>{p.title}</td>
                        <td style={{ padding: '1rem 0', color: '#475569' }}>{p.client_id?.full_name || 'Unknown'}</td>
                        <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>?{(p.bid_amount || p.budget_max || 0).toLocaleString()}</td>
                        <td style={{ padding: '1rem 0' }}>{getStatusBadge(p.payment_status)}</td>
                        <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                          <Link to={\/manage-project/\\} style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: '600' }}>
                            View <ArrowRight size={14}/>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {(user?.role === 'client' || !user?.is_freelancer || clientPayments.length > 0) && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={24}/> Client Payments</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Spent</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>?{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>Payment History & Receipts</h3>
            </div>
            <div style={{ padding: '0 1.5rem' }}>
              {clientPayments.length === 0 ? (
                <p style={{ padding: '1.5rem 0', color: '#64748b', textAlign: 'center' }}>No payments found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem 0', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Project</th>
                      <th style={{ padding: '1rem 0', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Freelancer</th>
                      <th style={{ padding: '1rem 0', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Amount</th>
                      <th style={{ padding: '1rem 0', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Status</th>
                      <th style={{ padding: '1rem 0', textAlign: 'right', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientPayments.map(p => (
                      <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 0', fontWeight: '500' }}>{p.title}</td>
                        <td style={{ padding: '1rem 0', color: '#475569' }}>{p.selected_freelancer_id?.full_name || 'Unassigned'}</td>
                        <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>?{(p.bid_amount || p.budget_max || 0).toLocaleString()}</td>
                        <td style={{ padding: '1rem 0' }}>{getStatusBadge(p.payment_status)}</td>
                        <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                          <Link to={\/manage-project/\\} style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: '600' }}>
                            View <ArrowRight size={14}/>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
