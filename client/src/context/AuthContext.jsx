import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (err) {
      console.error('Token verification failed:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      if (response.data.require2FA) {
        return { success: true, require2FA: true, tempToken: response.data.tempToken, email: response.data.email };
      }
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    }
  };

  const loginWith2FA = async (tempToken, code) => {
    try {
      const response = await axios.post('/api/auth/verify-2fa', { tempToken, code });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || '2FA verification failed' };
    }
  };

  const socialLogin = async (socialData) => {
    try {
      const response = await axios.post('/api/auth/social-login', socialData);
      if (response.data.require2FA) {
        return { success: true, require2FA: true, tempToken: response.data.tempToken, email: response.data.email };
      }
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Social login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const resendVerification = async () => {
    try {
      const response = await axios.post('/api/auth/resend-verification', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return {
        success: true,
        message: response.data.message,
        previewUrl: response.data.previewUrl || null,   // Ethereal preview link (dev mode)
        verifyUrl: response.data.verifyUrl || null      // Direct app verification link
      };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Resend verification failed' };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Profile update failed' };
    }
  };

  const refreshUser = async () => {
    if (token) {
      await verifyToken();
    }
  };

  const handleOAuthSuccess = async (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    // Verify the token and load user data before returning
    // so the caller can await full authentication completion
    setLoading(true);
    try {
      const response = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      setUser(response.data.user);
    } catch (err) {
      console.error('OAuth token verification failed:', err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    loginWith2FA,
    socialLogin,
    register,
    logout,
    resendVerification,
    updateProfile,
    refreshUser,
    handleOAuthSuccess,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
  
};