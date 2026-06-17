import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Briefcase, DollarSign, Clock, Users, Plus, Check, X } from 'lucide-react';
import ProjectStatus from '../components/ProjectStatus';

const Marketplace = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('browse');
    const [projects, setProjects] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [myBids, setMyBids] = useState([]);
    const [activeProjects, setActiveProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPostForm, setShowPostForm] = useState(false);
    const [showBidForm, setShowBidForm] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectBids, setProjectBids] = useState({});
    
    // Individual state for each bid form
    const [bidAmounts, setBidAmounts] = useState({});
    const [estimatedDaysList, setEstimatedDaysList] = useState({});
    const [proposals, setProposals] = useState({});
    const [phoneNumbers, setPhoneNumbers] = useState({});
    
    const [newProject, setNewProject] = useState({
        title: '',
        description: '',
        category: 'Web Development',
        budget_min: '',
        budget_max: '',
        duration: '',
        skills_required: '',
        deadline: ''
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        try {
            if (activeTab === 'browse') {
                const res = await axios.get('/api/marketplace/open-projects', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProjects(res.data.projects);
            } else if (activeTab === 'my-projects') {
                const res = await axios.get('/api/marketplace/my-projects', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyProjects(res.data.projects);
                
                for (const project of res.data.projects) {
                    const bidsRes = await axios.get(`/api/marketplace/projects/${project._id}/bids`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setProjectBids(prev => ({ ...prev, [project._id]: bidsRes.data.bids }));
                }
            } else if (activeTab === 'my-bids') {
                const res = await axios.get('/api/marketplace/my-bids', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyBids(res.data.bids || []);
            } else if (activeTab === 'active-projects') {
                const res = await axios.get('/api/marketplace/my-active-projects', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setActiveProjects(res.data.projects);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePostProject = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        
        try {
            await axios.post('/api/marketplace/projects', {
                ...newProject,
                client_name: user?.full_name,
                skills_required: newProject.skills_required.split(',').map(s => s.trim()).filter(s => s)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setShowPostForm(false);
            setNewProject({
                title: '',
                description: '',
                category: 'Web Development',
                budget_min: '',
                budget_max: '',
                duration: '',
                skills_required: '',
                deadline: ''
            });
            fetchData();
            alert('Project posted successfully!');
        } catch (err) {
            console.error('Error posting project:', err);
            alert('Failed to post project');
        }
    };

    const handleBidAmountChange = (projectId, value) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setBidAmounts(prev => ({ ...prev, [projectId]: value }));
        }
    };

    const handleDaysChange = (projectId, value) => {
        if (value === '' || /^\d*$/.test(value)) {
            setEstimatedDaysList(prev => ({ ...prev, [projectId]: value }));
        }
    };

    const handleProposalChange = (projectId, value) => {
        setProposals(prev => ({ ...prev, [projectId]: value }));
    };

    const handlePhoneChange = (projectId, value) => {
        setPhoneNumbers(prev => ({ ...prev, [projectId]: value }));
    };

    const handlePlaceBid = async (projectId) => {
        const bidAmount = bidAmounts[projectId];
        const estimatedDays = estimatedDaysList[projectId];
        const proposal = proposals[projectId];
        const phone_number = phoneNumbers[projectId];
        
        const bidAmountNum = parseFloat(bidAmount);
        const estimatedDaysNum = parseInt(estimatedDays);
        
        if (isNaN(bidAmountNum) || bidAmountNum <= 0) {
            alert('Please enter a valid bid amount');
            return;
        }
        if (isNaN(estimatedDaysNum) || estimatedDaysNum <= 0) {
            alert('Please enter valid estimated days');
            return;
        }
        if (!proposal || proposal.trim() === '') {
            alert('Please enter a proposal');
            return;
        }
        if (!phone_number || phone_number.trim() === '') {
            alert('Please enter your phone number');
            return;
        }
        
        const token = localStorage.getItem('token');
        
        try {
            await axios.post('/api/marketplace/bids', {
                project_id: projectId,
                bid_amount: bidAmountNum,
                estimated_days: estimatedDaysNum,
                proposal: proposal,
                phone_number: phone_number,
                freelancer_name: user?.full_name
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setBidAmounts(prev => ({ ...prev, [projectId]: '' }));
            setEstimatedDaysList(prev => ({ ...prev, [projectId]: '' }));
            setProposals(prev => ({ ...prev, [projectId]: '' }));
            setPhoneNumbers(prev => ({ ...prev, [projectId]: '' }));
            setShowBidForm(null);
            fetchData();
            alert('Bid placed successfully!');
        } catch (err) {
            console.error('Error placing bid:', err);
            alert(err.response?.data?.error || 'Failed to place bid');
        }
    };

    const handleAcceptBid = async (projectId, bidId, bidAmount) => {
        if (!window.confirm(`Accept bid of $${bidAmount}? This will create a contract.`)) return;
        
        const token = localStorage.getItem('token');
        
        try {
            await axios.put(`/api/marketplace/bids/${bidId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Bid accepted! The project is now in progress.');
            fetchData();
        } catch (err) {
            console.error('Error accepting bid:', err);
            alert('Failed to accept bid');
        }
    };

    const renderProjectCard = (project, showBidButton = true, isOwner = false) => {
        const isProjectOwner = project.client_id === user?._id || project.client_name === user?.full_name;
        const showBid = showBidButton && !isProjectOwner && project.status === 'open';
        const isSelectedFreelancer = project.selected_freelancer_id === user?._id;
        
        return (
            <div key={project._id} style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>{project.title}</h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Posted by: {project.client_name}</p>
                    </div>
                    <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        background: project.status === 'open' ? '#d1fae5' : project.status === 'in_progress' ? '#fef3c7' : project.status === 'completed' ? '#dbeafe' : '#fee2e2',
                        color: project.status === 'open' ? '#065f46' : project.status === 'in_progress' ? '#92400e' : project.status === 'completed' ? '#1e40af' : '#991b1b'
                    }}>
                        {project.status === 'open' ? 'Open' : project.status === 'in_progress' ? 'In Progress' : project.status === 'completed' ? 'Completed' : project.status}
                    </span>
                </div>
                
                <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '0.875rem' }}>{project.description}</p>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} color="#10b981" />
                        <span style={{ fontSize: '0.875rem' }}>${project.budget_min} - ${project.budget_max}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} color="#f59e0b" />
                        <span style={{ fontSize: '0.875rem' }}>{project.duration}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Briefcase size={16} color="#8b5cf6" />
                        <span style={{ fontSize: '0.875rem' }}>{project.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={16} color="#3b82f6" />
                        <span style={{ fontSize: '0.875rem' }}>{project.bids_count || 0} bids</span>
                    </div>
                </div>
                
                {project.skills_required?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {project.skills_required.map((skill, idx) => (
                            <span key={idx} style={{
                                padding: '0.25rem 0.5rem',
                                background: '#f3f4f6',
                                borderRadius: '4px',
                                fontSize: '0.7rem'
                            }}>
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
                
                {/* View Bids Button for Project Owner */}
                {isOwner && project.status === 'open' && (
                    <button
                        onClick={() => setSelectedProject(selectedProject === project._id ? null : project._id)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginRight: '0.5rem'
                        }}
                    >
                        {selectedProject === project._id ? 'Hide Bids' : `View Bids (${project.bids_count || 0})`}
                    </button>
                )}
                
                {/* Bid Button for Freelancers */}
                {showBid && (
                    <button
                        onClick={() => {
                            if (showBidForm === project._id) {
                                setShowBidForm(null);
                            } else {
                                setShowBidForm(project._id);
                            }
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        {showBidForm === project._id ? 'Cancel Bid' : 'Place Bid'}
                    </button>
                )}
                
                {/* Display Bids for Project Owner */}
                {selectedProject === project._id && projectBids[project._id] && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '0.75rem', fontWeight: '600' }}>Bids Received</h4>
                        {projectBids[project._id].length === 0 ? (
                            <p style={{ color: '#6b7280' }}>No bids yet.</p>
                        ) : (
                            projectBids[project._id].map(bid => (
                                <div key={bid._id} style={{
                                    padding: '0.75rem',
                                    borderBottom: '1px solid #e5e7eb',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}>
                                    <div>
                                        <p style={{ fontWeight: '500' }}>{bid.freelancer_name}</p>
                                        <p style={{ fontSize: '0.875rem' }}>Bid: <strong>${bid.bid_amount}</strong></p>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Days: {bid.estimated_days}</p>
                                        <p style={{ fontSize: '0.875rem' }}>Proposal: {bid.proposal}</p>
                                    </div>
                                    {bid.status === 'pending' && (
                                        <button
                                            onClick={() => handleAcceptBid(project._id, bid._id, bid.bid_amount)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <Check size={16} /> Accept
                                        </button>
                                    )}
                                    {bid.status === 'accepted' && (
                                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Check size={16} /> Accepted
                                        </span>
                                    )}
                                    {bid.status === 'rejected' && (
                                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <X size={16} /> Rejected
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
                
                {/* Bid Form for Freelancers */}
                {showBidForm === project._id && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '0.75rem', fontWeight: '600' }}>Place Your Bid</h4>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>Bid Amount ($)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Enter your bid amount"
                                    value={bidAmounts[project._id] || ''}
                                    onChange={(e) => handleBidAmountChange(project._id, e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        border: '1px solid #d1d5db', 
                                        borderRadius: '6px', 
                                        fontSize: '1rem',
                                        backgroundColor: 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>Estimated Days</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Number of days"
                                    value={estimatedDaysList[project._id] || ''}
                                    onChange={(e) => handleDaysChange(project._id, e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        border: '1px solid #d1d5db', 
                                        borderRadius: '6px', 
                                        fontSize: '1rem',
                                        backgroundColor: 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="Enter your phone number"
                                    value={phoneNumbers[project._id] || ''}
                                    onChange={(e) => handlePhoneChange(project._id, e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        border: '1px solid #d1d5db', 
                                        borderRadius: '6px', 
                                        fontSize: '1rem',
                                        backgroundColor: 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>Proposal</label>
                                <textarea
                                    placeholder="Why are you the best fit for this project? Describe your experience and approach."
                                    value={proposals[project._id] || ''}
                                    onChange={(e) => handleProposalChange(project._id, e.target.value)}
                                    rows="3"
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        border: '1px solid #d1d5db', 
                                        borderRadius: '6px',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => handlePlaceBid(project._id)}
                                    disabled={!bidAmounts[project._id] || !estimatedDaysList[project._id] || !proposals[project._id] || !phoneNumbers[project._id]}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        background: (!bidAmounts[project._id] || !estimatedDaysList[project._id] || !proposals[project._id] || !phoneNumbers[project._id]) ? '#9ca3af' : '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: (!bidAmounts[project._id] || !estimatedDaysList[project._id] || !proposals[project._id] || !phoneNumbers[project._id]) ? 'not-allowed' : 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Submit Bid
                                </button>
                                <button
                                    onClick={() => {
                                        setShowBidForm(null);
                                        setBidAmounts(prev => ({ ...prev, [project._id]: '' }));
                                        setEstimatedDaysList(prev => ({ ...prev, [project._id]: '' }));
                                        setProposals(prev => ({ ...prev, [project._id]: '' }));
                                        setPhoneNumbers(prev => ({ ...prev, [project._id]: '' }));
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
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
                
                {/* Project Status - Show for projects that are in progress or completed */}
                {(project.status === 'in_progress' || project.status === 'review' || project.status === 'completed') && (
                    <ProjectStatus 
                        project={project}
                        isOwner={isProjectOwner}
                        isFreelancer={isSelectedFreelancer}
                        onStatusUpdate={(updatedProject) => {
                            fetchData();
                        }}
                    />
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '2rem' }}>Project Marketplace</h1>
                <button
                    onClick={() => setShowPostForm(!showPostForm)}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Plus size={18} />
                    Post a Project
                </button>
            </div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                {['browse', 'my-projects', 'my-bids', 'active-projects'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setSelectedProject(null);
                            setShowBidForm(null);
                        }}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: activeTab === tab ? '#3b82f6' : 'transparent',
                            color: activeTab === tab ? 'white' : '#6b7280',
                            border: 'none',
                            borderRadius: '8px 8px 0 0',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab ? '500' : 'normal'
                        }}
                    >
                        {tab.replace('-', ' ').charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                    </button>
                ))}
            </div>
            
            {/* Post Project Form */}
            {showPostForm && (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Post a New Project</h2>
                    <form onSubmit={handlePostProject}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Project Title"
                                value={newProject.title}
                                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                                required
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                            <select
                                value={newProject.category}
                                onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            >
                                <option>Web Development</option>
                                <option>Mobile App</option>
                                <option>Design</option>
                                <option>Content Writing</option>
                                <option>Marketing</option>
                                <option>Other</option>
                            </select>
                        </div>
                        
                        <textarea
                            placeholder="Project Description"
                            value={newProject.description}
                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                            rows="4"
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '1rem' }}
                        />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="number"
                                placeholder="Min Budget ($)"
                                value={newProject.budget_min}
                                onChange={(e) => setNewProject({ ...newProject, budget_min: e.target.value })}
                                required
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                            <input
                                type="number"
                                placeholder="Max Budget ($)"
                                value={newProject.budget_max}
                                onChange={(e) => setNewProject({ ...newProject, budget_max: e.target.value })}
                                required
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                            <input
                                type="text"
                                placeholder="Duration (e.g., 2 weeks)"
                                value={newProject.duration}
                                onChange={(e) => setNewProject({ ...newProject, duration: e.target.value })}
                                required
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Skills Required (comma separated)"
                                value={newProject.skills_required}
                                onChange={(e) => setNewProject({ ...newProject, skills_required: e.target.value })}
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                            <input
                                type="date"
                                placeholder="Deadline"
                                value={newProject.deadline}
                                onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                                Post Project
                            </button>
                            <button type="button" onClick={() => setShowPostForm(false)} style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : (
                <>
                    {activeTab === 'browse' && projects.map(project => renderProjectCard(project, true, false))}
                    
                    {activeTab === 'my-projects' && myProjects.map(project => renderProjectCard(project, false, true))}
                    
                    {activeTab === 'my-bids' && myBids.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <p style={{ color: '#6b7280' }}>No bids placed yet</p>
                            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                                Browse open projects and place your first bid
                            </p>
                        </div>
                    ) : (
                        activeTab === 'my-bids' && myBids.map(bid => (
                            <div key={bid._id} style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                marginBottom: '1rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                            {bid.project_id?.title || 'Project'}
                                        </h3>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            Posted by: {bid.project_id?.client_name || 'Unknown'}
                                        </p>
                                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                            Your Bid: <strong>${bid.bid_amount}</strong>
                                        </p>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            Estimated Days: {bid.estimated_days}
                                        </p>
                                        {bid.proposal && (
                                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '0.25rem' }}>
                                                Proposal: {bid.proposal}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            background: bid.status === 'accepted' ? '#d1fae5' : bid.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                            color: bid.status === 'accepted' ? '#065f46' : bid.status === 'rejected' ? '#991b1b' : '#92400e'
                                        }}>
                                            {bid.status === 'accepted' ? '✅ Accepted' : bid.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                                        </span>
                                        <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                            {new Date(bid.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    
                    {activeTab === 'active-projects' && activeProjects.map(project => renderProjectCard(project, false, false))}
                </>
            )}
        </div>
    );
};

export default Marketplace;