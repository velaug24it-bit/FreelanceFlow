import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, Crown, Star, Zap } from 'lucide-react';
import axios from 'axios';

const Pricing = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'forever',
      icon: Star,
      description: 'Perfect for getting started',
      features: [
        'Up to 5 clients',
        'Up to 10 projects',
        'Up to 20 invoices',
        'Basic client management',
        'Email support'
      ],
      color: 'gray',
      buttonText: 'Current Plan',
      buttonColor: '#6b7280'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 19,
      period: 'month',
      icon: Zap,
      description: 'For growing freelancers',
      popular: true,
      features: [
        'Up to 50 clients',
        'Up to 100 projects',
        'Up to 500 invoices',
        'Expense tracking',
        'Task board (Kanban)',
        'Advanced reports',
        'Priority email support'
      ],
      color: 'blue',
      buttonText: 'Upgrade to Pro',
      buttonColor: '#3b82f6'
    },
    {
      id: 'business',
      name: 'Business',
      price: 49,
      period: 'month',
      icon: Crown,
      description: 'For teams and agencies',
      features: [
        'Unlimited clients',
        'Unlimited projects',
        'Unlimited invoices',
        'Team member access',
        'API access',
        'White-label options',
        'Dedicated support',
        'Custom integrations'
      ],
      color: 'purple',
      buttonText: 'Upgrade to Business',
      buttonColor: '#8b5cf6'
    }
  ];

  const handleSubscribe = async (planId) => {
    if (planId === 'free') return;
    
    setLoading(planId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/subscription/create-checkout', 
        { planId, successUrl: window.location.origin + '/subscription/success', cancelUrl: window.location.origin + '/pricing' },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Subscription error:', err);
      alert('Failed to start subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planId) => {
    return user?.subscription_plan === planId;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
          Choose the plan that's right for your business. All plans include core features.
        </p>
      </div>

      {/* Pricing Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {plans.map(plan => {
          const Icon = plan.icon;
          const isCurrent = isCurrentPlan(plan.id);
          
          return (
            <div
              key={plan.id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: plan.popular ? '0 10px 40px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
                border: plan.popular ? `2px solid ${plan.buttonColor}` : '1px solid #e5e7eb',
                position: 'relative',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: plan.buttonColor,
                  color: 'white',
                  padding: '0.25rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  MOST POPULAR
                </div>
              )}
              
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: `${plan.buttonColor}20`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <Icon size={30} color={plan.buttonColor} />
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{plan.name}</h2>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{plan.description}</p>
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>${plan.price}</span>
                {plan.price > 0 && (
                  <span style={{ color: '#6b7280' }}>/{plan.period}</span>
                )}
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                {plan.features.map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <Check size={18} color="#10b981" />
                    <span style={{ fontSize: '0.875rem' }}>{feature}</span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id || isCurrent}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: isCurrent ? '#e5e7eb' : plan.buttonColor,
                  color: isCurrent ? '#6b7280' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isCurrent ? 'default' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  opacity: loading === plan.id ? 0.5 : 1
                }}
              >
                {loading === plan.id ? 'Processing...' : (isCurrent ? 'Current Plan' : plan.buttonText)}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div style={{
        background: '#f9fafb',
        borderRadius: '16px',
        padding: '2rem',
        marginTop: '2rem'
      }}>
        <h3 style={{ textAlign: 'center', marginBottom: '2rem' }}>Frequently Asked Questions</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Can I change plans anytime?</h4>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Yes, you can upgrade or downgrade at any time. Changes take effect immediately.</p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Is there a free trial?</h4>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Start with our Free plan and upgrade when you need more features.</p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>What payment methods do you accept?</h4>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>We accept all major credit cards via Stripe.</p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Can I cancel my subscription?</h4>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Yes, you can cancel anytime from your settings page.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;