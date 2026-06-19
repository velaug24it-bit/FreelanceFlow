import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, DollarSign, TrendingUp, Crown, 
  Download, Edit, Trash2, CheckCircle, 
  XCircle, LogOut, Shield, Eye, Search,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    monthlyRevenue: []
  });
  const [revenue, setRevenue] = useState({ totalEarnings: 0, monthlyRevenue: [] });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [userDetail, setUserDetail] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ plan: 'free', status: 'active' });
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
    
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [usersRes, statsRes, revenueRes] = await Promise.all([
        axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/revenue', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      console.log('Users data:', usersRes.data.users);
      setUsers(usersRes.data.users || []);
      setStats(statsRes.data);
      setRevenue(revenueRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    try {
      if (!userId) {
        alert('User ID is required');
        return;
      }
      
      const token = localStorage.getItem('token');
      console.log('Fetching user details for ID:', userId);
      const response = await axios.get(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('User details response:', response.data);
      setUserDetail(response.data);
      setShowUserDetail(true);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      alert('Failed to load user details. Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const updateSubscription = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/users/${userId}/subscription`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditModal(false);
      fetchAdminData();
      alert('Subscription updated successfully!');
    } catch (err) {
      console.error('Failed to update subscription:', err);
      alert('Failed to update subscription');
    }
  };

  const deleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchAdminData();
        alert('User deleted successfully');
      } catch (err) {
        console.error('Failed to delete user:', err);
        alert('Failed to delete user');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAdmin');
    navigate('/admin-login');
  };

  const exportReport = () => {
    const csvData = [
      ['Admin Revenue Report - FreelanceFlow'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['SUMMARY STATISTICS'],
      ['Total Earnings', `$${revenue.totalEarnings.toFixed(2)}`],
      ['Total Customers', stats.totalUsers],
      ['Active Subscriptions', stats.activeSubscriptions],
      [''],
      ['MONTHLY REVENUE'],
      ['Month', 'Revenue', 'New Subscribers'],
      ...revenue.monthlyRevenue.map(m => [m.month, `$${m.revenue}`, m.new_subscribers]),
      [''],
      ['ALL CUSTOMERS'],
      ['Name', 'Email', 'Plan', 'Clients', 'Projects', 'Revenue', 'Status'],
      ...users.map(u => [
        u.full_name || u.email,
        u.email,
        u.plan || 'free',
        u.client_count || 0,
        u.project_count || 0,
        `$${u.subscription_revenue || 0}`,
        u.status || 'active'
      ])
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freelanceflow_revenue_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const getPlanBadge = (plan) => {
    // Handle null, undefined, or empty
    if (!plan) {
      return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#f3f4f6', color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>Free</span>;
    }
    
    const planName = plan.toString().toLowerCase();
    
    if (planName === 'pro') {
      return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#fef3c7', color: '#f59e0b', fontSize: '0.75rem', fontWeight: '500' }}>Pro</span>;
    }
    if (planName === 'business') {
      return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#e0e7ff', color: '#8b5cf6', fontSize: '0.75rem', fontWeight: '500' }}>Business</span>;
    }
    return <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#f3f4f6', color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>Free</span>;
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <CheckCircle size={18} color="#10b981" />;
    }
    return <XCircle size={18} color="#ef4444" />;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || user.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  // Prepare chart data
  const chartData = revenue.monthlyRevenue.map(item => ({
    month: item.month,
    revenue: item.revenue,
    subscribers: item.new_subscribers
  })).reverse();

  if (loading) {
    return <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Admin Navbar */}
      <nav className="admin-nav">
        <div className="admin-nav-left">
          <Shield size={28} />
          <div>
            <h1 className="admin-brand">FreelanceFlow Admin</h1>
            <p className="admin-sub">Platform Management Dashboard</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost admin-logout">
          <LogOut size={18} />
          <span style={{ marginLeft: 8 }}>Logout</span>
        </button>
      </nav>

      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="muted">Manage all customers and track platform revenue</p>
          </div>
          <button onClick={exportReport} className="btn btn-success">
            <Download size={18} />
            <span style={{ marginLeft: 8 }}>Export Report</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="card stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#3b82f620', padding: '0.5rem', borderRadius: '12px' }}>
                <Users size={24} color="#3b82f6" />
              </div>
              <span style={{ fontSize: '0.875rem', color: '#3b82f6' }}>Total Customers</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalUsers}</p>
          </div>
          <div className="card stat-card stat-card--accent">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.12)', padding: '0.5rem', borderRadius: '12px' }}>
                <DollarSign size={24} />
              </div>
              <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Revenue</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(revenue.totalEarnings)}</p>
          </div>

          <div className="card stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f59e0b20', padding: '0.5rem', borderRadius: '12px' }}>
                <Crown size={24} color="#f59e0b" />
              </div>
              <span style={{ fontSize: '0.875rem', color: '#f59e0b' }}>Active Subscriptions</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.activeSubscriptions}</p>
          </div>
          <div className="card stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#10b98120', padding: '0.5rem', borderRadius: '12px' }}>
                <TrendingUp size={24} color="#10b981" />
              </div>
              <span style={{ fontSize: '0.875rem', color: '#10b981' }}>Monthly Revenue</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {formatCurrency(revenue.monthlyRevenue[0]?.revenue || 0)}
            </p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="card chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Monthly Revenue</h3>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', padding: '0.25rem 0.5rem', background: '#f3f4f6', borderRadius: '4px' }}>
              <Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Last 6 months
            </span>
          </div>
          
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <p>No revenue data available yet</p>
              <p style={{ fontSize: '0.875rem' }}>Revenue will appear when users purchase subscriptions</p>
            </div>
          ) : (
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Revenue']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="revenue" fill="#667eea" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Plan Distribution */}
        {users.length > 0 && (
          <div className="card plan-distribution">
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Plan Distribution</h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {['free', 'pro', 'business'].map(plan => {
                const count = users.filter(u => (u.plan || 'free').toLowerCase() === plan).length;
                const percentage = users.length > 0 ? (count / users.length * 100) : 0;
                const colors = { free: '#6b7280', pro: '#f59e0b', business: '#8b5cf6' };
                return (
                  <div key={plan} style={{ flex: 1, minWidth: '150px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500', color: colors[plan] }}>
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div style={{ background: '#e5e7eb', borderRadius: '10px', overflow: 'hidden', height: '8px' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: colors[plan],
                        borderRadius: '10px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="search-filter">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Search size={18} color="#6b7280" />
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }}
            />
          </div>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '8px' }}
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>

        {/* Customers Table */}
        <div className="card customers-table" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>All Customers</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage subscriptions and track revenue</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Customer</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Plan</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Clients</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Projects</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <p style={{ fontWeight: '500' }}>{user.full_name || user.email?.split('@')[0]}</p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.company_name || 'Individual'}</p>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>{user.email}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {getPlanBadge(user.plan)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{user.client_count || 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{user.project_count || 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                      {formatCurrency(user.subscription_revenue || 0)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {getStatusBadge(user.status)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          if (user.id) {
                            fetchUserDetail(user.id);
                          } else {
                            alert('User ID not found');
                          }
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginRight: '0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Eye size={14} /> History
                      </button>
                      <button
                        onClick={() => { 
                          setSelectedUser(user);
                          setEditData({
                            plan: user.plan || 'free',
                            status: user.status || 'active'
                          });
                          setShowEditModal(true);
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.full_name)}
                        className="btn btn-danger btn-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail Modal */}
        {showUserDetail && userDetail && (
          <div className="modal-overlay">
            <div className="modal modal-lg">
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: '1.5rem' }}>{userDetail.user?.name || 'User'}</h2>
                  <p style={{ color: '#6b7280' }}>{userDetail.user?.email}</p>
                  <p style={{ color: '#6b7280' }}>Plan: <strong>{userDetail.user?.subscription_tier || 'Free'}</strong></p>
                  <p style={{ color: '#6b7280' }}>Connects: <strong>{userDetail.user?.connects_balance || 0}</strong></p>
                </div>
                <button onClick={() => setShowUserDetail(false)} className="btn btn-danger">
                  Close
                </button>
              </div>

              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Revenue</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(userDetail.stats?.total_revenue || 0)}</p>
                </div>
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Net Income</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(userDetail.stats?.net_income || 0)}</p>
                </div>
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Subscription Revenue</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>{formatCurrency(userDetail.stats?.subscription_revenue || 0)}</p>
                </div>
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Active Contracts</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{userDetail.stats?.active_contracts || 0}</p>
                </div>
              </div>

              {/* Clients */}
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Clients ({userDetail.clients?.length || 0})</h3>
                {userDetail.clients?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead><tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Company</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Revenue</th>
                      </tr></thead>
                      <tbody>
                        {userDetail.clients.map((client, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '0.5rem' }}>{client.name}</td>
                            <td style={{ padding: '0.5rem' }}>{client.company || '-'}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(client.total_revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{ color: '#6b7280' }}>No clients yet</p>}
              </div>

              {/* Projects */}
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Projects ({userDetail.projects?.length || 0})</h3>
                {userDetail.projects?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead><tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Title</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Budget</th>
                      </tr></thead>
                      <tbody>
                        {userDetail.projects.map((project, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '0.5rem' }}>{project.title}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <span className={`badge ${project.status === 'completed' ? 'badge--active' : 'badge--inactive'}`}>
                                {project.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(project.budget)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{ color: '#6b7280' }}>No projects yet</p>}
              </div>

              {/* Invoices */}
              {userDetail.invoices && userDetail.invoices.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>Invoices ({userDetail.invoices.length})</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead><tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Number</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {userDetail.invoices.map((invoice, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '0.5rem' }}>{invoice.number}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(invoice.amount)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <span className={`badge ${invoice.status === 'paid' ? 'badge--active' : 'badge--inactive'}`}>
                                {invoice.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedUser && (
          <div className="modal-overlay">
            <div className="modal modal-sm">
              <h3>Update Subscription</h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Customer: <strong>{selectedUser.full_name}</strong></p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Plan</label>
                <select
                  value={editData.plan}
                  onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                  className="form-control"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro ($19/month)</option>
                  <option value="business">Business ($49/month)</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="form-control"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => updateSubscription(selectedUser.id)} className="btn btn-success" style={{ flex: 1 }}>
                  Save Changes
                </button>
                <button onClick={() => setShowEditModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;