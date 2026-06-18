import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/admin-login', { email, password });
      
      if (response.data.success) {
        // Store everything needed
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('isAdmin', 'true');
        
        // Navigate to admin dashboard
        navigate('/admin-dashboard');
      } else {
        setError('Admin access required');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '70px',
            height: '70px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Shield size={35} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Admin Login</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Access the admin dashboard to manage all companies</p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Admin Email
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '10px', padding: '0.5rem 1rem' }}>
              <Mail size={18} color="#9ca3af" />
              <input
                type="email"
                placeholder="admin@freelanceflow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  marginLeft: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
              Password
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '10px', padding: '0.5rem 1rem' }}>
              <Lock size={18} color="#9ca3af" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  marginLeft: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Logging in...' : 'Login as Admin'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/login" style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to User Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;