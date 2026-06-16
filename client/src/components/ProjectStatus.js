import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';

const ProjectStatus = ({ project, isOwner, isFreelancer, onStatusUpdate }) => {
    const [showHistory, setShowHistory] = useState(false);
    const [statusHistory, setStatusHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showStatusForm, setShowStatusForm] = useState(false);
    const [statusData, setStatusData] = useState({
        status: project.status || 'in_progress',
        progress: project.progress || 0,
        message: '',
        current_phase: project.current_phase || 'development'
    });

    useEffect(() => {
        if (showHistory) {
            fetchHistory();
        }
    }, [showHistory]);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/marketplace/projects/${project._id}/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatusHistory(response.data.history || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const handleStatusUpdate = async () => {
        if (!statusData.message) {
            alert('Please add a status update message');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`/api/marketplace/projects/${project._id}/status`, statusData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setShowStatusForm(false);
            setStatusData({
                status: 'in_progress',
                progress: 0,
                message: '',
                current_phase: 'development'
            });
            
            if (onStatusUpdate) {
                onStatusUpdate(response.data.project);
            }
            alert('Status updated successfully!');
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            open: '#3b82f6',
            in_progress: '#f59e0b',
            review: '#8b5cf6',
            completed: '#10b981',
            cancelled: '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    const getStatusLabel = (status) => {
        const labels = {
            open: 'Open for Bids',
            in_progress: 'In Progress',
            review: 'In Review',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        return labels[status] || status;
    };

    const getPhaseLabel = (phase) => {
        const labels = {
            planning: 'Planning',
            development: 'Development',
            testing: 'Testing',
            deployment: 'Deployment',
            completed: 'Completed'
        };
        return labels[phase] || phase;
    };

    const statusOptions = ['in_progress', 'review', 'completed'];
    const phaseOptions = ['planning', 'development', 'testing', 'deployment'];

    return (
        <div style={{
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '1rem',
            border: '1px solid #e5e7eb'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: getStatusColor(project.status),
                            marginRight: '0.5rem'
                        }} />
                        <span style={{ fontWeight: '600' }}>Status: {getStatusLabel(project.status)}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        Phase: {getPhaseLabel(project.current_phase || 'planning')}
                    </div>
                </div>
                
                <div style={{ flex: 1, minWidth: '150px', maxWidth: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                        <span>Progress</span>
                        <span>{project.progress || 0}%</span>
                    </div>
                    <div style={{
                        background: '#e5e7eb',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        height: '8px'
                    }}>
                        <div style={{
                            width: `${project.progress || 0}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '10px',
                            transition: 'width 0.3s'
                        }} />
                    </div>
                </div>

                {/* Update Status Button - ONLY for freelancers, NOT for owners/clients */}
                {isFreelancer && !isOwner && project.status !== 'completed' && project.status !== 'cancelled' && (
                    <button
                        onClick={() => setShowStatusForm(!showStatusForm)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Update Status
                    </button>
                )}

                {/* View History Button - Available to both client and freelancer */}
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showHistory ? 'Hide History' : 'View History'}
                </button>
            </div>

            {/* Status Update Form - Only visible to freelancers */}
            {showStatusForm && isFreelancer && !isOwner && (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Update Project Status</h4>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>Status</label>
                            <select
                                value={statusData.status}
                                onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px'
                                }}
                            >
                                {statusOptions.map(opt => (
                                    <option key={opt} value={opt}>{getStatusLabel(opt)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>Progress (%)</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={statusData.progress}
                                onChange={(e) => setStatusData({ ...statusData, progress: parseInt(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                            <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>{statusData.progress}%</div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>Phase</label>
                            <select
                                value={statusData.current_phase}
                                onChange={(e) => setStatusData({ ...statusData, current_phase: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px'
                                }}
                            >
                                {phaseOptions.map(phase => (
                                    <option key={phase} value={phase}>{getPhaseLabel(phase)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block' }}>Update Message</label>
                            <textarea
                                placeholder="Describe what was done..."
                                value={statusData.message}
                                onChange={(e) => setStatusData({ ...statusData, message: e.target.value })}
                                rows="2"
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={handleStatusUpdate}
                                disabled={loading}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    opacity: loading ? 0.5 : 1
                                }}
                            >
                                {loading ? 'Updating...' : 'Update Status'}
                            </button>
                            <button
                                onClick={() => setShowStatusForm(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status History - Visible to both client and freelancer */}
            {showHistory && (
                <div style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Status History</h4>
                    {statusHistory.length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No updates yet</p>
                    ) : (
                        statusHistory.slice().reverse().map((update, idx) => (
                            <div key={idx} style={{
                                padding: '0.75rem',
                                borderBottom: '1px solid #e5e7eb',
                                background: idx === 0 ? '#eff6ff' : 'transparent'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <p style={{ fontWeight: '500' }}>{update.message}</p>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280', flexWrap: 'wrap' }}>
                                            <span>Status: {getStatusLabel(update.status)}</span>
                                            <span>Progress: {update.progress}%</span>
                                            <span>By: {update.updated_by_name}</span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                        {new Date(update.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Freelancer Info - Visible to both */}
            {project.selected_freelancer_name && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: '#d1fae5',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#065f46'
                }}>
                    👨‍💻 Working with: {project.selected_freelancer_name}
                </div>
            )}
        </div>
    );
};

export default ProjectStatus;