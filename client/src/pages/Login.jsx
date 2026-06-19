import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: 'clamp(1.5rem, 4vw, 2rem)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '1.5rem', 
          color: '#1f2937',
          fontSize: 'clamp(1.25rem, 4vw, 1.5rem)'
        }}>
          Login to FreelanceFlow
        </h2>
        
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              fontSize: 'clamp(0.875rem, 2vw, 1rem)'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 'clamp(0.75rem, 2vw, 0.875rem)',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3b82f6')}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <p style={{ 
          textAlign: 'center', 
          marginTop: '1rem', 
          color: '#6b7280',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)'
        }}>
          Don't have an account? <Link to="/register" style={{ color: '#3b82f6', fontWeight: '600', textDecoration: 'none' }}>Register</Link>
        </p>
        
        {/* Admin Login Link */}
        <div style={{ 
          marginTop: '1.5rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <Link 
            to="/admin-login" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#8b5cf6',
              textDecoration: 'none',
              fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
              fontWeight: '500'
            }}
          >
            <Shield size={16} />
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;