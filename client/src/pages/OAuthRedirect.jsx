import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const OAuthRedirect = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { handleOAuthSuccess } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    const code = params.get('code');
    const state = params.get('state');

    if (token) {
      handleOAuthSuccess(token);
      navigate('/');
    } else if (code && state) {
      // Parse state to determine the social provider
      let provider = 'google';
      try {
        const decoded = atob(state).trim();
        if (decoded.includes('|')) {
          provider = decoded.split('|')[0];
        }
      } catch (e) {
        console.error('Error parsing OAuth state:', e);
      }
      // Redirect browser to server callback endpoint to exchange authorization code for JWT
      window.location.href = `${API_URL}/auth/${provider}/callback?code=${code}&state=${state}`;
    } else {
      navigate('/login');
    }
  }, [search, navigate, handleOAuthSuccess]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'radial-gradient(circle at top right, #e0f2fe 0%, #f8fafc 100%)',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ 
        textAlign: 'center', 
        padding: '2.5rem', 
        backgroundColor: 'white', 
        borderRadius: '16px', 
        boxShadow: '0 10px 25px -5px rgba(15,23,42,0.08)',
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #f3f4f6', 
          borderTopColor: '#3b82f6', 
          borderRadius: '50%', 
          margin: '0 auto 1.25rem', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontWeight: '700' }}>Completing Sign In</h3>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Setting up your secure session. Please wait...</p>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}} />
    </div>
  );
};

export default OAuthRedirect;
