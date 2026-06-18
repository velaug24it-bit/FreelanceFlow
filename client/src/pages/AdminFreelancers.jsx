import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, DollarSign, Briefcase, FileText, 
  TrendingUp, TrendingDown, Eye, Calendar,
  Search, Filter, Download, ChevronDown,
  Shield, LogOut
} from 'lucide-react';

const AdminFreelancers = () => {
    const [freelancers, setFreelancers] = useState([]);
    const [selectedFreelancer, setSelectedFreelancer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const isAdmin = localStorage.getItem('isAdmin');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token || isAdmin !== 'true' || user.role !== 'admin') {
            navigate('/admin-login');
            return;
        }
        
        fetchFreelancers();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAdmin');
        navigate('/admin-login');
    };

    const fetchFreelancers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/admin/freelancers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFreelancers(response.data.freelancers || []);
        } catch (err) {
            console.error('Failed to fetch freelancers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFreelancerDetails = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/admin/freelancers/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedFreelancer(response.data);
        } catch (err) {
            console.error('Failed to fetch freelancer details:', err);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getPlanBadge = (plan) => {
        const colors = {
            free: { bg: '#f3f4f6', color: '#6b7280' },
            pro: { bg: '#fef3c7', color: '#f59e0b' },
            business: { bg: '#e0e7ff', color: '#8b5cf6' }
        };
        const style = colors[plan] || colors.free;
        return (
            <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                background: style.bg,
                color: style.color,
                fontSize: '0.75rem',
                fontWeight: '500'
            }}>
                {plan || 'Free'}
            </span>
        );
    };

    const filteredFreelancers = freelancers.filter(f => {
        const matchesSearch = f.freelancer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             f.freelancer.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPlan = filterPlan === 'all' || f.freelancer.subscription_tier === filterPlan;
        return matchesSearch && matchesPlan;
    });

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading freelancers...</div>;
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
            {/* Admin Navbar */}
            <nav style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Shield size={28} />
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>FreelanceFlow Admin</h1>
                        <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>Freelancer Management</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={() => navigate('/admin-dashboard')}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={18} style={{ marginRight: '0.5rem' }} />
                        Logout
                    </button>
                </div>
            </nav>

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Freelancer Management</h1>
                        <p style={{ color: '#6b7280' }}>View all freelancers and their complete history</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Search freelancers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                minWidth: '200px'
                            }}
                        />
                        <select
                            value={filterPlan}
                            onChange={(e) => setFilterPlan(e.target.value)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px'
                            }}
                        >
                            <option value="all">All Plans</option>
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="business">Business</option>
                        </select>
                    </div>
                </div>

                {/* Stats Overview */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Freelancers</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{freelancers.length}</p>
                    </div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Pro Users</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {freelancers.filter(f => f.freelancer.subscription_tier === 'pro').length}
                        </p>
                    </div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Business Users</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {freelancers.filter(f => f.freelancer.subscription_tier === 'business').length}
                        </p>
                    </div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Revenue Generated</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {formatCurrency(freelancers.reduce((sum, f) => sum + (f.stats?.total_revenue || 0), 0))}
                        </p>
                    </div>
                </div>

                {/* Freelancers Table */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    overflow: 'auto',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Freelancer</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Plan</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Clients</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Projects</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Revenue</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Bids</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Won</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFreelancers.map((item) => {
                                const f = item.freelancer;
                                const stats = item.stats || {};
                                return (
                                    <tr key={f.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div>
                                                <p style={{ fontWeight: '500' }}>{f.name}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{f.email}</p>
                                                {f.company_name && <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{f.company_name}</p>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            {getPlanBadge(f.subscription_tier)}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>
                                            {stats.total_clients || 0}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>
                                            {stats.total_projects || 0}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                                            {formatCurrency(stats.total_revenue || 0)}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>
                                            {stats.bids_placed || 0}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500', color: '#10b981' }}>
                                            {stats.bids_won || 0}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => fetchFreelancerDetails(f.id)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <Eye size={16} />
                                                View History
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Freelancer Details Modal */}
                {selectedFreelancer && (
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
                        zIndex: 1000,
                        overflow: 'auto',
                        padding: '2rem'
                    }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '2rem',
                            maxWidth: '1000px',
                            width: '95%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem' }}>{selectedFreelancer.freelancer.name}</h2>
                                    <p style={{ color: '#6b7280' }}>{selectedFreelancer.freelancer.email}</p>
                                    <p style={{ color: '#6b7280' }}>Joined: {formatDate(selectedFreelancer.freelancer.joined_date)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedFreelancer(null)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                            </div>

                            {/* Stats Cards */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Revenue</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                                        {formatCurrency(selectedFreelancer.stats.total_revenue)}
                                    </p>
                                </div>
                                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Net Income</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                        {formatCurrency(selectedFreelancer.stats.net_income)}
                                    </p>
                                </div>
                                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Conversion Rate</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                                        {selectedFreelancer.stats.conversion_rate || 0}%
                                    </p>
                                </div>
                                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Active Contracts</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                                        {selectedFreelancer.stats.active_contracts || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Clients List */}
                            <div style={{ marginBottom: '1rem' }}>
                                <h3 style={{ marginBottom: '0.5rem' }}>Clients ({selectedFreelancer.clients?.length || 0})</h3>
                                {selectedFreelancer.clients?.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f9fafb' }}>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Company</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedFreelancer.clients.map((client, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                        <td style={{ padding: '0.5rem' }}>{client.name}</td>
                                                        <td style={{ padding: '0.5rem' }}>{client.company || '-'}</td>
                                                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(client.total_revenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: '#6b7280' }}>No clients yet</p>
                                )}
                            </div>

                            {/* Projects List */}
                            <div style={{ marginBottom: '1rem' }}>
                                <h3 style={{ marginBottom: '0.5rem' }}>Projects ({selectedFreelancer.projects?.length || 0})</h3>
                                {selectedFreelancer.projects?.length > 0 ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f9fafb' }}>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Title</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Budget</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedFreelancer.projects.map((project, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                        <td style={{ padding: '0.5rem' }}>{project.title}</td>
                                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                            <span style={{
                                                                padding: '0.25rem 0.5rem',
                                                                borderRadius: '12px',
                                                                fontSize: '0.7rem',
                                                                background: project.status === 'completed' ? '#d1fae5' : '#fef3c7',
                                                                color: project.status === 'completed' ? '#065f46' : '#92400e'
                                                            }}>
                                                                {project.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(project.budget)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: '#6b7280' }}>No projects yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFreelancers;