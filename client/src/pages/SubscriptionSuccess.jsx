import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Crown, CreditCard, User, Bell, Shield } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.get('/api/subscription/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const manageSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/subscription/create-portal', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Failed to open portal:', err);
      alert('Please contact support to manage your subscription');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Settings</h1>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Profile Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <User size={24} color="#3b82f6" />
            <h2 style={{ fontSize: '1.25rem' }}>Profile Information</h2>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Full Name</label>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>{user?.full_name}</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</label>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>{user?.email}</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Company</label>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>{user?.company_name || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Crown size={24} color="#f59e0b" />
            <h2 style={{ fontSize: '1.25rem' }}>Subscription Plan</h2>
          </div>
          
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div>
              <div style={{
                display: 'inline-block',
                padding: '0.25rem 1rem',
                borderRadius: '20px',
                background: user?.subscription_plan === 'free' ? '#fef3c7' : '#d1fae5',
                color: user?.subscription_plan === 'free' ? '#92400e' : '#065f46',
                marginBottom: '1rem'
              }}>
                {user?.subscription_plan === 'free' ? 'Free Plan' : `${user?.subscription_plan?.charAt(0).toUpperCase() + user?.subscription_plan?.slice(1)} Plan`}
              </div>
              
              {user?.subscription_plan === 'free' ? (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                        Upgrade to Pro for unlimited clients, projects, invoices, and premium features.
                  </p>
                  <a
                    href="/pricing"
                    style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      background: '#3b82f6',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '8px'
                    }}
                  >
                    View Plans
                  </a>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                    Your subscription is active. You have access to all premium features.
                  </p>
                  <button
                    onClick={manageSubscription}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <CreditCard size={16} />
                    Manage Subscription
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Bell size={24} color="#8b5cf6" />
            <h2 style={{ fontSize: '1.25rem' }}>Notifications</h2>
          </div>
          <p style={{ color: '#6b7280' }}>Email notifications for invoices, payments, and reminders coming soon.</p>
        </div>

        {/* Security Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Shield size={24} color="#10b981" />
            <h2 style={{ fontSize: '1.25rem' }}>Security</h2>
          </div>
          <button
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                alert('Please contact support to delete your account.');
              }
            }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;