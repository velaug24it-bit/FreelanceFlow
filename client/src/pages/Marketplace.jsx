import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, DollarSign, Clock, Users, Plus, Check, X, Star, Heart, ShieldCheck, Zap, Award, BellRing, Trash2, ExternalLink, MessageCircle, Send, Flag, Sparkles } from 'lucide-react';
import { useNavigate as useNav } from 'react-router-dom';
import ProjectStatus from '../components/ProjectStatus';
import ProjectPayment from '../components/ProjectPayment';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

if (!document.querySelector('style[data-marketplace-addons-responsive]')) {
    const s = document.createElement('style');
    s.setAttribute('data-marketplace-addons-responsive', 'true');
    s.textContent = `
        @media (max-width: 700px) {
            .marketplace-addon-grid {
                grid-template-columns: 1fr !important;
            }
            .marketplace-addon-actions {
                width: 100% !important;
                justify-content: stretch !important;
            }
            .marketplace-addon-actions button {
                flex: 1 1 auto !important;
            }
            .marketplace-message-row {
                max-width: 100% !important;
            }
        }
    `;
    document.head.appendChild(s);
}

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
    const [aiDescLoading, setAiDescLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectBids, setProjectBids] = useState({});
    const [reviewDrafts, setReviewDrafts] = useState({});
    const [savedSearches, setSavedSearches] = useState([]);
    const [showSavedSearchForm, setShowSavedSearchForm] = useState(false);
    const [savedSearchForm, setSavedSearchForm] = useState({
        name: '',
        category: 'Any',
        skills: '',
        budget_min: '',
        budget_max: ''
    });
    const [activeBidThread, setActiveBidThread] = useState(null);
    const [bidMessages, setBidMessages] = useState({});
    const [bidMessageInputs, setBidMessageInputs] = useState({});
    
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
        if (user?.role === 'freelancer') {
            fetchSavedSearches();
        }
    }, [user?.role]);

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

    const fetchSavedSearches = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_URL}/marketplace/saved-searches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavedSearches(res.data.searches || []);
        } catch (err) {
            console.error('Error fetching saved searches:', err);
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

    const [proposalAnalysis, setProposalAnalysis] = useState({});
    const [proposalAnalysisLoading, setProposalAnalysisLoading] = useState({});

    const handleAnalyzeProposal = async (projectId, projectDesc) => {
        if (!proposals[projectId] || proposals[projectId].trim() === '') {
            alert('Please type a proposal description first.');
            return;
        }
        setProposalAnalysisLoading(prev => ({ ...prev, [projectId]: true }));
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/ai/proposals/analyze`, {
                proposal_text: proposals[projectId],
                project_description: projectDesc,
                bid_amount: parseFloat(bidAmounts[projectId]) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                setProposalAnalysis(prev => ({ ...prev, [projectId]: res.data.analysis }));
            }
        } catch (err) {
            console.error('Proposal analyzer error:', err);
            alert('Could not complete proposal audit.');
        } finally {
            setProposalAnalysisLoading(prev => ({ ...prev, [projectId]: false }));
        }
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

    const handleAcceptBid = async (projectId, bidId, bidAmount, freelancerName, project) => {
        if (!window.confirm(`Accept bid of $${bidAmount}? This will create a contract.`)) return;
        
        const token = localStorage.getItem('token');
        
        try {
            const res = await axios.put(`${API_URL}/marketplace/bids/${bidId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // After accepting, redirect to AI Toolkit contract generator with pre-filled data
            const params = new URLSearchParams({
                tab: 'contracts',
                projectId: projectId,
                clientName: user?.full_name || user?.name || 'Client',
                freelancerName: freelancerName || 'Freelancer',
                amount: bidAmount,
                startDate: new Date().toISOString().split('T')[0],
                endDate: project?.deadline || ''
            });
            alert(res.data?.message || 'Bid accepted! Redirecting to AI Contract Generator...');
            fetchData();
            window.location.href = `/ai-toolkit?${params.toString()}`;
        } catch (err) {
            console.error('Error accepting bid:', err);
            const errorMessage = err.response?.data?.error || 'Failed to accept bid';
            alert(errorMessage);
        }
    };

    const handleSaveSearch = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_URL}/marketplace/saved-searches`, {
                ...savedSearchForm,
                skills: savedSearchForm.skills.split(',').map(skill => skill.trim()).filter(Boolean)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavedSearchForm({ name: '', category: 'Any', skills: '', budget_min: '', budget_max: '' });
            setShowSavedSearchForm(false);
            fetchSavedSearches();
            alert('Saved search alert created!');
        } catch (err) {
            console.error('Error saving search:', err);
            alert(err.response?.data?.error || 'Failed to save search');
        }
    };

    const toggleSavedSearch = async (search) => {
        const token = localStorage.getItem('token');
        try {
            await axios.patch(`${API_URL}/marketplace/saved-searches/${search._id}`, {
                is_active: !search.is_active
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSavedSearches();
        } catch (err) {
            console.error('Error updating saved search:', err);
            alert(err.response?.data?.error || 'Failed to update saved search');
        }
    };

    const deleteSavedSearch = async (searchId) => {
        if (!window.confirm('Delete this saved search alert?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_URL}/marketplace/saved-searches/${searchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSavedSearches();
        } catch (err) {
            console.error('Error deleting saved search:', err);
            alert(err.response?.data?.error || 'Failed to delete saved search');
        }
    };

    const getBidThreadKey = (projectId, bidId) => `${projectId}:${bidId}`;

    const fetchBidMessages = async (projectId, bidId) => {
        const token = localStorage.getItem('token');
        const key = getBidThreadKey(projectId, bidId);
        try {
            const res = await axios.get(`${API_URL}/marketplace/projects/${projectId}/bids/${bidId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBidMessages(prev => ({ ...prev, [key]: res.data.messages || [] }));
        } catch (err) {
            console.error('Error fetching pre-hire messages:', err);
            alert(err.response?.data?.error || 'Failed to load messages');
        }
    };

    const toggleBidThread = (projectId, bidId) => {
        const key = getBidThreadKey(projectId, bidId);
        if (activeBidThread === key) {
            setActiveBidThread(null);
            return;
        }
        setActiveBidThread(key);
        fetchBidMessages(projectId, bidId);
    };

    const sendBidMessage = async (projectId, bidId) => {
        const key = getBidThreadKey(projectId, bidId);
        const message = (bidMessageInputs[key] || '').trim();
        if (!message) return;

        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_URL}/marketplace/projects/${projectId}/bids/${bidId}/messages`, { message }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBidMessageInputs(prev => ({ ...prev, [key]: '' }));
            fetchBidMessages(projectId, bidId);
        } catch (err) {
            console.error('Error sending pre-hire message:', err);
            alert(err.response?.data?.error || 'Failed to send message');
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
            console.error('Error reporting item:', err);
            alert(err.response?.data?.error || 'Failed to submit report');
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
        const availabilityLabel = profile.availability_status === 'busy' ? 'Busy' : profile.availability_status === 'away' ? 'Away' : 'Available now';
        const availabilityColor = profile.availability_status === 'busy' ? '#b45309' : profile.availability_status === 'away' ? '#64748b' : '#047857';
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.35rem', color: '#475569', fontSize: '0.78rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <strong>{profile.average_rating ? profile.average_rating.toFixed(1) : 'New'}</strong>
                    {profile.reviews_count > 0 ? `(${profile.reviews_count})` : ''}
                </span>
                <span>{profile.completed_projects || 0} completed</span>
                <span style={{ color: availabilityColor, fontWeight: 700 }}>{availabilityLabel}</span>
                <span>Responds within {profile.response_time_hours || 24}h</span>
                {renderBadges(profile.badges)}
            </div>
        );
    };

    const renderBidThread = (projectId, bidId) => {
        const key = getBidThreadKey(projectId, bidId);
        if (activeBidThread !== key) return null;
        const messages = bidMessages[key] || [];

        return (
            <div style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {messages.length === 0 ? (
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>No questions yet.</p>
                    ) : messages.map(message => {
                        const isMine = message.sender_id === user?._id || message.sender_id === user?.id;
                        return (
                            <div key={message._id} className="marketplace-message-row" style={{ justifySelf: isMine ? 'end' : 'start', maxWidth: '78%', padding: '0.55rem 0.7rem', borderRadius: '8px', background: isMine ? '#dbeafe' : '#f1f5f9', color: '#0f172a' }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{message.sender_name}</div>
                                <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{message.message}</div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="Ask a question before hiring"
                        value={bidMessageInputs[key] || ''}
                        onChange={(e) => setBidMessageInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') sendBidMessage(projectId, bidId);
                        }}
                        style={{ flex: 1, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', minWidth: 0 }}
                    />
                    <button
                        type="button"
                        onClick={() => sendBidMessage(projectId, bidId)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 0.8rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                    >
                        <Send size={15} />
                        Send
                    </button>
                </div>
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
                    <button
                        type="button"
                        onClick={() => reportTarget('project', project._id, project.title)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'white',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)',
                            flex: '1 1 auto',
                            minWidth: '100px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <Flag size={15} /> Report
                    </button>
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
                                                <>
                                                    <button
                                                        type="button"
                                                        title="View public profile"
                                                        onClick={() => navigate(`/freelancers/${bid.freelancer_profile.freelancer_id}`)}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: 'white',
                                                            color: '#2563eb',
                                                            border: '1px solid #dbeafe',
                                                            borderRadius: '999px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <ExternalLink size={15} />
                                                    </button>
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
                                                </>
                                            )}
                                        </div>
                                        {renderSocialProof(bid.freelancer_profile)}
                                        <p style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)' }}>Bid: <strong>${bid.bid_amount}</strong></p>
                                        <p style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)', color: '#6b7280' }}>Days: {bid.estimated_days}</p>
                                        <p style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)' }}>Proposal: {bid.proposal}</p>
                                    </div>
                                    <div className="marketplace-addon-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            onClick={() => toggleBidThread(project._id, bid._id)}
                                            style={{
                                                padding: '0.5rem 0.8rem',
                                                background: '#eff6ff',
                                                color: '#2563eb',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <MessageCircle size={15} /> Message
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => reportTarget('bid', bid._id, `${bid.freelancer_name} bid on ${project.title}`)}
                                            style={{
                                                padding: '0.5rem 0.8rem',
                                                background: 'white',
                                                color: '#b45309',
                                                border: '1px solid #fde68a',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <Flag size={15} /> Report
                                        </button>
                                        {bid.status === 'pending' && (
                                            <button
                                                onClick={() => handleAcceptBid(project._id, bid._id, bid.bid_amount, bid.freelancer_name, project)}
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
                                    {renderBidThread(project._id, bid._id)}
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
                                <button
                                    type="button"
                                    onClick={() => handleAnalyzeProposal(project._id, project.description)}
                                    disabled={proposalAnalysisLoading[project._id]}
                                    style={{
                                        background: '#eff6ff',
                                        color: '#2563eb',
                                        border: '1px dashed #3b82f6',
                                        padding: '0.45rem 0.85rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        marginTop: '0.5rem',
                                        display: 'block',
                                        width: 'fit-content'
                                    }}
                                >
                                    {proposalAnalysisLoading[project._id] ? 'Analyzing Proposal...' : '🔍 Analyze pitch with AI'}
                                </button>
                                
                                {proposalAnalysis[project._id] && (
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                                            <div style={{ background: 'white', padding: '0.25rem', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Pitch</div>
                                                <strong style={{ color: '#4f46e5' }}>{proposalAnalysis[project._id].professionalism}%</strong>
                                            </div>
                                            <div style={{ background: 'white', padding: '0.25rem', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Grammar</div>
                                                <strong style={{ color: '#4f46e5' }}>{proposalAnalysis[project._id].grammar_completeness}%</strong>
                                            </div>
                                            <div style={{ background: 'white', padding: '0.25rem', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Relevance</div>
                                                <strong style={{ color: '#4f46e5' }}>{proposalAnalysis[project._id].relevance}%</strong>
                                            </div>
                                            <div style={{ background: 'white', padding: '0.25rem', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Hired %</div>
                                                <strong style={{ color: '#10b981' }}>{proposalAnalysis[project._id].selection_probability}%</strong>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                                            <strong>AI Recommendations:</strong>
                                            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1rem', color: '#64748b' }}>
                                                {proposalAnalysis[project._id].suggestions?.slice(0, 2).map((s, idx) => (
                                                    <li key={idx}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'start' }}>
                            <select
                                value={reviewDrafts[project._id]?.rating || 5}
                                onChange={(e) => handleReviewDraftChange(project._id, 'rating', Number(e.target.value))}
                                style={{ padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', flex: '0 0 auto' }}
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
                                style={{ flex: '1 1 200px', padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <button
                                type="button"
                                onClick={() => handleSubmitReview(project._id)}
                                style={{ flex: '0 0 auto', padding: '0.7rem 1rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
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

            {activeTab === 'browse' && user?.role === 'freelancer' && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <BellRing size={18} color="#2563eb" />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Saved job alerts</h3>
                                <p style={{ margin: '0.15rem 0 0', color: '#64748b', fontSize: '0.82rem' }}>Get notified when new projects match your category, skills, and budget.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowSavedSearchForm(!showSavedSearchForm)}
                            style={{ padding: '0.55rem 0.9rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            {showSavedSearchForm ? 'Close' : 'Create Alert'}
                        </button>
                    </div>

                    {showSavedSearchForm && (
                        <form onSubmit={handleSaveSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Alert name"
                                value={savedSearchForm.name}
                                onChange={(e) => setSavedSearchForm({ ...savedSearchForm, name: e.target.value })}
                                style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <select
                                value={savedSearchForm.category}
                                onChange={(e) => setSavedSearchForm({ ...savedSearchForm, category: e.target.value })}
                                style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            >
                                <option>Any</option>
                                <option>Web Development</option>
                                <option>Mobile App</option>
                                <option>Design</option>
                                <option>Content Writing</option>
                                <option>Marketing</option>
                                <option>Other</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Skills, comma separated"
                                value={savedSearchForm.skills}
                                onChange={(e) => setSavedSearchForm({ ...savedSearchForm, skills: e.target.value })}
                                style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                                type="number"
                                placeholder="Min budget"
                                value={savedSearchForm.budget_min}
                                onChange={(e) => setSavedSearchForm({ ...savedSearchForm, budget_min: e.target.value })}
                                style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                                type="number"
                                placeholder="Max budget"
                                value={savedSearchForm.budget_max}
                                onChange={(e) => setSavedSearchForm({ ...savedSearchForm, budget_max: e.target.value })}
                                style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <button type="submit" style={{ padding: '0.65rem 0.9rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                                Save Alert
                            </button>
                        </form>
                    )}

                    {savedSearches.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            {savedSearches.map(search => (
                                <div key={search._id} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.55rem', border: '1px solid #e2e8f0', borderRadius: '999px', background: search.is_active ? '#f8fafc' : '#f1f5f9', color: search.is_active ? '#334155' : '#94a3b8', fontSize: '0.78rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => toggleSavedSearch(search)}
                                        title={search.is_active ? 'Pause alert' : 'Resume alert'}
                                        style={{ width: '18px', height: '18px', borderRadius: '999px', border: '1px solid #cbd5e1', background: search.is_active ? '#22c55e' : 'white', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontWeight: 600 }}>{search.name}</span>
                                    <span>{search.category}</span>
                                    {search.skills?.length > 0 && <span>{search.skills.join(', ')}</span>}
                                    <button
                                        type="button"
                                        title="Delete alert"
                                        onClick={() => deleteSavedSearch(search._id)}
                                        style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
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
                        
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Project Description</label>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!newProject.title.trim()) { alert('Enter a project title first.'); return; }
                                        setAiDescLoading(true);
                                        try {
                                            const token = localStorage.getItem('token');
                                            const res = await axios.post(`${API_URL}/ai/projects/generate-description`, { title: newProject.title, keywords: newProject.skills_required }, { headers: { Authorization: `Bearer ${token}` } });
                                            if (res.data?.success) {
                                                const d = res.data.data;
                                                const text = `${d.description}\n\nScope: ${d.scope_of_work?.join(', ')}\nDeliverables: ${d.deliverables?.join(', ')}\nRequired Skills: ${d.required_skills?.join(', ')}`;
                                                setNewProject(prev => ({ ...prev, description: text, budget_min: prev.budget_min || Math.round((d.suggested_budget || 0) * 0.7), budget_max: prev.budget_max || d.suggested_budget || '' }));
                                            }
                                        } catch(e) { alert('AI generation failed.'); }
                                        finally { setAiDescLoading(false); }
                                    }}
                                    disabled={aiDescLoading}
                                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px dashed #3b82f6', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Sparkles size={12} />{aiDescLoading ? 'Writing...' : 'AI Auto-Write'}
                                </button>
                            </div>
                            <textarea
                                placeholder="Project Description"
                                value={newProject.description}
                                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                rows="4"
                                required
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: 'clamp(0.75rem, 1.5vw, 1rem)', boxSizing: 'border-box' }}
                            />
                        </div>
                        
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
                        activeTab === 'my-bids' && myBids.map(bid => {
                            const bidProjectId = bid.project_id?._id || bid.project_id;
                            return (
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
                                    <div className="marketplace-addon-actions" style={{ textAlign: 'right', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        {bidProjectId && (
                                            <button
                                                type="button"
                                                onClick={() => toggleBidThread(bidProjectId, bid._id)}
                                                style={{ padding: '0.45rem 0.75rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                                            >
                                                <MessageCircle size={15} /> Message
                                            </button>
                                        )}
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            background: bid.status === 'accepted' ? '#d1fae5' : bid.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                            color: bid.status === 'accepted' ? '#065f46' : bid.status === 'rejected' ? '#991b1b' : '#92400e'
                                        }}>
                                            {bid.status === 'accepted' ? '✅ Accepted' : bid.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                                        </span>
                                        <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.25rem', width: '100%' }}>
                                            {new Date(bid.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                {bidProjectId && renderBidThread(bidProjectId, bid._id)}
                                
                                {bid.status === 'accepted' && bid.project_id?.status === 'completed' && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                                        <ProjectPayment project={bid.project_id} isFreelancer={true} />
                                    </div>
                                )}
                            </div>
                            );
                        })
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
