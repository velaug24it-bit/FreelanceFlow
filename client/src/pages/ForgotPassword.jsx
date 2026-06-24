import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      setMessage(response.data.message);
      setSuccess(true);
      if (response.data.previewUrl) setPreviewUrl(response.data.previewUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      background: 'radial-gradient(circle at top right, #e0f2fe 0%, #f8fafc 100%)'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03)',
        width: '100%',
        maxWidth: '440px',
        border: '1px solid #f1f5f9'
      }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              padding: '1rem',
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              color: '#10b981',
              marginBottom: '1.5rem'
            }}>
              <CheckCircle size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '0.75rem', fontWeight: '700' }}>
              Reset Link Sent
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              We have sent password reset instructions to <strong>{email}</strong>. Please check your inbox (and spam folder).
            </p>
            
            {/* Dev Mode Link Indicator */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fcd34d',
              color: '#92400e',
              fontSize: '0.85rem',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              {previewUrl ? (
                <>
                  📬 <strong>Dev Mode:</strong> SMTP not configured. &nbsp;
                  <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: '#b45309', fontWeight: '700' }}>
                    Click here to preview the reset email
                  </a>
                </>
              ) : (
                <>💡 <strong>Dev Mode Info:</strong> Since this is a local setup, if SMTP is not configured, the reset link is printed in your server logs.</>
              )}
            </div>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#3b82f6',
                fontWeight: '600',
                textDecoration: 'none',
                fontSize: '0.95rem'
              }}
            >
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        ) : (
          <div>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                fontWeight: '500',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
              onMouseLeave={(e) => e.target.style.color = '#64748b'}
            >
              <ArrowLeft size={16} /> Back to Login
            </Link>

            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: '#1e293b',
              marginBottom: '0.5rem'
            }}>
              Forgot Password?
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '0.95rem',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                border: '1px solid #fecaca'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#475569',
                  fontSize: '0.875rem'
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8'
                  }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: loading ? 0.6 : 1,
                  transition: 'background-color 0.2s, transform 0.1s'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3b82f6')}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
                {!loading && <Send size={16} />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
