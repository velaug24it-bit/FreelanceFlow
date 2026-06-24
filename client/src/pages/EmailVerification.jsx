import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, CheckCircle, XCircle, ArrowRight, Loader } from 'lucide-react';

const EmailVerification = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await axios.post(`/api/auth/verify-email/${token}`);
        if (response.data.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage('Could not verify email.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(err.response?.data?.error || 'Verification link is invalid or has expired.');
      }
    };

    if (token) {
      verifyToken();
    } else {
      setStatus('error');
      setErrorMessage('Missing verification token.');
    }
  }, [token]);

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
        border: '1px solid #f1f5f9',
        textAlign: 'center'
      }}>
        {status === 'verifying' && (
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '1rem',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#3b82f6',
              marginBottom: '1.5rem',
              animation: 'pulse 2s infinite'
            }}>
              <Loader size={32} style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '0.75rem', fontWeight: '700' }}>
              Verifying Email...
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Please wait while we verify your email address.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
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
              Email Verified!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Thank you for verifying your email address. Your account is now fully active.
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
        )}

        {status === 'error' && (
          <div>
            <div style={{
              display: 'inline-flex',
              padding: '1rem',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              marginBottom: '1.5rem'
            }}>
              <XCircle size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '0.75rem', fontWeight: '700' }}>
              Verification Failed
            </h2>
            <p style={{ color: '#dc2626', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem', fontWeight: '500' }}>
              {errorMessage}
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
                backgroundColor: '#64748b',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#475569'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#64748b'}
            >
              Go to Login
            </Link>
          </div>
        )}

        {/* Global style injection for loader animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    </div>
  );
};

export default EmailVerification;
