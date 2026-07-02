import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, ArrowLeft, Ban, CheckCircle, Flag, RefreshCw, Shield, UserX } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

if (!document.querySelector('style[data-admin-moderation-responsive]')) {
  const s = document.createElement('style');
  s.setAttribute('data-admin-moderation-responsive', 'true');
  s.textContent = `
    @media (max-width: 760px) {
      .moderation-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .moderation-grid {
        grid-template-columns: 1fr !important;
      }
      .moderation-report {
        grid-template-columns: 1fr !important;
      }
      .moderation-actions {
        justify-content: stretch !important;
      }
      .moderation-actions button,
      .moderation-actions select {
        flex: 1 1 auto !important;
      }
    }
  `;
  document.head.appendChild(s);
}

const AdminModeration = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState({});
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({});
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchModeration = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, reportsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/moderation/overview`, getHeaders()),
        axios.get(`${API_URL}/admin/moderation/reports?status=${status}`, getHeaders())
      ]);
      setOverview(overviewRes.data || {});
      setReports(reportsRes.data.reports || []);
      setSummary(reportsRes.data.summary || {});
    } catch (err) {
      console.error('Failed to fetch moderation data:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/admin-login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, status]);

  useEffect(() => {
    fetchModeration();
  }, [fetchModeration]);

  const updateReport = async (reportId, nextStatus) => {
    try {
      await axios.patch(`${API_URL}/admin/moderation/reports/${reportId}`, {
        status: nextStatus
      }, getHeaders());
      fetchModeration();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update report');
    }
  };

  const updateUserModeration = async (userId, moderation_status) => {
    if (!userId) return;
    try {
      await axios.patch(`${API_URL}/admin/users/${userId}/moderation`, {
        moderation_status
      }, getHeaders());
      alert(`User marked as ${moderation_status}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user');
    }
  };

  const statCards = [
    ['Open Reports', overview.openReports || 0, Flag, '#2563eb'],
    ['Projects', overview.reportedProjects || 0, AlertTriangle, '#b45309'],
    ['Profiles', overview.reportedProfiles || 0, Shield, '#7c3aed'],
    ['Bids', overview.reportedBids || 0, Ban, '#dc2626'],
    ['Reviews', overview.reportedReviews || 0, CheckCircle, '#047857'],
    ['Disputes', overview.reportedDisputes || 0, UserX, '#475569']
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 'clamp(1rem, 2vw, 2rem)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="moderation-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <button onClick={() => navigate('/admin-dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.8rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#334155', marginBottom: '0.8rem' }}>
              <ArrowLeft size={16} />
              Admin Dashboard
            </button>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0f172a' }}>Moderation</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b' }}>Review reported projects, profiles, bids, reviews, disputes, and user status.</p>
          </div>
          <button onClick={fetchModeration} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.7rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="moderation-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {statCards.map(([label, value, Icon, color]) => (
            <div key={label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color }}>
                <Icon size={18} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{label}</span>
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{value}</p>
            </div>
          ))}
        </div>

        <section style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
          <div className="moderation-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Reports</h2>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
              <option value="all">All ({Object.values(summary).reduce((a, b) => a + b, 0) || reports.length})</option>
              <option value="open">Open ({summary.open || 0})</option>
              <option value="reviewing">Reviewing ({summary.reviewing || 0})</option>
              <option value="resolved">Resolved ({summary.resolved || 0})</option>
              <option value="dismissed">Dismissed ({summary.dismissed || 0})</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading reports...</div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No reports found.</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {reports.map(report => (
                <div key={report._id} className="moderation-report" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 800 }}>{report.target_type}</span>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 800 }}>{report.status}</span>
                    </div>
                    <h3 style={{ margin: '0.5rem 0 0.25rem', color: '#0f172a', fontSize: '1rem' }}>{report.target_label || report.target_id}</h3>
                    <p style={{ margin: 0, color: '#334155' }}>{report.reason}</p>
                    {report.details && <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>{report.details}</p>}
                    <p style={{ margin: '0.45rem 0 0', color: '#94a3b8', fontSize: '0.78rem' }}>Reported by {report.reporter_name} on {new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="moderation-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button onClick={() => updateReport(report._id, 'reviewing')} style={{ padding: '0.5rem 0.75rem', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>Review</button>
                    <button onClick={() => updateReport(report._id, 'resolved')} style={{ padding: '0.5rem 0.75rem', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#047857', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>Resolve</button>
                    <button onClick={() => updateReport(report._id, 'dismissed')} style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', background: 'white', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>Dismiss</button>
                    <select onChange={(e) => updateUserModeration(report.reporter_id?._id || report.reporter_id, e.target.value)} defaultValue="" style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <option value="" disabled>Reporter status</option>
                      <option value="active">Active</option>
                      <option value="flagged">Flagged</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                    </select>
                    {report.target_type === 'profile' && (
                      <select onChange={(e) => updateUserModeration(report.target_id, e.target.value)} defaultValue="" style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                        <option value="" disabled>Profile status</option>
                        <option value="active">Active</option>
                        <option value="flagged">Flagged</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminModeration;
