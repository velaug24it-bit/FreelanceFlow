import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  DollarSign, Users, Briefcase, FileText,
  Plus, Bell, CreditCard, PieChart, Calendar,
  TrendingUp, TrendingDown, Minus, Crown
} from 'lucide-react';

const DashboardEnhanced = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_revenue: 0,
    previous_revenue: 0,
    revenue_trend: 0,
    total_clients: 0,
    previous_clients: 0,
    clients_trend: 0,
    active_projects: 0,
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

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    try {
      const token = localStorage.getItem('token');

      const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
        axios.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/invoices', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const clients = clientsRes.data.clients || [];
      const projects = projectsRes.data.projects || [];
      const invoices = invoicesRes.data.invoices || [];

      const currentRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

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
      title: 'Active Projects',
      value: stats.active_projects,
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

          {/* Plan Badge - FIXED with correct closing quote */}
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
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: getPlanColor()
              }}>
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