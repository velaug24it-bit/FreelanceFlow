import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, DollarSign, TrendingUp, Crown,
  Calendar, Download, Edit, Trash2,
  CheckCircle, XCircle, Shield, Eye,
  Package, CreditCard, Briefcase, RefreshCw,
  AlertCircle, Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    monthlyRevenue: [],
    connectsRevenue: 0,
    subscriptionRevenue: 0,
    projectRevenue: 0,
    totalConnectsSold: 0
  });
  const [revenue, setRevenue] = useState({
    totalEarnings: 0,
    monthlyRevenue: [],
    connectsRevenue: 0,
    subscriptionRevenue: 0,
    projectRevenue: 0,
    totalConnectsSold: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ plan: 'free', status: 'active', amount: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [userDetail, setUserDetail] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      return;
    }
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError('');

      const token = localStorage.getItem('token');

      console.log('🔍 Fetching admin data...');

      const [usersRes, statsRes, revenueRes] = await Promise.all([
        axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/revenue`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      console.log('📦 Users:', usersRes.data.users?.length || 0);
      console.log('📊 Stats:', statsRes.data);
      console.log('💰 Revenue:', revenueRes.data);

      setUsers(usersRes.data.users || []);
      setStats(statsRes.data);
      setRevenue(revenueRes.data);
    } catch (err) {
      console.error('❌ Failed to fetch admin data:', err);
      if (err.response?.status === 403) {
        setError('Admin access required. Please login with admin account.');
      } else if (err.response?.status === 401) {
        setError('Please login to access admin panel');
      } else {
        setError('Failed to load admin data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching user details for:', userId);

      const response = await axios.get(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📦 User details:', response.data);
      setUserDetail(response.data);
      setShowUserDetail(true);
    } catch (err) {
      console.error('❌ Failed to fetch user details:', err);
      alert('Failed to load user details');
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
      alert('✅ Subscription updated successfully!');
    } catch (err) {
      console.error('Failed to update subscription:', err);
      alert('❌ Failed to update subscription');
    }
  };

  const deleteUser = async (userId, userName) => {
    if (window.confirm(`⚠️ Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchAdminData();
        alert('✅ User deleted successfully');
      } catch (err) {
        console.error('Failed to delete user:', err);
        alert('❌ Failed to delete user');
      }
    }
  };

  const exportReport = () => {
    const csvData = [
      ['Admin Revenue Report - FreelanceFlow'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['SUMMARY STATISTICS'],
      ['Total Earnings', `₹${revenue.totalEarnings?.toFixed(2) || '0.00'}`],
      ['Connects Revenue', `₹${revenue.connectsRevenue?.toFixed(2) || '0.00'}`],
      ['Subscription Revenue', `₹${revenue.subscriptionRevenue?.toFixed(2) || '0.00'}`],
      ['Project Revenue', `₹${revenue.projectRevenue?.toFixed(2) || '0.00'}`],
      ['Total Connects Sold', revenue.totalConnectsSold || 0],
      ['Total Users', stats.totalUsers || 0],
      ['Active Subscriptions', stats.activeSubscriptions || 0],
      [''],
      ['MONTHLY REVENUE BREAKDOWN'],
      ['Month', 'Revenue', 'New Subscribers'],
      ...(revenue.monthlyRevenue || []).map(m => [
        m.month || 'Unknown',
        `₹${m.revenue?.toFixed(2) || '0.00'}`,
        m.new_subscribers || 0
      ]),
      [''],
      ['ALL USERS'],
      ['Name', 'Email', 'Plan', 'Clients', 'Projects', 'Revenue', 'Connects Revenue', 'Status'],
      ...users.map(u => [
        u.full_name || 'N/A',
        u.email || 'N/A',
        u.plan || 'free',
        u.client_count || 0,
        u.project_count || 0,
        `₹${u.total_revenue || 0}`,
        `₹${u.connects_revenue || 0}`,
        u.status || 'inactive'
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getPlanColor = (plan) => {
    const colors = {
      free: '#fef3c7',
      pro: '#dbeafe',
      business: '#d1fae5'
    };
    return colors[plan] || '#e5e7eb';
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span style={{ color: '#10b981' }}><CheckCircle size={18} /></span>;
    }
    return <span style={{ color: '#ef4444' }}><XCircle size={18} /></span>;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || (user.plan || 'free').toLowerCase() === filterPlan;
    return matchesSearch && matchesPlan;
  });

  // Chart data
  const chartData = (revenue.monthlyRevenue || []).map(item => ({
    month: item.month,
    revenue: item.revenue || 0,
    subscribers: item.new_subscribers || 0
  }));

  const pieData = [
    { name: 'Connects', value: revenue.connectsRevenue || 0 },
    { name: 'Subscriptions', value: revenue.subscriptionRevenue || 0 },
    { name: 'Projects', value: revenue.projectRevenue || 0 }
  ].filter(item => item.value > 0);

  const COLORS = ['#f59e0b', '#8b5cf6', '#10b981'];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            <Shield size={24} style={{ marginRight: '0.5rem' }} />
            Admin Dashboard
          </h1>
          <p style={{ color: '#6b7280' }}>Manage all companies, users, and track platform revenue</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchAdminData}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: refreshing ? 0.5 : 1
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={exportReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <Download size={18} />
            Export Full Report
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stats Cards - PRESERVED + NEW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* PRESERVED: Total Users */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#3b82f620', padding: '0.5rem', borderRadius: '12px' }}>
              <Users size={24} color="#3b82f6" />
            </div>
            <span style={{ fontSize: '0.875rem', color: '#3b82f6' }}>Total Companies</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalUsers}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Registered businesses</p>
        </div>

        {/* PRESERVED: Total Revenue */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '12px' }}>
              <DollarSign size={24} />
            </div>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Revenue</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(stats.totalRevenue)}</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>From all sources</p>
        </div>

        {/* PRESERVED: Active Subscriptions */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f59e0b20', padding: '0.5rem', borderRadius: '12px' }}>
              <Crown size={24} color="#f59e0b" />
            </div>
            <span style={{ fontSize: '0.875rem', color: '#f59e0b' }}>Active Subscriptions</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.activeSubscriptions}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Paying customers</p>
        </div>

        {/* NEW: Connects Sold */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f59e0b20', padding: '0.5rem', borderRadius: '12px' }}>
              <Package size={24} color="#f59e0b" />
            </div>
            <span style={{ fontSize: '0.875rem', color: '#f59e0b' }}>Connects Sold</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalConnectsSold || 0}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Total connects purchased</p>
        </div>
      </div>

      {/* Revenue Breakdown Cards - NEW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '1rem', border: '1px solid #fde68a' }}>
          <p style={{ fontSize: '0.75rem', color: '#92400e' }}>Connects Revenue</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e' }}>
            {formatCurrency(stats.connectsRevenue || 0)}
          </p>
        </div>
        <div style={{ background: '#ede9fe', borderRadius: '12px', padding: '1rem', border: '1px solid #c4b5fd' }}>
          <p style={{ fontSize: '0.75rem', color: '#6d28d9' }}>Subscription Revenue</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6d28d9' }}>
            {formatCurrency(stats.subscriptionRevenue || 0)}
          </p>
        </div>
        <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '1rem', border: '1px solid #a7f3d0' }}>
          <p style={{ fontSize: '0.75rem', color: '#065f46' }}>Project Revenue</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065f46' }}>
            {formatCurrency(stats.projectRevenue || 0)}
          </p>
        </div>
      </div>

      {/* Monthly Revenue Chart - PRESERVED */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
          <Calendar size={18} style={{ marginRight: '0.5rem' }} />
          Monthly Platform Revenue
        </h3>
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No revenue data available yet
          </div>
        ) : (
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${value}`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#667eea" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Revenue Distribution Pie Chart - NEW */}
      {pieData.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Revenue Distribution</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Search & Filter - NEW */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, background: 'white', padding: '0.25rem 1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <Search size={18} color="#6b7280" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem 0',
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              background: 'transparent'
            }}
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem'
          }}
        >
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Users Table - PRESERVED + NEW Columns */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>All Companies & Users</h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>Manage subscriptions and track individual company revenue</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>User</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Plan</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Connects</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Clients</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Projects</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id || user._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <p style={{ fontWeight: '500' }}>{user.full_name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.company_name || 'Individual'}</p>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>{user.email}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: getPlanColor(user.plan || 'free'),
                        color: user.plan === 'free' ? '#92400e' : '#065f46'
                      }}>
                        {user.plan === 'free' ? 'Free' : user.plan?.charAt(0).toUpperCase() + user.plan?.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>
                      {user.connects_balance || 0}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>{user.client_count || 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>{user.project_count || 0}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                      {formatCurrency(user.total_revenue || 0)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {getStatusBadge(user.status || 'active')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          const userId = user.id || user._id;
                          if (userId) {
                            fetchUserDetail(userId);
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
                          fontSize: '0.75rem'
                        }}
                      >
                        <Eye size={14} style={{ marginRight: '0.25rem' }} />
                        History
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setEditData({
                            plan: user.plan || 'free',
                            status: user.status || 'active',
                            amount: user.subscription_amount || 19
                          });
                          setShowEditModal(true);
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginRight: '0.5rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        <Edit size={14} style={{ marginRight: '0.25rem' }} />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(user.id || user._id, user.full_name)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        <Trash2 size={14} style={{ marginRight: '0.25rem' }} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{
          padding: '1rem',
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <span>Showing {filteredUsers.length} user(s)</span>
          <button
            onClick={fetchAdminData}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* User Detail Modal - NEW */}
      {showUserDetail && userDetail && (
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
            maxWidth: '900px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>{userDetail.user?.name || 'User'}</h2>
                <p style={{ color: '#6b7280' }}>{userDetail.user?.email}</p>
                <p style={{ color: '#6b7280' }}>Plan: <strong>{userDetail.user?.subscription_tier || 'Free'}</strong></p>
                <p style={{ color: '#6b7280' }}>Connects: <strong>{userDetail.user?.connects_balance || 0}</strong></p>
              </div>
              <button
                onClick={() => setShowUserDetail(false)}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Revenue</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                  {formatCurrency(userDetail.stats?.total_revenue || 0)}
                </p>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Connects Revenue</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {formatCurrency(userDetail.stats?.connects_revenue || 0)}
                </p>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Subscription Revenue</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {formatCurrency(userDetail.stats?.subscription_revenue || 0)}
                </p>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Connects Purchased</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {userDetail.stats?.total_connects_purchased || 0}
                </p>
              </div>
            </div>

            {/* Payment History */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Payment History ({userDetail.payments?.length || 0})</h3>
              {userDetail.payments?.length > 0 ? (
                <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetail.payments.map((payment, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.5rem' }}>
                            {new Date(payment.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.5rem' }}>{payment.description}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600' }}>
                            {formatCurrency(payment.amount)}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              background: payment.status === 'completed' ? '#d1fae5' : '#fef3c7',
                              color: payment.status === 'completed' ? '#065f46' : '#92400e'
                            }}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#6b7280' }}>No payment history</p>
              )}
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
              ) : <p style={{ color: '#6b7280' }}>No clients</p>}
            </div>

            {/* Projects */}
            <div>
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
                            <span style={{
                              padding: '0.15rem 0.5rem',
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
              ) : <p style={{ color: '#6b7280' }}>No projects</p>}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - PRESERVED */}
      {showEditModal && selectedUser && (
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
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Update Subscription</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>User: <strong>{selectedUser.full_name}</strong></p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Plan</label>
              <select
                value={editData.plan}
                onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }}
              >
                <option value="free">Free ($0/month)</option>
                <option value="pro">Pro ($19/month)</option>
                <option value="business">Business ($49/month)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Status</label>
              <select
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            {editData.plan !== 'free' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Monthly Amount ($)</label>
                <input
                  type="number"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={() => updateSubscription(selectedUser.id || selectedUser._id)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin {
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

export default AdminPanel;