import React from 'react';
import { Crown, ArrowRight } from 'lucide-react';

const UpgradePrompt = ({ current, limit, resourceType, plan }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '1rem 1.5rem',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '0.5rem',
          borderRadius: '50%'
        }}>
          <Crown size={24} color="white" />
        </div>
        <div>
          <p style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem' }}>
            {plan === 'free' ? 'Free Plan Limit Reached' : `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Limit`}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>
            You've used {current} out of {limit} {resourceType}. Upgrade to add more.
          </p>
        </div>
      </div>
      
      <a
        href="/pricing"
        style={{
          background: 'white',
          color: '#667eea',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '500'
        }}
      >
        Upgrade Plan
        <ArrowRight size={16} />
      </a>
    </div>
  );
};

export default UpgradePrompt;