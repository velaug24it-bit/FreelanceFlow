import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, Mail, AlertCircle, ArrowLeft, Github } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [socialModal, setSocialModal] = useState(null); // 'google', 'github', or null
  const [socialLoading, setSocialLoading] = useState(false);

  const { login, loginWith2FA, socialLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      if (result.require2FA) {
        setShow2FA(true);
        setTempToken(result.tempToken);
      } else {
        navigate('/');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await loginWith2FA(tempToken, otpCode);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleSocialClick = (provider) => {
    setSocialModal(provider);
  };

  const executeSocialLogin = async (mockEmail, mockName) => {
    setSocialLoading(true);
    setError('');

    const result = await socialLogin({
      email: mockEmail,
      full_name: mockName,
      provider: socialModal,
      provider_id: `${socialModal}-${Date.now()}`,
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${mockName}`
    });

    setSocialLoading(false);
    setSocialModal(null);

    if (result.success) {
      if (result.require2FA) {
        setShow2FA(true);
        setTempToken(result.tempToken);
      } else {
        navigate('/');
      }
    } else {
      setError(result.error);
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
        maxWidth: '420px',
        border: '1px solid #f1f5f9'
      }}>
        
        {/* Logo or Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '0.75rem',
            backgroundColor: '#eff6ff',
            color: '#3b82f6',
            borderRadius: '12px',
            marginBottom: '0.75rem'
          }}>
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
            {show2FA ? 'Two-Factor Verification' : 'Welcome back'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {show2FA ? 'Enter your authenticator code to proceed' : 'Log in to manage your freelance business'}
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: '1px solid #fecaca'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {show2FA ? (
          /* ========================================================
             2FA CODE VIEW
             ======================================================== */
          <form onSubmit={handle2FASubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>
                Authenticator Code
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <KeyRound size={18} />
                </span>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '1.125rem',
                    letterSpacing: '0.25em',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
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
                opacity: loading ? 0.6 : 1,
                transition: 'background-color 0.2s',
                marginBottom: '1rem'
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Log in'}
            </button>

            <button
              type="button"
              onClick={() => { setShow2FA(false); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                width: '100%',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          </form>
        ) : (
          /* ========================================================
             STANDARD LOGIN VIEW
             ======================================================== */
          <>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: '600', color: '#475569', fontSize: '0.875rem' }}>
                    Password
                  </label>
                  <Link to="/forgot-password" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: '600' }}>
                    Forgot Password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <KeyRound size={18} />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
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
                  opacity: loading ? 0.6 : 1,
                  transition: 'background-color 0.2s',
                  marginTop: '0.5rem'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#3b82f6')}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            
            {/* Social Logins divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <span style={{ padding: '0 0.75rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>

            {/* Social login buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {/* Google Button */}
              <button
                type="button"
                onClick={() => handleSocialClick('google')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#334155',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google
              </button>

              {/* GitHub Button */}
              <button
                type="button"
                onClick={() => handleSocialClick('github')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#334155',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                <Github size={18} />
                GitHub
              </button>
            </div>
            
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.875rem' }}>
              Don't have an account? <Link to="/register" style={{ color: '#3b82f6', fontWeight: '600', textDecoration: 'none' }}>Register</Link>
            </p>
          </>
        )}

        {/* Admin Login Link */}
        <div style={{ 
          marginTop: '1.5rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid #f1f5f9',
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
              fontSize: '0.8125rem',
              fontWeight: '600'
            }}
          >
            <Shield size={14} />
            Admin Login
          </Link>
        </div>
      </div>

      {/* ========================================================
         SIMULATED OAUTH MODAL OVERLAY
         ======================================================== */}
      {socialModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '380px',
            padding: '2rem',
            border: '1px solid #f1f5f9',
            textAlign: 'center',
            animation: 'scaleIn 0.2s ease-out'
          }}>
            {socialLoading ? (
              <div style={{ padding: '2rem 0' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #f3f4f6',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  margin: '0 auto 1rem',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <h4 style={{ fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Connecting to {socialModal === 'google' ? 'Google' : 'GitHub'}...</h4>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Authorizing credentials securely.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                  {socialModal === 'google' ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                  ) : (
                    <Github size={32} />
                  )}
                  <div style={{ height: '20px', width: '1px', backgroundColor: '#cbd5e1' }}></div>
                  <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b' }}>FreelanceFlow</span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Sign in with {socialModal === 'google' ? 'Google' : 'GitHub'}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Select an account to authorize access to FreelanceFlow.
                </p>

                {/* Account selections */}
                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {/* Account 1 */}
                  <button
                    onClick={() => executeSocialLogin('velr012006@gmail.com', 'Velraj')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  >
                    <img
                      src="https://api.dicebear.com/7.x/adventurer/svg?seed=Velraj"
                      alt="Avatar"
                      style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem', color: '#1e293b' }}>Velraj</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>velr012006@gmail.com</p>
                    </div>
                  </button>

                  {/* Account 2 */}
                  <button
                    onClick={() => executeSocialLogin('john.developer@github.com', 'John Dev')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  >
                    <img
                      src="https://api.dicebear.com/7.x/adventurer/svg?seed=John%20Dev"
                      alt="Avatar"
                      style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem', color: '#1e293b' }}>John Dev</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>john.developer@github.com</p>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setSocialModal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global CSS animations injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scaleIn {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default Login;