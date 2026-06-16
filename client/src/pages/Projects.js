import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trash2, Edit2, Eye, AlertTriangle, Check, X } from 'lucide-react';

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/projects', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProjects(response.data.projects || []);
            setError('');
        } catch (err) {
            console.error('Failed to fetch projects:', err);
            setError('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (project) => {
        setSelectedProject(project);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedProject) return;
        
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`/api/projects/${selectedProject._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                setProjects(projects.filter(p => p._id !== selectedProject._id));
                setShowDeleteModal(false);
                setSelectedProject(null);
                alert('Project deleted successfully!');
            }
        } catch (err) {
            console.error('Failed to delete project:', err);
            if (err.response?.data?.hasInvoices) {
                alert(`Cannot delete project. It has ${err.response.data.invoiceCount} invoice(s). Please delete the invoices first.`);
            } else {
                alert(err.response?.data?.error || 'Failed to delete project');
            }
        } finally {
            setDeleting(false);
        }
    };

    const handleSelectProject = (projectId) => {
        setSelectedProjects(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId);
            } else {
                return [...prev, projectId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedProjects.length === projects.length) {
            setSelectedProjects([]);
        } else {
            setSelectedProjects(projects.map(p => p._id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedProjects.length === 0) {
            alert('Please select at least one project to delete');
            return;
        }
        
        if (!window.confirm(`Are you sure you want to delete ${selectedProjects.length} project(s)? This action cannot be undone.`)) {
            return;
        }
        
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete('/api/projects/bulk-delete', {
                data: { projectIds: selectedProjects },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                setProjects(projects.filter(p => !selectedProjects.includes(p._id)));
                setSelectedProjects([]);
                setShowBulkDelete(false);
                alert(response.data.message);
            }
        } catch (err) {
            console.error('Failed to delete projects:', err);
            alert(err.response?.data?.error || 'Failed to delete projects');
        } finally {
            setDeleting(false);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'active':
                return { bg: '#d1fae5', color: '#065f46' };
            case 'completed':
                return { bg: '#dbeafe', color: '#1e40af' };
            case 'on_hold':
                return { bg: '#fef3c7', color: '#92400e' };
            default:
                return { bg: '#f3f4f6', color: '#6b7280' };
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading projects...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Projects</h1>
                    <p style={{ color: '#6b7280' }}>Manage your projects</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedProjects.length > 0 && (
                        <button
                            onClick={() => setShowBulkDelete(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <Trash2 size={16} />
                            Delete Selected ({selectedProjects.length})
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/projects/new')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        + New Project
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }}>
                    {error}
                </div>
            )}

            {projects.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ color: '#6b7280' }}>No projects yet</p>
                    <button
                        onClick={() => navigate('/projects/new')}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Create your first project
                    </button>
                </div>
            ) : (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedProjects.length === projects.length && projects.length > 0}
                                            onChange={handleSelectAll}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Title</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Client</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Budget</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Due Date</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(project => {
                                    const statusColors = getStatusColor(project.status);
                                    return (
                                        <tr key={project._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProjects.includes(project._id)}
                                                    onChange={() => handleSelectProject(project._id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem', fontWeight: '500' }}>
                                                {project.title}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {project.client_id?.contact_name || 'No Client'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                                                {formatCurrency(project.budget)}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {project.due_date ? new Date(project.due_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    background: statusColors.bg,
                                                    color: statusColors.color,
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {project.status || 'active'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => navigate(`/projects/${project._id}/edit`)}
                                                    style={{
                                                        padding: '0.35rem 0.75rem',
                                                        background: '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        marginRight: '0.5rem'
                                                    }}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(project)}
                                                    style={{
                                                        padding: '0.35rem 0.75rem',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedProject && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '450px',
                        width: '90%'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <AlertTriangle size={48} color="#ef4444" />
                            <h2 style={{ marginTop: '1rem', fontSize: '1.25rem' }}>Delete Project</h2>
                            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                                Are you sure you want to delete <strong>"{selectedProject.title}"</strong>?
                                {selectedProject.budget > 0 && (
                                    <span style={{ display: 'block', marginTop: '0.5rem' }}>
                                        Budget: ${selectedProject.budget}
                                    </span>
                                )}
                            </p>
                            {selectedProject.client_id && (
                                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                    Client: {selectedProject.client_id.contact_name || 'Unknown'}
                                </p>
                            )}
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                This action cannot be undone.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedProject(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    opacity: deleting ? 0.5 : 1
                                }}
                            >
                                {deleting ? 'Deleting...' : 'Delete Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDelete && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '450px',
                        width: '90%'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <AlertTriangle size={48} color="#ef4444" />
                            <h2 style={{ marginTop: '1rem', fontSize: '1.25rem' }}>Delete Multiple Projects</h2>
                            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                                Are you sure you want to delete <strong>{selectedProjects.length}</strong> project(s)?
                            </p>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                This action cannot be undone.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setShowBulkDelete(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={deleting}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    opacity: deleting ? 0.5 : 1
                                }}
                            >
                                {deleting ? 'Deleting...' : `Delete ${selectedProjects.length} Projects`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;