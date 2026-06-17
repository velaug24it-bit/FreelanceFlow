import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// API URL - uses environment variable or falls back to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

    // Verify token on mount
    useEffect(() => {
        if (token) {
            verifyToken();
        } else {
            setLoading(false);
        }
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await axios.get(`${API_URL}/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
        } catch (err) {
            console.error('Token verification failed:', err);
            // If token is invalid, clear it
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Login function
    const login = async (email, password) => {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });
            
            if (response.data.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                setToken(token);
                setUser(user);
                return { success: true, user };
            } else {
                return { success: false, error: 'Login failed' };
            }
        } catch (err) {
            console.error('Login error:', err);
            return { 
                success: false, 
                error: err.response?.data?.error || 'Invalid credentials' 
            };
        }
    };

    // Register function
    const register = async (userData) => {
        try {
            const response = await axios.post(`${API_URL}/auth/register`, userData);
            
            if (response.data.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                setToken(token);
                setUser(user);
                return { success: true, user };
            } else {
                return { success: false, error: 'Registration failed' };
            }
        } catch (err) {
            console.error('Registration error:', err);
            return { 
                success: false, 
                error: err.response?.data?.error || 'Registration failed' 
            };
        }
    };

    // Admin Login function
    const adminLogin = async (email, password) => {
        try {
            const response = await axios.post(`${API_URL}/auth/admin-login`, { email, password });
            
            if (response.data.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('isAdmin', 'true');
                setToken(token);
                setUser(user);
                return { success: true, user };
            } else {
                return { success: false, error: 'Admin login failed' };
            }
        } catch (err) {
            console.error('Admin login error:', err);
            return { 
                success: false, 
                error: err.response?.data?.error || 'Invalid admin credentials' 
            };
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    // Refresh user data
    const refreshUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await axios.get(`${API_URL}/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
        } catch (err) {
            console.error('Failed to refresh user:', err);
        }
    };

    const value = {
        user,
        loading,
        login,
        register,
        adminLogin,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        token
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;