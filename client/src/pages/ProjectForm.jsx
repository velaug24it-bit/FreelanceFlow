import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);

    const handleAIGenerate = async () => {
        if (!formData.title.trim()) {
            alert('Please enter a project title first.');
            return;
        }
        setAiGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/ai/projects/generate-description`, {
                title: formData.title,
                keywords: ''
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                const { description, scope_of_work, deliverables, required_skills, suggested_budget } = res.data.data;
                
                // Format details
                const formattedDescription = `Project Description:\n${description}\n\nScope of Work:\n${scope_of_work?.map(s => `- ${s}`).join('\n')}\n\nDeliverables:\n${deliverables?.map(d => `- ${d}`).join('\n')}\n\nRequired Skills: ${required_skills?.join(', ')}`;
                
                setFormData(prev => ({
                    ...prev,
                    description: formattedDescription,
                    budget: suggested_budget || prev.budget
                }));
            }
        } catch (err) {
            console.error('AI spec gen failed:', err);
            alert('Could not generate spec details.');
        } finally {
            setAiGenerating(false);
        }
    };
    const [formData, setFormData] = useState({
        client_id: '',
        title: '',
        description: '',
        budget: '',
        due_date: '',
        project_type: 'web_development'
    });

    useEffect(() => {
        fetchClients();
        if (id) {
            setIsEditMode(true);
            fetchProject();
        } else {
            setIsEditMode(false);
        }
    }, [id]);

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to create a project');
                return;
            }

            console.log('🔍 Fetching clients...');
            const response = await axios.get(`${API_URL}/clients`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Handle different response formats
            let clientsData = [];
            if (response.data) {
                if (Array.isArray(response.data)) {
                    clientsData = response.data;
                } else if (response.data.clients && Array.isArray(response.data.clients)) {
                    clientsData = response.data.clients;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    clientsData = response.data.data;
                }
            }

            console.log('✅ Clients fetched:', clientsData.length);
            setClients(clientsData);
            setError('');
        } catch (err) {
            console.error('❌ Failed to fetch clients:', err);
            setError('Failed to load clients. Please refresh and try again.');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const fetchProject = async () => {
        setFetching(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await axios.get(`${API_URL}/projects/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const project = response.data.project;
            if (project) {
                setFormData({
                    client_id: project.client_id?._id || project.client_id || '',
                    title: project.title || '',
                    description: project.description || '',
                    budget: project.budget || '',
                    due_date: project.due_date ? project.due_date.split('T')[0] : '',
                    project_type: project.project_type || 'web_development'
                });
            }
        } catch (err) {
            console.error('❌ Failed to load project for editing:', err);
            setError('Failed to load project details.');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);

        // Validate required fields
        if (!formData.title.trim()) {
            setError('Project title is required');
            setLoading(false);
            return;
        }

        if (!formData.client_id) {
            setError('Please select a client');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to create a project');
                setLoading(false);
                return;
            }

            // Prepare data for submission
            const projectData = {
                client_id: formData.client_id,
                title: formData.title.trim(),
                description: formData.description.trim(),
                budget: parseFloat(formData.budget) || 0,
                due_date: formData.due_date || null,
                project_type: formData.project_type,
                status: 'active'
            };

            console.log('📤 Sending project data:', projectData);

            const response = id
                ? await axios.put(`${API_URL}/projects/${id}`, projectData, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                : await axios.post(`${API_URL}/projects`, projectData, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

            console.log('✅ Project created:', response.data);

            if (response.data.success || response.data.project) {
                setSuccess(true);
                alert(id ? '✅ Project updated successfully!' : '✅ Project created successfully!');

                if (!id) {
                    setFormData({
                        client_id: '',
                        title: '',
                        description: '',
                        budget: '',
                        due_date: '',
                        project_type: 'web_development'
                    });
                }

                setTimeout(() => {
                    navigate(id ? `/projects/${id}/manage` : '/projects');
                }, 1200);
            } else {
                setError(id ? 'Failed to update project. Please try again.' : 'Failed to create project. Please try again.');
            }
        } catch (err) {
            console.error('❌ Failed to create project:', err);
            console.error('❌ Error response:', err.response?.data);

            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (err.response?.data?.details) {
                setError(err.response.data.details);
            } else {
                setError('Failed to create project. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📋</span> {id ? 'Update Project' : 'Create New Project'}
            </h2>

            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #fecaca',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span>❌</span> {error}
                </div>
            )}

            {success && (
                <div style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span>✅</span> Project created successfully! Redirecting...
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Client Selection */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>
                        Client *
                    </label>
                    <select
                        name="client_id"
                        value={formData.client_id}
                        onChange={handleChange}
                        required
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            backgroundColor: 'white',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                        <option value="">-- Select a Client --</option>
                        {clients.map(client => (
                            <option key={client._id || client.id} value={client._id || client.id}>
                                {client.contact_name} {client.company_name ? `(${client.company_name})` : ''}
                            </option>
                        ))}
                    </select>
                    {clients.length === 0 && (
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                            No clients found. <a href="/clients/new" style={{ color: '#3b82f6', textDecoration: 'none' }}>+ Add a client first</a>
                        </p>
                    )}
                    {formData.client_id && (
                        <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.25rem' }}>
                            ✓ Client selected: <strong>{clients.find(c => (c._id || c.id) === formData.client_id)?.contact_name}</strong>
                        </p>
                    )}
                </div>

                {/* Project Title */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>
                        Project Title *
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        placeholder="Enter project title"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label style={{ fontWeight: '500', margin: 0 }}>
                            Description
                        </label>
                        <button
                            type="button"
                            onClick={handleAIGenerate}
                            disabled={aiGenerating}
                            style={{
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px dashed #3b82f6',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {aiGenerating ? 'AI Writing Spec...' : '✨ Auto-Write Description & Budget with AI'}
                        </button>
                    </div>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Describe your project in detail..."
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    />
                </div>

                {/* Budget and Due Date Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>
                            Budget ($)
                        </label>
                        <input
                            type="number"
                            name="budget"
                            value={formData.budget}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                marginTop: '0.25rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>
                            Due Date
                        </label>
                        <input
                            type="date"
                            name="due_date"
                            value={formData.due_date}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                marginTop: '0.25rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                        />
                    </div>
                </div>

                {/* Project Type */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>
                        Project Type
                    </label>
                    <select
                        name="project_type"
                        value={formData.project_type}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            backgroundColor: 'white',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                        <option value="web_development">🌐 Web Development</option>
                        <option value="mobile_app">📱 Mobile App Development</option>
                        <option value="design">🎨 Design</option>
                        <option value="consulting">💼 Consulting</option>
                        <option value="marketing">📊 Marketing</option>
                        <option value="other">📌 Other</option>
                    </select>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button
                        type="submit"
                        disabled={loading || success}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: loading || success ? '#9ca3af' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading || success ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            flex: 1,
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading && !success) e.currentTarget.style.background = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                            if (!loading && !success) e.currentTarget.style.background = '#3b82f6';
                        }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner">⏳</span> Creating...
                            </>
                        ) : success ? (
                            '✅ Created!'
                        ) : (
                            '🚀 Create Project'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/projects')}
                        disabled={loading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            transition: 'background 0.2s',
                            opacity: loading ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.background = '#4b5563';
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.currentTarget.style.background = '#6b7280';
                        }}
                    >
                        Cancel
                    </button>
                </div>

                {/* Info note */}
                <p style={{
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textAlign: 'center'
                }}>
                    * Required fields. Your project will be created as a regular project.
                    For marketplace posting, use the Marketplace section.
                </p>
            </form>

            <style>{`
                .spinner {
                    display: inline-block;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ProjectForm;