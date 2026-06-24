import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { KeyRound, ArrowRight, CheckCircle } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`/api/auth/reset-password/${token}`, { password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
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
              Password Reset Complete
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Go to Login <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: '#1e293b',
              marginBottom: '0.5rem'
            }}>
              Set New Password
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '0.95rem',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              Please enter your new password below.
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
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#475569',
                  fontSize: '0.875rem'
                }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8'
                  }}>
                    <KeyRound size={18} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min 6 characters"
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

              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#475569',
                  fontSize: '0.875rem'
                }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8'
                  }}>
                    <KeyRound size={18} />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat password"
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
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3b82f6')}
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
