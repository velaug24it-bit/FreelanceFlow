import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import { API_URL } from '../config/api';

const ProjectPayment = ({ project, isClient, isFreelancer }) => {
  const { user } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const contract = project.contract_details || {};
  const paymentStatus = project.payment_status || 'unpaid';
  const clientCharge = payment?.amount || contract.total_client_charge || contract.agreed_amount || project.budget || project.budget_max || 0;
  const freelancerReceives = payment?.net_amount || contract.agreed_amount || project.budget || project.budget_max || 0;
  const platformFee = payment?.fee || contract.client_fee || Math.max(clientCharge - freelancerReceives, 0);
  const freelancerPhone = payment?.freelancer_phone || project.freelancer_payment_phone;

  if (!project.budget && clientCharge) {
    project.budget = clientCharge;
  }

  useEffect(() => {
    if (project.payment_status) {
      fetchPaymentDetails();
    }
  }, [project._id]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/payments/project/${project._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayment(response.data.payment);
    } catch (err) {
      console.error('Failed to fetch payment details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleReleasePayment = async () => {
    if (!clientCharge || clientCharge <= 0) {
      setError('Payment amount is missing. Accept a valid bid before release.');
      return;
    }

    const amount = clientCharge;
    if (!window.confirm(`Are you sure you want to release payment of ₹${amount} to the freelancer?`)) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Load Razorpay script
      await loadRazorpayScript();
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Payment system is loading. Please try again.');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to make payment');
      }

      // Request payment
      const { data } = await axios.post(
        `${API_URL}/payments/request-payment/${project._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data.orderId) {
        throw new Error('No order ID received');
      }

      // Open Razorpay Checkout
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'FreelanceFlow',
        description: `Payment for project: ${project.title}`,
        order_id: data.orderId,
        prefill: {
          name: user?.full_name || 'Client',
          email: user?.email || 'client@example.com',
          contact: user?.phone || '9999999999'
        },
        theme: {
          color: '#667eea'
        },
        handler: async (response) => {
          try {
            // Verify payment
            const verifyRes = await axios.post(
              `${API_URL}/payments/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                projectId: project._id
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (verifyRes.data.success) {
              setSuccess(true);
              setPayment(verifyRes.data.payment);
              alert('✅ Payment released successfully!');
              // Refresh the page after 2 seconds
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('Verification error:', err);
            setError(err.response?.data?.error || 'Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = () => {
    const status = paymentStatus;
    const badges = {
      unpaid: { color: '#f59e0b', text: 'Payment Pending', icon: Clock },
      pending: { color: '#f59e0b', text: 'Payment Pending', icon: Clock },
      processing: { color: '#3b82f6', text: 'Processing...', icon: Loader },
      completed: { color: '#10b981', text: 'Payment Completed ✓', icon: CheckCircle },
      failed: { color: '#ef4444', text: 'Payment Failed', icon: AlertCircle },
      paid: { color: '#10b981', text: 'Payment Paid', icon: CheckCircle },
      refunded: { color: '#6b7280', text: 'Refunded', icon: AlertCircle }
    };
    return badges[status] || badges.pending;
  };

  // Check if user is client
  const getId = (value) => value?._id || value?.id || value;
  const isClientUser = isClient || getId(project.client_id)?.toString() === getId(user)?.toString();
  const canPay = isClientUser && ['unpaid', 'pending', 'failed'].includes(paymentStatus);

  // Don't show payment if project is not completed
  if (project.status !== 'completed') {
    return null;
  }

  const statusBadge = getStatusBadge();

  if (loading) {
    return (
      <div style={{
        marginTop: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        padding: '1rem',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>Loading payment details...</p>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '1.5rem',
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CreditCard size={20} color="#3b82f6" />
          <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Payment</h3>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          background: statusBadge.color + '20',
          color: statusBadge.color
        }}>
          <statusBadge.icon size={14} />
          <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{statusBadge.text}</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Client Pays</p>
          <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
            ₹{project.budget || 0}
          </p>
        </div>
        {payment && (
          <>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Platform Fee</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#6b7280' }}>
                -₹{payment.fee || 0}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Freelancer Receives</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10b981' }}>
                ₹{payment.net_amount || project.budget || 0}
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#d1fae5',
          color: '#065f46',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={18} />
          Payment completed successfully! Redirecting...
        </div>
      )}

      {/* Show appropriate button based on role and status */}
      {canPay && (
        <button
          onClick={handleReleasePayment}
          disabled={processing}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: processing ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
          onMouseEnter={(e) => {
            if (!processing) e.currentTarget.style.background = '#059669';
          }}
          onMouseLeave={(e) => {
            if (!processing) e.currentTarget.style.background = '#10b981';
          }}
        >
          {processing ? (
            <>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Release Payment ₹{project.budget || 0}
            </>
          )}
        </button>
      )}

      {isFreelancer && ['unpaid', 'pending', 'failed'].includes(paymentStatus) && (
        <div style={{
          textAlign: 'center',
          padding: '0.75rem',
          background: '#fef3c7',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <Clock size={16} />
          Waiting for client to release payment...
        </div>
      )}

      {['paid', 'completed'].includes(paymentStatus) && (
        <div style={{
          textAlign: 'center',
          padding: '0.75rem',
          background: '#d1fae5',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#065f46',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={16} />
          Payment released successfully on {project.payment_released_at ? new Date(project.payment_released_at).toLocaleDateString() : 'recently'}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProjectPayment;
