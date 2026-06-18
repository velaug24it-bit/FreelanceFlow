// client/src/components/ProjectPayment.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle, Clock, AlertCircle, Loader, XCircle, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectPayment = ({ project, isClient, isFreelancer }) => {
  const { user } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    if (project?._id) {
      fetchPaymentDetails();
    }
  }, [project?._id]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        setRazorpayLoaded(true);
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        setRazorpayLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        setError('Failed to load payment system. Please refresh and try again.');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token || !project?._id) {
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching payment for project:', project._id);
      console.log('📊 Project payment_status:', project.payment_status);
      console.log('📊 Project release_requested:', project.release_requested);

      try {
        const response = await axios.get(`${API_URL}/payments/project/${project._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const paymentData = response.data.payment;
        setPayment(paymentData);

        // Check actual payment status from the payment record
        if (paymentData) {
          if (paymentData.status === 'completed') {
            setPaymentStatus('completed');
          } else if (paymentData.status === 'processing') {
            setPaymentStatus('processing');
          } else if (paymentData.status === 'pending') {
            setPaymentStatus('pending');
          }
        }

        console.log('📦 Payment record found:', paymentData);
      } catch (err) {
        if (err.response?.status === 404) {
          console.log('ℹ️ No payment record found');
          setPaymentStatus('pending');

          // If project says release_requested but no payment record exists,
          // automatically reset it
          if (project.release_requested) {
            console.log('🔄 Auto-resetting stuck payment status...');
            await autoResetPayment();
          }
        } else {
          console.error('Failed to fetch payment:', err);
        }
      }
    } catch (err) {
      console.error('Error in fetchPaymentDetails:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-reset function - called automatically when stuck
  const autoResetPayment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/payments/reset-payment/${project._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Auto-reset successful:', response.data);
      setPaymentStatus('pending');
      setError('');
      // Refresh the page data
      window.location.reload();
    } catch (err) {
      console.error('❌ Auto-reset failed:', err);
      // If auto-reset fails, show a manual reset button
      setError('Payment status is stuck. Click "Reset Payment" to try again.');
    }
  };

  const handleResetPayment = async () => {
    if (!window.confirm('Reset payment status? This will allow you to try again.')) {
      return;
    }

    setIsResetting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/payments/reset-payment/${project._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Payment reset:', response.data);
      alert('✅ Payment status reset! You can now try again.');
      window.location.reload();
    } catch (err) {
      console.error('❌ Failed to reset payment:', err);
      setError('Failed to reset payment. Please contact support.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleReleasePayment = async () => {
    const amount = project?.budget_max || 0;

    if (amount <= 0) {
      setError('Invalid project budget. Cannot process payment.');
      return;
    }

    const isClientUser = isClient || project?.client_id?._id === user?.id || project?.client_id === user?.id;
    if (!isClientUser) {
      setError('Only the client can release payment');
      return;
    }

    if (paymentStatus === 'completed') {
      setError('Payment has already been completed for this project');
      return;
    }

    if (!window.confirm(`Are you sure you want to release payment of ₹${amount} to the freelancer?`)) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      if (!razorpayLoaded) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Payment system failed to load. Please refresh and try again.');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Payment system is not available. Please refresh the page and try again.');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to make payment');
      }

      console.log('🔍 Requesting payment for project:', project._id);

      const { data } = await axios.post(
        `${API_URL}/payments/request-payment/${project._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('📦 Payment order created:', data);

      if (!data.orderId) {
        throw new Error('No order ID received from server');
      }

      if (!data.key) {
        throw new Error('Razorpay key not configured');
      }

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
          console.log('✅ Payment response:', response);
          try {
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

            console.log('✅ Verification response:', verifyRes.data);

            if (verifyRes.data.success) {
              setSuccess(true);
              setPaymentStatus('completed');
              setPayment(verifyRes.data.payment);
              alert('✅ Payment released successfully!');
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('❌ Verification error:', err);
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
      console.error('❌ Payment error:', err);
      console.error('❌ Error response:', err.response?.data);
      setError(err.response?.data?.error || err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = () => {
    const status = paymentStatus || 'pending';
    const badges = {
      pending: { color: '#f59e0b', text: 'Payment Pending', icon: Clock },
      processing: { color: '#3b82f6', text: 'Processing...', icon: Loader },
      completed: { color: '#10b981', text: 'Payment Completed ✓', icon: CheckCircle },
      failed: { color: '#ef4444', text: 'Payment Failed', icon: AlertCircle },
      refunded: { color: '#6b7280', text: 'Refunded', icon: XCircle }
    };
    return badges[status] || badges.pending;
  };

  if (!project || project.status !== 'completed') {
    return null;
  }

  const isClientUser = isClient || project?.client_id?._id === user?.id || project?.client_id === user?.id;
  const isFreelancerUser = isFreelancer || project?.selected_freelancer_id?._id === user?.id || project?.selected_freelancer_id === user?.id;

  if (!isClientUser && !isFreelancerUser) {
    return null;
  }

  const statusBadge = getStatusBadge();
  const isCompleted = paymentStatus === 'completed';
  const isStuck = project.release_requested && !payment && paymentStatus !== 'completed';

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
            ₹{project?.budget_max || 0}
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
                ₹{payment.net_amount || project?.budget_max || 0}
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
          Payment completed successfully! 🎉
        </div>
      )}

      {/* Show reset button if payment is stuck */}
      {isStuck && isClientUser && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            background: '#fef3c7',
            color: '#92400e',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} />
            Payment was requested but not completed. Click below to reset and try again.
          </div>
          <button
            onClick={handleResetPayment}
            disabled={isResetting}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: isResetting ? '#9ca3af' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isResetting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isResetting ? (
              <>
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Reset Payment Status
              </>
            )}
          </button>
        </div>
      )}

      {/* CLIENT VIEW */}
      {isClientUser && (
        <>
          {!isCompleted && !isStuck ? (
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
                  Release Payment ₹{project?.budget_max || 0}
                </>
              )}
            </button>
          ) : isCompleted ? (
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
              Payment Completed ✅
            </div>
          ) : null}
        </>
      )}

      {/* FREELANCER VIEW */}
      {isFreelancerUser && (
        <>
          {!isCompleted ? (
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
          ) : (
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
              Payment Received! 🎉
            </div>
          )}
        </>
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