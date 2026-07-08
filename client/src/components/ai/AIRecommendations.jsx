import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Award, AwardIcon, TrendingUp, Sparkles, MessageCircle, DollarSign } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AIRecommendations = ({ projectId }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, [projectId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_URL}/ai/projects/${projectId}/recommendations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setRecommendations(res.data.recommendations || []);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Could not load AI recommendations at this time.');
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (pct) => {
    if (pct >= 85) return '#10b981'; // Green
    if (pct >= 70) return '#f59e0b'; // Amber
    return '#64748b'; // Slate
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Sparkles style={{ color: '#4f46e5' }} />
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>AI Matchmaker Recommendations</h3>
      </div>

      {loading ? (
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', color: '#64748b', fontSize: '0.95rem' }}>
          Finding matches on platform database and computing match percentages...
        </div>
      ) : error ? (
        <div style={{ padding: '1.5rem', background: '#fef2f2', borderRadius: '16px', color: '#ef4444', fontSize: '0.95rem' }}>
          {error}
        </div>
      ) : recommendations.length === 0 ? (
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', color: '#64748b', fontSize: '0.95rem' }}>
          No compatible freelancer profiles found matching this project requirements. Try updating the project required skills list.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {recommendations.map((rec) => (
            <div
              key={rec.freelancerId}
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '1.5rem',
                alignItems: 'center',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(15, 23, 42, 0.04)';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, 0.02)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              {/* Profile Image / Initials */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  overflow: 'hidden'
                }}
              >
                {rec.avatar ? (
                  <img src={rec.avatar} alt={rec.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  rec.name.charAt(0)
                )}
              </div>

              {/* Freelancer details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{rec.name}</h4>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
                    <Star size={14} fill="#f59e0b" />
                    {rec.rating}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    ({rec.completedProjectsCount} completed projects)
                  </span>
                </div>
                <p style={{ margin: '0.5rem 0 0.75rem', fontSize: '0.875rem', color: '#475569', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {rec.bio || 'Professional platform freelancer.'}
                </p>

                {/* Skills tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {rec.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: '#f1f5f9',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#475569',
                        fontWeight: 500
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* AI generated reasons */}
                {rec.recommendationReason && (
                  <div style={{ marginTop: '0.9rem', padding: '0.85rem 1rem', background: '#eff6ff', borderRadius: '12px', borderLeft: '3px solid #3b82f6', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <Sparkles size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.825rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                      <strong>AI Match Logic:</strong> {rec.recommendationReason}
                    </div>
                  </div>
                )}
              </div>

              {/* Match score & rate */}
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: getMatchColor(rec.matchPercentage),
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '2px'
                  }}
                >
                  {rec.matchPercentage}%
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>match</span>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem', display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={14} style={{ color: '#64748b' }} />
                  {rec.hourlyRate}/hr
                </div>
                <button
                  onClick={() => alert(`Invitation message sent to ${rec.name}!`)}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Invite to project
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
