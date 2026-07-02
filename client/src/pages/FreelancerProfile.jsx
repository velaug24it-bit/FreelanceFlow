import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Award, Briefcase, DollarSign, ExternalLink, Flag, Heart, ShieldCheck, Star, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

if (!document.querySelector('style[data-freelancer-profile-responsive]')) {
  const s = document.createElement('style');
  s.setAttribute('data-freelancer-profile-responsive', 'true');
  s.textContent = `
    @media (max-width: 700px) {
      .freelancer-profile-hero {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .freelancer-profile-identity {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      .freelancer-profile-actions {
        width: 100% !important;
        justify-content: stretch !important;
      }
      .freelancer-profile-actions button {
        flex: 1 1 auto !important;
      }
    }
  `;
  document.head.appendChild(s);
}

const FreelancerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/marketplace/freelancers/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setProfile(res.data.freelancer);
    } catch (err) {
      setError(err.response?.data?.error || 'Freelancer profile not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(`${API_URL}/marketplace/favorites/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(prev => ({
        ...prev,
        social_proof: {
          ...(prev.social_proof || {}),
          is_favorited: res.data.is_favorited
        }
      }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update favorite');
    }
  };

  const reportTarget = async (target_type, target_id, target_label) => {
    const reason = window.prompt(`Report ${target_type}: briefly describe the issue`);
    if (!reason || !reason.trim()) return;

    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/marketplace/reports`, {
        target_type,
        target_id,
        target_label,
        reason: reason.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Report submitted for admin review.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit report');
    }
  };

  const getInitials = (name = '') => (
    name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2) || 'F'
  );

  const renderBadges = (badges = []) => {
    const config = {
      Verified: { Icon: ShieldCheck, bg: '#ecfdf5', color: '#047857' },
      'Top-Rated': { Icon: Award, bg: '#fff7ed', color: '#c2410c' },
      'Quick-Responder': { Icon: Zap, bg: '#eff6ff', color: '#2563eb' }
    };

    return badges.map(badge => {
      const item = config[badge] || config.Verified;
      const Icon = item.Icon;
      return (
        <span key={badge} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', borderRadius: '999px', background: item.bg, color: item.color, fontWeight: 700, fontSize: '0.78rem' }}>
          <Icon size={14} />
          {badge}
        </span>
      );
    });
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading profile...</div>;
  }

  if (error || !profile) {
    return (
      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: '1rem', padding: '0.6rem 0.9rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '2rem', textAlign: 'center', color: '#475569' }}>
          {error || 'Profile not found'}
        </div>
      </div>
    );
  }

  const proof = profile.social_proof || {};
  const availabilityLabel = profile.availability_status === 'busy' ? 'Busy' : profile.availability_status === 'away' ? 'Away' : 'Available now';
  const availabilityColor = profile.availability_status === 'busy' ? '#b45309' : profile.availability_status === 'away' ? '#64748b' : '#047857';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 'clamp(1rem, 2vw, 2rem)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem', padding: '0.6rem 0.9rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer', color: '#334155' }}>
          <ArrowLeft size={16} />
          Back
        </button>

        <section style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: 'clamp(1rem, 2vw, 1.5rem)', marginBottom: '1rem' }}>
          <div className="freelancer-profile-hero" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="freelancer-profile-identity" style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: 0 }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
              ) : (
                <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 800 }}>
                  {getInitials(profile.full_name)}
                </div>
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', color: '#0f172a' }}>{profile.full_name}</h1>
                <p style={{ margin: '0.25rem 0', color: '#64748b' }}>{profile.company_name || 'Independent freelancer'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', color: '#475569', fontSize: '0.9rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Star size={16} fill="#f59e0b" color="#f59e0b" />
                    <strong>{proof.average_rating ? proof.average_rating.toFixed(1) : 'New'}</strong>
                    {proof.reviews_count ? `(${proof.reviews_count} reviews)` : ''}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Briefcase size={16} />
                    {proof.completed_projects || 0} completed
                  </span>
                  {profile.hourly_rate > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <DollarSign size={16} />
                      {profile.hourly_rate}/hr
                    </span>
                  )}
                  <span style={{ color: availabilityColor, fontWeight: 700 }}>{availabilityLabel}</span>
                  <span>Responds within {profile.response_time_hours || 24}h</span>
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
                  {renderBadges(proof.badges)}
                </div>
              </div>
            </div>
            <div className="freelancer-profile-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={toggleFavorite} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.7rem 1rem', background: proof.is_favorited ? '#fee2e2' : '#eff6ff', color: proof.is_favorited ? '#dc2626' : '#2563eb', border: '1px solid #dbeafe', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                <Heart size={17} fill={proof.is_favorited ? '#dc2626' : 'none'} />
                {proof.is_favorited ? 'Favorited' : 'Favorite'}
              </button>
              <button onClick={() => reportTarget('profile', profile._id, profile.full_name)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.7rem 1rem', background: 'white', color: '#b45309', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                <Flag size={17} />
                Report
              </button>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <section style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: '#0f172a' }}>About</h2>
            <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{profile.bio || 'No bio added yet.'}</p>

            <h2 style={{ margin: '1.25rem 0 0.75rem', fontSize: '1.1rem', color: '#0f172a' }}>Reviews</h2>
            {profile.reviews?.length > 0 ? profile.reviews.map(review => (
              <div key={review._id} style={{ borderTop: '1px solid #e5e7eb', padding: '0.9rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <strong style={{ color: '#0f172a' }}>{review.reviewer_name}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{review.rating} stars</span>
                    <button onClick={() => reportTarget('review', review._id, `${review.reviewer_name} review`)} style={{ border: 'none', background: 'transparent', color: '#b45309', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} title="Report review">
                      <Flag size={14} />
                    </button>
                  </div>
                </div>
                {review.project_id?.title && <p style={{ margin: '0.2rem 0', color: '#64748b', fontSize: '0.84rem' }}>{review.project_id.title}</p>}
                <p style={{ margin: '0.35rem 0 0', color: '#334155' }}>{review.comment || 'No written comment.'}</p>
              </div>
            )) : (
              <p style={{ color: '#64748b' }}>No reviews yet.</p>
            )}
          </section>

          <aside style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
            <section style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: '#0f172a' }}>Skills</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {profile.skills?.length > 0 ? profile.skills.map(skill => (
                  <span key={skill} style={{ padding: '0.35rem 0.55rem', background: '#f1f5f9', color: '#334155', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>{skill}</span>
                )) : <p style={{ color: '#64748b' }}>No skills listed.</p>}
              </div>
            </section>

            <section style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: '#0f172a' }}>Portfolio</h2>
              {profile.portfolio_links?.length > 0 ? profile.portfolio_links.map(link => (
                <a key={link} href={link} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#2563eb', textDecoration: 'none', fontWeight: 700, marginBottom: '0.55rem', wordBreak: 'break-all' }}>
                  <ExternalLink size={15} />
                  {link}
                </a>
              )) : <p style={{ color: '#64748b' }}>No portfolio links added.</p>}
            </section>

            <section style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: '#0f172a' }}>Completed Work</h2>
              {profile.completed_projects?.length > 0 ? profile.completed_projects.map(project => (
                <div key={project._id} style={{ borderTop: '1px solid #e5e7eb', padding: '0.7rem 0' }}>
                  <strong style={{ color: '#0f172a' }}>{project.title}</strong>
                  <p style={{ margin: '0.15rem 0 0', color: '#64748b', fontSize: '0.84rem' }}>{project.category}</p>
                </div>
              )) : <p style={{ color: '#64748b' }}>No completed marketplace projects yet.</p>}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default FreelancerProfile;
