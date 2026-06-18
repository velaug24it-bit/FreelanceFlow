import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectForm = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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
    }, []);

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to create a project');
                return;
            }

            const response = await axios.get(`${API_URL}/clients`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Clients fetched:', response.data);
            setClients(response.data.clients || []);
        } catch (err) {
            console.error('Failed to fetch clients:', err);
            setError('Failed to load clients. Please refresh and try again.');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
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

            console.log('Sending project data:', projectData);

            const response = await axios.post(`${API_URL}/projects`, projectData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Project created:', response.data);

            if (response.data.project) {
                alert('✅ Project created successfully!');
                navigate('/projects');
            } else {
                setError('Failed to create project. Please try again.');
            }
        } catch (err) {
            console.error('Failed to create project:', err);
            console.error('Error response:', err.response?.data);

            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to create project. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Create New Project</h2>

            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #fecaca'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
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
                            padding: '0.5rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '1rem'
                        }}
                    >
                        <option value="">Select a Client</option>
                        {clients.map(client => (
                            <option key={client._id || client.id} value={client._id || client.id}>
                                {client.contact_name} {client.company_name ? `(${client.company_name})` : ''}
                            </option>
                        ))}
                    </select>
                    {clients.length === 0 && (
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            No clients found. <a href="/clients/new" style={{ color: '#3b82f6' }}>Add a client first</a>
                        </p>
                    )}
                </div>

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
                            padding: '0.5rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>
                        Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Describe your project..."
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '1rem' }}>
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
                            padding: '0.5rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '1rem' }}>
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
                            padding: '0.5rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>
                        Project Type
                    </label>
                    <select
                        name="project_type"
                        value={formData.project_type}
                        onChange={handleChange}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            marginTop: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '1rem'
                        }}
                    >
                        <option value="web_development">Web Development</option>
                        <option value="mobile_app">Mobile App Development</option>
                        <option value="design">Design</option>
                        <option value="consulting">Consulting</option>
                        <option value="marketing">Marketing</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: loading ? '#9ca3af' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            flex: 1,
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) e.currentTarget.style.background = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) e.currentTarget.style.background = '#3b82f6';
                        }}
                    >
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/projects')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '500',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProjectForm;