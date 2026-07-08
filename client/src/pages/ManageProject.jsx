import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ProjectTasks from '../components/ProjectTasks';
import KanbanBoard from '../components/KanbanBoard';
import GanttChart from '../components/GanttChart';
import AIRecommendations from '../components/ai/AIRecommendations';
import { AlertTriangle, Sparkles } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ManageProject = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState(null);

  useEffect(() => {
    fetchProject();
    fetchRiskPrediction();
  }, [id]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProject(res.data.project || res.data);
    } catch (err) {
      console.error('Error loading project:', err);
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskPrediction = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/ai/projects/${id}/risk-prediction`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setRiskData(res.data.prediction);
      }
    } catch (err) {
      console.error('Error fetching risk prediction:', err);
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const getStatusStyle = (status) => {
    const map = {
      active: { bg: '#d1fae5', color: '#065f46', label: 'Active' },
      completed: { bg: '#dbeafe', color: '#1e40af', label: 'Completed' },
      on_hold: { bg: '#fef3c7', color: '#92400e', label: 'On Hold' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
      in_progress: { bg: '#fef3c7', color: '#92400e', label: 'In Progress' },
      review: { bg: '#e0e7ff', color: '#4338ca', label: 'In Review' },
      draft: { bg: '#f3f4f6', color: '#6b7280', label: 'Draft' }
    };
    return map[status] || { bg: '#f3f4f6', color: '#475569', label: status || 'Unknown' };
  };

  const progress = project?.progress || 0;
  const statusStyle = getStatusStyle(project?.status);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ margin: 0, color: '#6b7280' }}>Projects</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}>Manage Project</h1>
        </div>
        <Link to="/projects" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>← Back to projects</Link>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', background: '#fff', borderRadius: '16px', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)' }}>
          <div style={{ color: '#64748b' }}>Loading project details…</div>
        </div>
      ) : project ? (
        <>
          <div className="manage-project-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'clamp(1.5rem, 2vw, 2rem)' }}>{project.title || 'Untitled Project'}</h2>
                  <p style={{ margin: '0.5rem 0 0', color: '#475569', lineHeight: 1.6 }}>{project.description || 'No description available for this project.'}</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.55rem 0.9rem', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontWeight: 700, fontSize: '0.9rem' }}>
                  {statusStyle.label}
                </span>
              </div>

              <div className="manage-project-info-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Client</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{project.client_name || project.client_company || 'No Client'}</div>
                  {project.client_email && <div style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.9rem' }}>{project.client_email}</div>}
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Budget</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{project.budget ? formatCurrency(project.budget) : 'N/A'}</div>
                  <div style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.9rem' }}>{project.currency || 'USD'}</div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Due Date</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatDate(project.due_date)}</div>
                  <div style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.9rem' }}>{project.duration || 'Duration not set'}</div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Assigned Freelancer</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{project.selected_freelancer_name || 'Not assigned'}</div>
                  {project.freelancer_email && <div style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.9rem' }}>{project.freelancer_email}</div>}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <div className="project-progress-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#475569', fontWeight: 700 }}>Progress</span>
                  <span style={{ color: '#64748b' }}>{Math.min(Math.max(progress, 0), 100)}%</span>
                </div>
                <div style={{ width: '100%', height: '12px', borderRadius: '999px', background: '#e2e8f0' }}>
                  <div style={{ width: `${Math.min(Math.max(progress, 0), 100)}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #2563eb, #22c55e)' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)' }}>
                <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>Project Details</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#475569' }}>Project ID</strong>
                    <span style={{ color: '#0f172a' }}>{project._id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#475569' }}>Category</strong>
                    <span style={{ color: '#0f172a' }}>{project.category || 'General'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#475569' }}>Created</strong>
                    <span style={{ color: '#0f172a' }}>{formatDate(project.created_at || project.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#475569' }}>Last Updated</strong>
                    <span style={{ color: '#0f172a' }}>{formatDate(project.updated_at || project.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {riskData && (
                <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Sparkles size={18} style={{ color: '#7c3aed' }} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>AI Health & Risk</h3>
                  </div>
                  <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Delay Risk:</span>
                      <strong style={{ color: riskData.delayProbability === 'High' ? '#ef4444' : riskData.delayProbability === 'Medium' ? '#f59e0b' : '#10b981' }}>
                        {riskData.delayProbability}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Budget Overrun:</span>
                      <strong style={{ color: riskData.budgetOverrunRisk === 'High' ? '#ef4444' : '#10b981' }}>{riskData.budgetOverrunRisk}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: '8px', marginTop: '0.25rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#475569', marginBottom: '0.2rem' }}>AI Recovery Action Plan:</div>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                        {riskData.suggestedActions?.slice(0, 2).map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)' }}>
                <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>Additional Notes</h3>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.8 }}>{project.notes || 'No additional notes have been added for this project.'}</p>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Project Workspace</h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {['tasks', 'kanban', 'gantt', 'ai-recs'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setTab(option)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: tab === option ? '1px solid #2563eb' : '1px solid #e2e8f0',
                      background: tab === option ? '#eff6ff' : 'white',
                      color: '#0f172a',
                      cursor: 'pointer',
                      fontWeight: tab === option ? 700 : 500
                    }}
                  >
                    {option === 'tasks' ? 'Tasks' : option === 'kanban' ? 'Kanban' : option === 'gantt' ? 'Gantt' : 'AI Matchmaker'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              {tab === 'tasks' && <ProjectTasks projectId={id} />}
              {tab === 'kanban' && <KanbanBoard projectId={id} />}
              {tab === 'gantt' && <GanttChart projectId={id} />}
              {tab === 'ai-recs' && <AIRecommendations projectId={id} />}
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: '2rem', background: 'white', borderRadius: '16px', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)', color: '#ef4444' }}>
          Project not found or could not be loaded.
        </div>
      )}
    </div>
  );
};

export default ManageProject;
