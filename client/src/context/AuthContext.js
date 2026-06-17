import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// ============ CHANGE THIS URL ============
// Replace with your live backend URL
const API_URL = 'https://freelanceflow-server.onrender.com/api';

console.log('🔧 API URL:', API_URL);

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
        try {
            console.log('🔍 Verifying token...');
            const response = await axios.get(`${API_URL}/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
            console.log('✅ Token verified');
        } catch (err) {
            console.error('❌ Token verification failed:', err);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            console.log('🔑 Login attempt:', email);
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });
            
            if (response.data.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setToken(token);
                setUser(user);
                console.log('✅ Login successful');
                return { success: true, user };
            }
            return { success: false, error: 'Login failed' };
        } catch (err) {
            console.error('❌ Login error:', err);
            return { 
                success: false, 
                error: err.response?.data?.error || 'Invalid credentials' 
            };
        }
    };

    const register = async (userData) => {
        try {
            console.log('📝 Registration attempt:', userData.email);
            const response = await axios.post(`${API_URL}/auth/register`, userData);
            
            if (response.data.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setToken(token);
                setUser(user);
                console.log('✅ Registration successful');
                return { success: true, user };
            }
            return { success: false, error: 'Registration failed' };
        } catch (err) {
            console.error('❌ Registration error:', err);
            return { 
                success: false, 
                error: err.response?.data?.error || 'Registration failed' 
            };
        }
    };

    const adminLogin = async (email, password) => {
        try {
            console.log('👑 Admin login attempt:', email);
            const response = await axios.post(`${API_URL}/auth/admin-login`, { email, password });
            
            if (response.data.success) {
                const { token, user } = response.data;
                localStorage.setItem('token', token);
                localStorage.setItem('isAdmin', 'true');
                localStorage.setItem('user', JSON.stringify(user));
                setToken(token);
                setUser(user);
                console.log('✅ Admin login successful');
                return { success: true, user };
            }
            return { success: false, error: 'Admin login failed' };
        } catch (err) {
            console.error('❌ Admin login error:', err);
            return { 
                success: false, 
                error: err.response?.data?.error || 'Invalid admin credentials' 
            };
        }
    };

    const logout = () => {
        console.log('👋 Logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

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