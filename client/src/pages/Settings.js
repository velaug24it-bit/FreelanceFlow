import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Crown, CreditCard, User, Bell, Shield, ArrowRight } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/subscriptions/my-subscription', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(response.data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlanDisplay = () => {
    if (!user) return 'Free';
    const plan = user.subscription_tier;
    if (!plan || plan === 'free') return 'Free';
    if (plan === 'pro') return 'Pro';
    if (plan === 'business') return 'Business';
    return 'Free';
  };

  const getPlanColor = () => {
    const plan = getPlanDisplay();
    if (plan === 'Free') return '#fef3c7';
    if (plan === 'Pro') return '#d1fae5';
    if (plan === 'Business') return '#e0e7ff';
    return '#f3f4f6';
  };

  const getPlanTextColor = () => {
    const plan = getPlanDisplay();
    if (plan === 'Free') return '#92400e';
    if (plan === 'Pro') return '#065f46';
    if (plan === 'Business') return '#3730a3';
    return '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Settings</h1>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Profile Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <User size={24} color="#3b82f6" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Profile Information</h2>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Full Name</label>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>{user?.full_name || 'Not set'}</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</label>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>{user?.email || 'Not set'}</p>
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
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Subscription Plan</h2>
          </div>
          
          <div>
            <div style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              borderRadius: '20px',
              background: getPlanColor(),
              color: getPlanTextColor(),
              marginBottom: '1rem',
              fontWeight: '600'
            }}>
              {getPlanDisplay()} Plan
            </div>
            
            {getPlanDisplay() === 'Free' ? (
              <div>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  You are on the Free plan. Upgrade to Pro or Business for unlimited features.
                </p>
                <a
                  href="/subscription"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}
                >
                  View Plans
                  <ArrowRight size={16} />
                </a>
              </div>
            ) : (
              <div>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  Your {getPlanDisplay()} subscription is active. You have access to all premium features.
                </p>
                <a
                  href="/subscription"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}
                >
                  Manage Subscription
                  <ArrowRight size={16} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Bell size={24} color="#8b5cf6" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Notifications</h2>
          </div>
          <p style={{ color: '#6b7280' }}>Email notifications for invoices, payments, and reminders coming soon.</p>
        </div>

        {/* Security Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Shield size={24} color="#10b981" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Security</h2>
          </div>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
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