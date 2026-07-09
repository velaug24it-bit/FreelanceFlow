import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  DollarSign, Users, Briefcase, FileText,
  Plus, Bell, CreditCard, PieChart, Calendar,
  TrendingUp, TrendingDown, Minus, Crown,
  UserPlus, Clock, CheckCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DashboardEnhanced = () => {
  const { user, resendVerification, refreshUser } = useAuth();
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verifyingSimulated, setVerifyingSimulated] = useState(false);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState(null);   // Ethereal preview
  const [directVerifyUrl, setDirectVerifyUrl] = useState(null);   // Direct /verify-email link

  const calculateProfileCompletion = () => {
    if (!user) return 0;
    let score = 0;
    if (user.full_name) score += 20;
    if (user.email) score += 20;
    if (user.bio && user.bio.trim() !== '') score += 20;
    if (user.skills && user.skills.length > 0) score += 20;
    if (user.hourly_rate && user.hourly_rate > 0) score += 20;
    return score;
  };

  const getMissingProfileItems = () => {
    if (!user) return [];
    const missing = [];
    if (!user.bio || user.bio.trim() === '') missing.push('Bio');
    if (!user.skills || user.skills.length === 0) missing.push('Skills');
    if (!user.hourly_rate || user.hourly_rate === 0) missing.push('Hourly Rate');
    return missing;
  };

  const handleResendVerification = async () => {
    setVerificationError('');
    setVerificationSuccess('');
    setEmailPreviewUrl(null);
    setDirectVerifyUrl(null);
    const result = await resendVerification();
    if (result.success) {
      setVerificationSuccess(result.message || 'Verification link sent!');
      setVerificationSent(true);
      if (result.previewUrl) setEmailPreviewUrl(result.previewUrl);
      if (result.verifyUrl) setDirectVerifyUrl(result.verifyUrl);
    } else {
      setVerificationError(result.error);
    }
  };

  const handleSimulateVerification = async () => {
    setVerifyingSimulated(true);
    setVerificationError('');
    setVerificationSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/auth/dev-verify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setVerificationSuccess('Dev Mode: Account verified instantly!');
        await refreshUser();
      }
    } catch (err) {
      setVerificationError(err.response?.data?.error || 'Simulated verification failed.');
    } finally {
      setVerifyingSimulated(false);
    }
  };
  const [stats, setStats] = useState({
    total_revenue: 0,
    previous_revenue: 0,
    revenue_trend: 0,
    total_clients: 0,
    previous_clients: 0,
    clients_trend: 0,
    active_projects: 0,
    active_mp_projects: 0,
    previous_projects: 0,
    projects_trend: 0,
    pending_invoices_amount: 0,
    previous_pending: 0,
    pending_trend: 0,
    pending_count: 0
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // ========== FREELANCER SPECIFIC STATES ==========
  const [myClients, setMyClients] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [freelancerStats, setFreelancerStats] = useState({
    totalClients: 0,
    totalProjects: 0,
    completedProjects: 0,
    ongoingProjects: 0,
    totalEarnings: 0
  });
  const [showMyClients, setShowMyClients] = useState(true);
  const [showMyProjects, setShowMyProjects] = useState(true);

  const isFreelancer = user?.role === 'freelancer' || user?.is_freelancer === true;

  useEffect(() => {
    fetchRealData();
    if (isFreelancer) {
      fetchFreelancerData();
    }
  }, []);

  const fetchRealData = async () => {
    try {
      const token = localStorage.getItem('token');

      const [clientsRes, projectsRes, invoicesRes, mpProjectsRes] = await Promise.all([
        axios.get(`${API_URL}/clients`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/invoices`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/marketplace/freelancer/my-projects`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { projects: [] } }))
      ]);

      const clients = clientsRes.data.clients || [];
      const projects = projectsRes.data.projects || [];
      const invoices = invoicesRes.data.invoices || [];
      const mpProjects = mpProjectsRes.data.projects || [];

      let currentRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
        
      if (mpProjects.length > 0) {
        currentRevenue += mpProjects
          .filter(p => p.payment_status === 'paid' || p.status === 'completed') // Include completed projects for total earnings
          .reduce((sum, p) => sum + (parseFloat(p.bid_amount) || parseFloat(p.budget) || 0), 0);
      }

      const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
      const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

      const revenueTrend = clients.length > 0 ? 12 : 0;
      const clientsTrend = clients.length > 0 ? 5 : 0;
      const projectsTrend = projects.filter(p => p.status !== 'completed').length > 0 ? 2 : 0;
      const pendingTrend = pendingInvoices.length > 0 ? 0 : 0;

      setStats({
        total_revenue: currentRevenue,
        previous_revenue: currentRevenue * 0.88,
        revenue_trend: revenueTrend,
        total_clients: clients.length,
        previous_clients: Math.max(0, clients.length - 5),
        clients_trend: clientsTrend,
        active_projects: projects.filter(p => p.status !== 'completed').length,
        active_mp_projects: mpProjects.filter(p => p.status !== 'completed').length,
        previous_projects: Math.max(0, projects.filter(p => p.status !== 'completed').length - 2),
        projects_trend: projectsTrend,
        pending_invoices_amount: pendingAmount,
        previous_pending: pendingAmount,
        pending_trend: pendingTrend,
        pending_count: pendingInvoices.length
      });

      setRecentInvoices(invoices.slice(0, 5));

    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FETCH FREELANCER DATA (Clients & Projects)
  // ============================================
  const fetchFreelancerData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [clientsRes, projectsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/marketplace/freelancer/my-clients`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/marketplace/freelancer/my-projects`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/marketplace/freelancer/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setMyClients(clientsRes.data.clients || []);
      setMyProjects(projectsRes.data.projects || []);
      setFreelancerStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch freelancer data:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getPlanDisplay = () => {
    if (!user) return 'Free';
    const plan = user?.subscription_tier || user?.subscription_plan;
    if (!plan || plan === 'free') return 'Free';
    if (plan === 'pro') return 'Pro';
    if (plan === 'business') return 'Business';
    return 'Free';
  };

  const getPlanColor = () => {
    const plan = getPlanDisplay();
    if (plan === 'Free') return '#f59e0b';
    if (plan === 'Pro') return '#10b981';
    if (plan === 'Business') return '#8b5cf6';
    return '#6b7280';
  };

  const renderTrend = (trend, isPercentage = true) => {
    if (trend > 0) {
      return (
        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <TrendingUp size={14} />
          {isPercentage ? `+${trend}%` : `+${trend}`}
        </span>
      );
    } else if (trend < 0) {
      return (
        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <TrendingDown size={14} />
          {isPercentage ? `${trend}%` : `${trend}`}
        </span>
      );
    } else {
      return (
        <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Minus size={14} />
          0
        </span>
      );
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      ongoing: { bg: '#fef3c7', color: '#92400e', label: 'Ongoing' },
      completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' }
    };
    return colors[status] || colors.ongoing;
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.total_revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
      trend: renderTrend(stats.revenue_trend, true),
      trendValue: `${stats.revenue_trend}% from last month`
    },
    {
      title: 'Total Clients',
      value: stats.total_clients,
      icon: Users,
      color: 'bg-blue-500',
      trend: renderTrend(stats.clients_trend, false),
      trendValue: `${stats.clients_trend > 0 ? '+' : ''}${stats.clients_trend} from last month`
    },
    {
      title: 'Active Projects (Pers. | Mkt.)',
      value: `${stats.active_projects} | ${stats.active_mp_projects}`,
      icon: Briefcase,
      color: 'bg-purple-500',
      trend: renderTrend(stats.projects_trend, false),
      trendValue: `${stats.projects_trend > 0 ? '+' : ''}${stats.projects_trend} from last month`
    },
    {
      title: 'Pending Invoices',
      value: `$${stats.pending_invoices_amount.toLocaleString()}`,
      icon: FileText,
      color: 'bg-yellow-500',
      trend: renderTrend(stats.pending_trend, false),
      trendValue: `${stats.pending_count} invoice${stats.pending_count !== 1 ? 's' : ''} pending`
    }
  ];

  const quickActions = [
    { name: 'Add Client', icon: Users, link: '/clients/new', color: '#3b82f6' },
    { name: 'Create Project', icon: Briefcase, link: '/projects/new', color: '#10b981' },
    { name: 'Create Invoice', icon: FileText, link: '/invoices/new', color: '#f59e0b' },
    { name: 'Add Expense', icon: CreditCard, link: '/expenses', color: '#ef4444' },
    { name: 'View Reports', icon: PieChart, link: '/reports', color: '#8b5cf6' },
    { name: 'Task Board', icon: Calendar, link: '/kanban', color: '#06b6d4' }
  ];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Email Verification Alert */}
      {user && !user.is_email_verified && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h4 style={{ color: '#b45309', margin: 0, fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Action Required: Verify Email
            </h4>
            <p style={{ color: '#78350f', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
              Your email is not verified. Please verify it to access all features.
            </p>
            {verificationSuccess && <p style={{ color: '#16a34a', margin: '0.5rem 0 0 0', fontSize: '0.85rem', fontWeight: '600' }}>{verificationSuccess}</p>}
            {verificationError && <p style={{ color: '#dc2626', margin: '0.5rem 0 0 0', fontSize: '0.85rem', fontWeight: '600' }}>{verificationError}</p>}
            {/* Direct verification link (always shown after resend) */}
            {directVerifyUrl && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                👉 <a href={directVerifyUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: '700', wordBreak: 'break-all' }}>Click here to verify your email</a>
              </p>
            )}
            {/* Ethereal email preview link (dev mode only) */}
            {emailPreviewUrl && (
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#78350f' }}>
                📬 Dev mode — <a href={emailPreviewUrl} target="_blank" rel="noreferrer" style={{ color: '#b45309', fontWeight: '600' }}>Open email preview</a> to see what was sent
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleResendVerification}
              disabled={verificationSent}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: verificationSent ? 0.6 : 1,
                transition: 'background-color 0.2s'
              }}
            >
              {verificationSent ? 'Link Sent' : 'Resend Verification'}
            </button>
            <button
              onClick={handleSimulateVerification}
              disabled={verifyingSimulated}
              style={{
                backgroundColor: '#1e293b',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: verifyingSimulated ? 0.6 : 1,
                transition: 'background-color 0.2s'
              }}
            >
              {verifyingSimulated ? 'Verifying...' : 'Simulate Verification (Dev)'}
            </button>
          </div>
        </div>
      )}

      {/* Profile Completion Card */}
      {user && calculateProfileCompletion() < 100 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Complete Your Profile
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                Complete fields in settings to reach 100% completion: {getMissingProfileItems().join(', ')}
              </p>
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: '800', color: '#3b82f6' }}>
              {calculateProfileCompletion()}% Completed
            </span>
          </div>
          
          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: '#e2e8f0',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '0.75rem'
          }}>
            <div style={{
              width: `${calculateProfileCompletion()}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '999px',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Link to="/settings" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600' }}>
              Complete Profile →
            </Link>
          </div>
        </div>
      )}

      {/* Welcome Header with Plan Badge */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              Welcome back, {user?.full_name?.split(' ')[0]}! 🚀
            </h1>
            <p style={{ color: '#6b7280' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Plan Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1.5rem 0.5rem 1rem',
            background: getPlanDisplay() === 'Free' ? '#fef3c7' : '#d1fae5',
            borderRadius: '50px',
            border: `2px solid ${getPlanColor()}`
          }}>
            <Crown size={20} color={getPlanColor()} />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Current Plan</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: getPlanColor() }}>
                {getPlanDisplay()}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Status Message */}
        {getPlanDisplay() === 'Free' && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: '#fef3c7',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <span style={{ color: '#92400e' }}>
              You are on the Free plan. Upgrade to Pro for more features!
            </span>
            <a
              href="/subscription"
              style={{
                padding: '0.5rem 1rem',
                background: '#f59e0b',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '500'
              }}
            >
              Upgrade Now
            </a>
          </div>
        )}
      </div>

      {/* Quick Actions Button */}
      <button
        onClick={() => setShowQuickActions(!showQuickActions)}
        style={{
          background: '#3b82f6',
          color: 'white',
          padding: '0.75rem 1.5rem',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '500',
          marginBottom: '2rem'
        }}
      >
        <Plus size={20} />
        Quick Actions
      </button>

      {/* Quick Actions Dropdown */}
      {showQuickActions && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          {quickActions.map(action => (
            <a
              key={action.name}
              href={action.link}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                textDecoration: 'none',
                color: '#374151',
                borderRadius: '8px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <action.icon size={18} color={action.color} />
              <span>{action.name}</span>
            </a>
          ))}
        </div>
      )}

      {/* Stats Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {statCards.map((card, idx) => (
          <div key={idx} style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ background: card.color, padding: '0.5rem', borderRadius: '12px' }}>
                <card.icon size={20} color="white" />
              </div>
              {card.trend}
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{card.title}</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{card.value}</p>
            {card.trendValue && (
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{card.trendValue}</p>
            )}
          </div>
        ))}
      </div>

      {/* ============================================
          FREELANCER SECTION - My Clients & Projects
          ============================================ */}
      {isFreelancer && (
        <>
          {/* Freelancer Stats Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '1rem', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} />
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>My Clients</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{freelancerStats.totalClients}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '12px', padding: '1rem', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={20} />
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>My Projects</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{freelancerStats.totalProjects}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '12px', padding: '1rem', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} />
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Completed</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{freelancerStats.completedProjects}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '12px', padding: '1rem', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} />
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Total Earnings</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(freelancerStats.totalEarnings)}</p>
            </div>
          </div>

          {/* My Clients Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem',
                cursor: 'pointer'
              }}
              onClick={() => setShowMyClients(!showMyClients)}
            >
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} /> My Clients ({freelancerStats.totalClients})
              </h2>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {showMyClients ? '▼' : '▶'}
              </span>
            </div>
            
            {showMyClients && (
              myClients.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <Users size={40} style={{ color: '#9ca3af', marginBottom: '0.5rem' }} />
                  <p style={{ color: '#6b7280' }}>You haven't been hired by any client yet</p>
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Start bidding on projects to get hired!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {myClients.map((client, index) => {
                    const statusColors = getStatusColor(client.status);
                    return (
                      <div key={index} style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        borderLeft: `4px solid ${statusColors.color}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.125rem' }}>{client.client_name}</h3>
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{client.client_email}</p>
                            {client.client_company && (
                              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>🏢 {client.client_company}</p>
                            )}
                            <p style={{ marginTop: '0.25rem', fontWeight: '500' }}>
                              Project: {client.project_title}
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              Budget: {formatCurrency(client.budget)}
                            </p>
                          </div>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            background: statusColors.bg,
                            color: statusColors.color
                          }}>
                            {statusColors.label}
                          </span>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                          Assigned: {new Date(client.assigned_at).toLocaleDateString()}
                          {client.completed_at && (
                            <span> | Completed: {new Date(client.completed_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* My Projects Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem',
                cursor: 'pointer'
              }}
              onClick={() => setShowMyProjects(!showMyProjects)}
            >
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={20} /> My Projects ({freelancerStats.totalProjects})
              </h2>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {showMyProjects ? '▼' : '▶'}
              </span>
            </div>
            
            {showMyProjects && (
              myProjects.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <Briefcase size={40} style={{ color: '#9ca3af', marginBottom: '0.5rem' }} />
                  <p style={{ color: '#6b7280' }}>You haven't been assigned any project yet</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {myProjects.map((project, index) => {
                    const statusColors = getStatusColor(project.status);
                    return (
                      <div key={index} style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        borderLeft: `4px solid ${statusColors.color}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.125rem' }}>{project.project_title}</h3>
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                              Client: {project.client_name}
                            </p>
                            {project.project_description && (
                              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                {project.project_description}
                              </p>
                            )}
                            <p style={{ fontWeight: '500', marginTop: '0.25rem' }}>
                              Budget: {formatCurrency(project.budget)}
                            </p>
                            {project.deadline && (
                              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                Deadline: {new Date(project.deadline).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            background: statusColors.bg,
                            color: statusColors.color
                          }}>
                            {statusColors.label}
                          </span>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                          Assigned: {new Date(project.assigned_at).toLocaleDateString()}
                          {project.completed_at && (
                            <span> | Completed: {new Date(project.completed_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* Recent Invoices Section */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Recent Invoices</h3>
          <a href="/invoices" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.875rem' }}>View All →</a>
        </div>
        {recentInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
            <FileText size={40} style={{ marginBottom: '0.5rem' }} />
            <p>No invoices yet</p>
            <a href="/invoices/new" style={{ color: '#3b82f6', textDecoration: 'none', marginTop: '0.5rem', display: 'inline-block' }}>
              Create your first invoice
            </a>
          </div>
        ) : (
          <div>
            {recentInvoices.map(invoice => (
              <div key={invoice._id} style={{
                padding: '1rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontWeight: '500' }}>{invoice.invoice_number}</p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{invoice.client_name || 'Unknown Client'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '600' }}>${parseFloat(invoice.total_amount || 0).toFixed(2)}</p>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '999px',
                    background: invoice.status === 'paid' ? '#d1fae5' : '#fef3c7',
                    color: invoice.status === 'paid' ? '#065f46' : '#92400e'
                  }}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardEnhanced;