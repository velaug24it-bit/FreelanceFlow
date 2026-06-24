import React from 'react';

const ProfileProgress = ({ user }) => {
  if (!user) return null;

  const checks = [
    !!user.full_name,
    !!user.email,
    !!user.is_email_verified,
    !!user.avatar_url,
    !!user.bio,
    (user.skills || []).length > 0,
    !!user.hourly_rate
  ];

  const completed = checks.filter(Boolean).length;
  const total = checks.length;
  const percent = Math.round((completed / total) * 100);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: '#0f172a' }}>Profile Completion</div>
        <div style={{ fontWeight: 700, color: '#64748b' }}>{percent}%</div>
      </div>
      <div style={{ background: '#f1f5f9', height: 12, borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg,#34d399,#3b82f6)', borderRadius: 9999 }} />
      </div>
      <div style={{ marginTop: 8, color: '#64748b', fontSize: '0.85rem' }}>
        Complete your profile to attract more clients. Add bio, skills, and hourly rate.
      </div>
    </div>
  );
};

export default ProfileProgress;
