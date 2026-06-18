import React, { useState } from 'react';
import RazorpayCheckoutButton from '../components/RazorpayCheckoutButton';

const RazorpayCheckout = () => {
  const [amount, setAmount] = useState(100);
  const amountInPaise = Math.max(100, Math.round(Number(amount) || 0));

  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Razorpay Checkout</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Create a Razorpay order and verify the payment signature with the backend.
      </p>

      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Amount in paise
        </label>
        <input
          type="number"
          min="100"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}
        />

        <RazorpayCheckoutButton
          amount={amountInPaise}
          currency="INR"
          receipt={`ff_${Date.now()}`}
          label={`Pay INR ${(amountInPaise / 100).toFixed(2)}`}
          description="FreelanceFlow Standard Checkout"
        />
      </div>
    </div>
  );
};

export default RazorpayCheckout;
