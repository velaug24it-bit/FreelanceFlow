import React, { useState } from 'react';
import axios from 'axios';
import { CreditCard, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`)) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const RazorpayCheckoutButton = ({
  amount = 100,
  currency = 'INR',
  receipt,
  label = 'Pay with Razorpay',
  description = 'FreelanceFlow payment',
  onSuccess
}) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleCheckout = async () => {
    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window.Razorpay === 'undefined') {
        throw new Error('Unable to load Razorpay Checkout. Please try again.');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login before making a payment.');
      }

      const { data } = await axios.post('/api/create-order', {
        amount,
        currency,
        receipt
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const options = {
        key: data.key || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: 'FreelanceFlow',
        description,
        order_id: data.order_id,
        prefill: {
          name: user?.full_name || user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#3b82f6'
        },
        handler: async (response) => {
          try {
            const verifyRes = await axios.post('/api/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Payment verified successfully.' });
            if (onSuccess) {
              onSuccess(verifyRes.data);
            }
          } catch (err) {
            setMessage({
              type: 'error',
              text: err.response?.data?.error || 'Payment verification failed. Please contact support.'
            });
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setMessage({ type: 'error', text: 'Payment cancelled.' });
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (response) => {
        setProcessing(false);
        setMessage({
          type: 'error',
          text: response.error?.description || 'Payment failed. Please try again.'
        });
      });
      razorpayInstance.open();
    } catch (err) {
      setProcessing(false);
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to start payment.'
      });
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={processing}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: processing ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: processing ? 'not-allowed' : 'pointer',
          fontWeight: 600
        }}
      >
        {processing ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={18} />}
        {processing ? 'Processing...' : label}
      </button>

      {message.text && (
        <div
          style={{
            marginTop: '0.75rem',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.875rem'
          }}
        >
          {message.text}
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

export default RazorpayCheckoutButton;
