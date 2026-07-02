import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, DollarSign, Clock, Users, Plus, Check, X, Star, Heart, ShieldCheck, Zap, Award } from 'lucide-react';
import ProjectStatus from '../components/ProjectStatus';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Marketplace = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id: routeProjectId } = useParams();
    const [activeTab, setActiveTab] = useState('browse');
    const [projects, setProjects] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [myBids, setMyBids] = useState([]);
    const [activeProjects, setActiveProjects] = useState([]);
    const [routeProject, setRouteProject] = useState(null);
    const [routeProjectLoading, setRouteProjectLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPostForm, setShowPostForm] = useState(false);
    const [showBidForm, setShowBidForm] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectBids, setProjectBids] = useState({});
    const [reviewDrafts, setReviewDrafts] = useState({});
    
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

    // Helper function to deduplicate projects by ID
    const deduplicateProjects = (projectsArray) => {
        if (!projectsArray || !Array.isArray(projectsArray)) return [];
        const seenIds = new Set();
        return projectsArray.filter(project => {
            if (!project || !project._id) return false;
            if (seenIds.has(project._id)) return false;
            seenIds.add(project._id);
            return true;
        });
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    useEffect(() => {
        if (!routeProjectId) {
            setRouteProject(null);
            return;
        }

        const fetchRouteProject = async () => {
            setRouteProjectLoading(true);
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get(`${API_URL}/marketplace/projects/${routeProjectId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRouteProject(res.data.project || null);
            } catch (err) {
                console.error('Error fetching marketplace project by route id:', err);
                setRouteProject(null);
            } finally {
                setRouteProjectLoading(false);
            }
        };

        fetchRouteProject();
    }, [routeProjectId]);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        try {
            if (activeTab === 'browse') {
                const res = await axios.get(`${API_URL}/marketplace/open-projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProjects(res.data.projects || []);
            } else if (activeTab === 'my-projects') {
                const res = await axios.get(`${API_URL}/marketplace/my-projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyProjects(res.data.projects || []);
                
                for (const project of res.data.projects || []) {
                    const bidsRes = await axios.get(`${API_URL}/marketplace/projects/${project._id}/bids`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setProjectBids(prev => ({ ...prev, [project._id]: bidsRes.data.bids || [] }));
                }
            } else if (activeTab === 'my-bids') {
                const res = await axios.get(`${API_URL}/marketplace/my-bids`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyBids(res.data.bids || []);
            } else if (activeTab === 'active-projects') {
                const res = await axios.get(`${API_URL}/marketplace/my-active-projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // FIX: Deduplicate projects by ID to prevent duplicate listings
                const uniqueProjects = deduplicateProjects(res.data.projects || []);
                setActiveProjects(uniqueProjects);
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
            await axios.post(`${API_URL}/marketplace/projects`, {
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
            await axios.post(`${API_URL}/marketplace/bids`, {
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
            const res = await axios.put(`${API_URL}/marketplace/bids/${bidId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data?.message || 'Bid accepted! The project is now in progress.');
            fetchData();
        } catch (err) {
            console.error('Error accepting bid:', err);
            const errorMessage = err.response?.data?.error || 'Failed to accept bid';
            alert(errorMessage);
        }
    };

    const toggleFavorite = async (freelancerId, projectId) => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post(`${API_URL}/marketplace/favorites/${freelancerId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProjectBids(prev => ({
                ...prev,
                [projectId]: (prev[projectId] || []).map(bid => (
                    bid.freelancer_profile?.freelancer_id === freelancerId
                        ? { ...bid, freelancer_profile: { ...bid.freelancer_profile, is_favorited: res.data.is_favorited } }
                        : bid
                ))
            }));
        } catch (err) {
            console.error('Error toggling favorite:', err);
            alert(err.response?.data?.error || 'Failed to update favorite');
        }
    };

    const handleReviewDraftChange = (projectId, field, value) => {
        setReviewDrafts(prev => ({
            ...prev,
            [projectId]: {
                rating: 5,
                comment: '',
                ...(prev[projectId] || {}),
                [field]: value
            }
        }));
    };

    const handleSubmitReview = async (projectId) => {
        const token = localStorage.getItem('token');
        const draft = reviewDrafts[projectId] || { rating: 5, comment: '' };
        try {
            await axios.post(`${API_URL}/marketplace/projects/${projectId}/reviews`, draft, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviewDrafts(prev => ({ ...prev, [projectId]: { rating: 5, comment: '' } }));
            alert('Review saved successfully!');
            fetchData();
        } catch (err) {
            console.error('Error saving review:', err);
            alert(err.response?.data?.error || 'Failed to save review');
        }
    };

    const renderBadges = (badges = []) => {
        const badgeConfig = {
            'Verified': { Icon: ShieldCheck, bg: '#ecfdf5', color: '#047857' },
            'Top-Rated': { Icon: Award, bg: '#fff7ed', color: '#c2410c' },
            'Quick-Responder': { Icon: Zap, bg: '#eff6ff', color: '#2563eb' }
        };

        return (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {badges.map(badge => {
                    const config = badgeConfig[badge] || badgeConfig.Verified;
                    const Icon = config.Icon;
                    return (
                        <span key={badge} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.45rem', background: config.bg, color: config.color, borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>
                            <Icon size={12} />
                            {badge}
                        </span>
                    );
                })}
            </div>
        );
    };

    const renderSocialProof = (profile) => {
        if (!profile) return null;
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.35rem', color: '#475569', fontSize: '0.78rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <strong>{profile.average_rating ? profile.average_rating.toFixed(1) : 'New'}</strong>
                    {profile.reviews_count > 0 ? `(${profile.reviews_count})` : ''}
                </span>
                <span>{profile.completed_projects || 0} completed</span>
                {renderBadges(profile.badges)}
            </div>
        );
    };

    const renderProjectCard = (project, showBidButton = true, isOwner = false) => {
        // Safety check: if project is null or undefined, return null
        if (!project || !project._id) {
            console.warn('Invalid project object:', project);
            return null;
        }
        
        const isProjectOwner = project.client_id === user?._id || project.client_name === user?.full_name;
        const showBid = showBidButton && !isProjectOwner && project.status === 'open';
        const isSelectedFreelancer = project.selected_freelancer_id === user?._id;
        
        return (
            <div key={project._id} style={{
                background: 'white',
                borderRadius: '12px',
                padding: 'clamp(1rem, 2vw, 1.5rem)',
                marginBottom: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 'clamp(200px, 50%, 500px)' }}>
                        <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', fontWeight: '600', marginBottom: '0.25rem' }}>{project.title}</h3>
                        <p style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: '#6b7280' }}>Posted by: {project.client_name}</p>
                    </div>
                    <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        background: project.status === 'open' ? '#d1fae5' : project.status === 'in_progress' ? '#fef3c7' : project.status === 'completed' ? '#dbeafe' : '#fee2e2',
                        color: project.status === 'open' ? '#065f46' : project.status === 'in_progress' ? '#92400e' : project.status === 'completed' ? '#1e40af' : '#991b1b',
                        whiteSpace: 'nowrap'
                    }}>
                        {project.status === 'open' ? 'Open' : project.status === 'in_progress' ? 'In Progress' : project.status === 'completed' ? 'Completed' : project.status}
                    </span>
                </div>
                
                <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>{project.description}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={16} color="#10b981" />
                        <span style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)' }}>${project.budget_min} - ${project.budget_max}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} color="#f59e0b" />
                        <span style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)' }}>{project.duration}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Briefcase size={16} color="#8b5cf6" />
                        <span style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)' }}>{project.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={16} color="#3b82f6" />
                        <span style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)' }}>{project.bids_count || 0} bids</span>
                    </div>
                </div>
                
                {project.skills_required?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {project.skills_required.map((skill, idx) => (
                            <span key={idx} style={{
                                padding: '0.25rem 0.5rem',
                                background: '#f3f4f6',
                                borderRadius: '4px',
                                fontSize: 'clamp(0.65rem, 1vw, 0.7rem)'
                            }}>
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
                
                {/* Action Buttons Section - Mobile Responsive */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
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
                                fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)',
                                flex: '1 1 auto',
                                minWidth: '100px'
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
                                cursor: 'pointer',
                                fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)',
                                flex: '1 1 auto',
                                minWidth: '100px'
                            }}
                        >
                            {showBidForm === project._id ? 'Cancel' : 'Place Bid'}
                        </button>
                    )}
                </div>
                
                {/* Display Bids for Project Owner */}
                {selectedProject === project._id && projectBids[project._id] && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '0.75rem', fontWeight: '600', fontSize: 'clamp(0.85rem, 1.5vw, 1rem)' }}>Bids Received</h4>
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
                                    <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <p style={{ fontWeight: '500', fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', margin: 0 }}>{bid.freelancer_name}</p>
                                            {bid.freelancer_profile?.freelancer_id && (
                                                <button
                                                    type="button"
                                                    title={bid.freelancer_profile.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
                                                    onClick={() => toggleFavorite(bid.freelancer_profile.freelancer_id, project._id)}
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: bid.freelancer_profile.is_favorited ? '#fee2e2' : 'white',
                                                        color: bid.freelancer_profile.is_favorited ? '#dc2626' : '#64748b',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '999px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Heart size={15} fill={bid.freelancer_profile.is_favorited ? '#dc2626' : 'none'} />
                                                </button>
                                            )}
                                        </div>
                                        {renderSocialProof(bid.freelancer_profile)}
                                        <p style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)' }}>Bid: <strong>${bid.bid_amount}</strong></p>
                                        <p style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)', color: '#6b7280' }}>Days: {bid.estimated_days}</p>
                                        <p style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)' }}>Proposal: {bid.proposal}</p>
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
                                                gap: '0.5rem',
                                                fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <Check size={16} /> Accept
                                        </button>
                                    )}
                                    {bid.status === 'accepted' && (
                                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)' }}>
                                            <Check size={16} /> Accepted
                                        </span>
                                    )}
                                    {bid.status === 'rejected' && (
                                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)' }}>
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
                        <h4 style={{ marginBottom: '0.75rem', fontWeight: '600', fontSize: 'clamp(0.85rem, 1.5vw, 1rem)' }}>Place Your Bid</h4>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>Bid Amount ($)</label>
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
                                        fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
                                        backgroundColor: 'white',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>Estimated Days</label>
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
                                        fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
                                        backgroundColor: 'white',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>Phone Number</label>
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
                                        fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
                                        backgroundColor: 'white',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)', marginBottom: '0.25rem', display: 'block', fontWeight: '500' }}>Proposal</label>
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
                                        fontFamily: 'inherit',
                                        fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => handlePlaceBid(project._id)}
                                    disabled={!bidAmounts[project._id] || !estimatedDaysList[project._id] || !proposals[project._id] || !phoneNumbers[project._id]}
                                    style={{
                                        padding: '0.75rem',
                                        background: (!bidAmounts[project._id] || !estimatedDaysList[project._id] || !proposals[project._id] || !phoneNumbers[project._id]) ? '#9ca3af' : '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: (!bidAmounts[project._id] || !estimatedDaysList[project._id] || !proposals[project._id] || !phoneNumbers[project._id]) ? 'not-allowed' : 'pointer',
                                        fontWeight: '500',
                                        fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)'
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
                                        padding: '0.75rem',
                                        background: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)'
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

                {isProjectOwner && project.status === 'completed' && project.selected_freelancer_id && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 0.75rem', fontWeight: '600', fontSize: 'clamp(0.85rem, 1.5vw, 1rem)' }}>Review {project.selected_freelancer_name || 'Freelancer'}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 140px) 1fr auto', gap: '0.75rem', alignItems: 'start' }}>
                            <select
                                value={reviewDrafts[project._id]?.rating || 5}
                                onChange={(e) => handleReviewDraftChange(project._id, 'rating', Number(e.target.value))}
                                style={{ padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}
                            >
                                {[5, 4, 3, 2, 1].map(value => (
                                    <option key={value} value={value}>{value} stars</option>
                                ))}
                            </select>
                            <textarea
                                rows="2"
                                placeholder="Share a concise review"
                                value={reviewDrafts[project._id]?.comment || ''}
                                onChange={(e) => handleReviewDraftChange(project._id, 'comment', e.target.value)}
                                style={{ width: '100%', padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <button
                                type="button"
                                onClick={() => handleSubmitReview(project._id)}
                                style={{ padding: '0.7rem 1rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                                Save Review
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render single project view (when routeProjectId is present)
    if (routeProjectId) {
        const isOwner = routeProject?.client_id?.toString() === user?.id || routeProject?.client_id?.toString() === user?._id;
        const isSelectedFreelancer = routeProject?.selected_freelancer_id?.toString() === user?.id || routeProject?.selected_freelancer_id?.toString() === user?._id;

        return (
            <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate('/marketplace')}
                        style={{
                            padding: '0.75rem 1rem',
                            background: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#475569'
                        }}
                    >
                        ← Back to Marketplace
                    </button>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Marketplace Project</h1>
                </div>

                {routeProjectLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading project...</div>
                ) : routeProject ? (
                    renderProjectCard(routeProject, isOwner, isSelectedFreelancer)
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <p style={{ margin: 0, color: '#475569', fontSize: '1rem' }}>Project not found.</p>
                        <p style={{ marginTop: '0.5rem', color: '#94a3b8' }}>It may have been removed or is not available for your account.</p>
                    </div>
                )}
            </div>
        );
    }

    // Render the main marketplace view
    return (
        <div style={{ padding: 'clamp(1rem, 2vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: 0 }}>Project Marketplace</h1>
                <button
                    onClick={() => setShowPostForm(!showPostForm)}
                    style={{
                        padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(1rem, 2vw, 1.5rem)',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)'
                    }}
                >
                    <Plus size={18} />
                    Post a Project
                </button>
            </div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', overflowX: 'auto' }}>
                {['browse', 'my-projects', 'my-bids', 'active-projects'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setSelectedProject(null);
                            setShowBidForm(null);
                        }}
                        style={{
                            padding: 'clamp(0.5rem, 1.2vw, 0.75rem) clamp(0.75rem, 1.5vw, 1.5rem)',
                            background: activeTab === tab ? '#3b82f6' : 'transparent',
                            color: activeTab === tab ? 'white' : '#6b7280',
                            border: 'none',
                            borderRadius: '8px 8px 0 0',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab ? '500' : 'normal',
                            fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)',
                            whiteSpace: 'nowrap'
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
                    padding: 'clamp(1rem, 2vw, 1.5rem)',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: 'clamp(1.1rem, 2.5vw, 1.25rem)' }}>Post a New Project</h2>
                    <form onSubmit={handlePostProject}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Project Title"
                                value={newProject.title}
                                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                                required
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
                            />
                            <select
                                value={newProject.category}
                                onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
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
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '1rem', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)', boxSizing: 'border-box' }}
                        />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="number"
                                placeholder="Min Budget ($)"
                                value={newProject.budget_min}
                                onChange={(e) => setNewProject({ ...newProject, budget_min: e.target.value })}
                                required
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
                            />
                            <input
                                type="number"
                                placeholder="Max Budget ($)"
                                value={newProject.budget_max}
                                onChange={(e) => setNewProject({ ...newProject, budget_max: e.target.value })}
                                required
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
                            />
                            <input
                                type="text"
                                placeholder="Duration (e.g., 2 weeks)"
                                value={newProject.duration}
                                onChange={(e) => setNewProject({ ...newProject, duration: e.target.value })}
                                required
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
                            />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Skills Required (comma separated)"
                                value={newProject.skills_required}
                                onChange={(e) => setNewProject({ ...newProject, skills_required: e.target.value })}
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
                            />
                            <input
                                type="date"
                                placeholder="Deadline"
                                value={newProject.deadline}
                                onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                                style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', flex: '1 1 auto', minWidth: '120px' }}>
                                Post Project
                            </button>
                            <button type="button" onClick={() => setShowPostForm(false)} style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', flex: '1 1 auto', minWidth: '120px' }}>
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
                            <p style={{ color: '#6b7280', fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>No bids placed yet</p>
                            <p style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: '#9ca3af' }}>
                                Browse open projects and place your first bid
                            </p>
                        </div>
                    ) : (
                        activeTab === 'my-bids' && myBids.map(bid => (
                            <div key={bid._id} style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: 'clamp(1rem, 2vw, 1.5rem)',
                                marginBottom: '1rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                                        <h3 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>
                                            {bid.project_id?.title || 'Project'}
                                        </h3>
                                        <p style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: '#6b7280' }}>
                                            Posted by: {bid.project_id?.client_name || 'Unknown'}
                                        </p>
                                        <p style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', marginTop: '0.5rem' }}>
                                            Your Bid: <strong>${bid.bid_amount}</strong>
                                        </p>
                                        <p style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: '#6b7280' }}>
                                            Estimated Days: {bid.estimated_days}
                                        </p>
                                        {bid.proposal && (
                                            <p style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: '#4b5563', marginTop: '0.25rem' }}>
                                                Proposal: {bid.proposal}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                    
                    {activeTab === 'active-projects' && (
                        activeProjects.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <p style={{ color: '#6b7280', fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                                    No active projects assigned to you
                                </p>
                                <p style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)', color: '#9ca3af' }}>
                                    Browse open projects and place bids to get started
                                </p>
                            </div>
                        ) : (
                            // FIX: Use Map to ensure unique rendering
                            [...new Map(activeProjects.map(p => [p._id, p])).values()].map(project => 
                                renderProjectCard(project, false, false)
                            )
                        )
                    )}
                </>
            )}
        </div>
    );
};

export default Marketplace;
