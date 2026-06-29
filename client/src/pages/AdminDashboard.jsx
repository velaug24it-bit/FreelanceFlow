// client/src/pages/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, DollarSign, TrendingUp, Crown, 
  Download, Edit, Trash2, CheckCircle, 
  XCircle, LogOut, Shield, Eye, Search,
  Calendar, Package, CreditCard, Briefcase,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    connectsRevenue: 0,
    subscriptionRevenue: 0,
    projectRevenue: 0,
    activeSubscriptions: 0,
    totalConnectsSold: 0,
    monthlyRevenue: []
  });
  const [revenue, setRevenue] = useState({ 
    totalEarnings: 0, 
    monthlyRevenue: [],
    connectsRevenue: 0,
    subscriptionRevenue: 0,
    projectRevenue: 0,
    totalConnectsSold: 0
  });
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [markingPayoutId, setMarkingPayoutId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ plan: 'free', status: 'active', amount: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [userDetail, setUserDetail] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAdminData();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('🔍 Fetching admin data...');
      
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      
      const [usersRes, statsRes, revenueRes] = await Promise.all([
        axios.get(`${API_URL}/admin/users`, headers),
        axios.get(`${API_URL}/admin/stats`, headers),
        axios.get(`${API_URL}/admin/revenue`, headers)
      ]);
      
      console.log('📦 Users:', usersRes.data.users?.length || 0);
      console.log('📊 Stats:', statsRes.data);
      console.log('💰 Revenue:', revenueRes.data);
      
      setUsers(usersRes.data.users || []);
      setStats(statsRes.data || {
        totalUsers: 0,
        totalRevenue: 0,
        connectsRevenue: 0,
        subscriptionRevenue: 0,
        projectRevenue: 0,
        activeSubscriptions: 0,
        totalConnectsSold: 0
      });
      setRevenue(revenueRes.data || {
        totalEarnings: 0,
        monthlyRevenue: [],
        connectsRevenue: 0,
        subscriptionRevenue: 0,
        projectRevenue: 0,
        totalConnectsSold: 0
      });

      await fetchPayouts();
    } catch (err) {
      console.error('❌ Failed to fetch admin data:', err);
      console.error('❌ Error response:', err.response?.data);
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

  const fetchPayouts = async () => {
    try {
      setPayoutsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/payments/admin/payouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayouts(response.data.payouts || []);
    } catch (err) {
      console.error('❌ Failed to fetch payouts:', err);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const markPayoutAsPaid = async (payoutId) => {
    try {
      setMarkingPayoutId(payoutId);
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/payments/admin/payouts/${payoutId}/mark-paid`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchPayouts();
      alert('✅ Payout marked as paid');
    } catch (err) {
      console.error('❌ Failed to mark payout as paid:', err);
      alert(err.response?.data?.error || 'Failed to mark payout as paid');
    } finally {
      setMarkingPayoutId(null);
    }
  };

  const fetchUserDetail = async (userId) => {
    try {
      setUserDetailLoading(true);
      setShowUserDetail(true);
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching user details for:', userId);
      
      const response = await axios.get(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📦 User details:', response.data);
      setUserDetail(response.data);
    } catch (err) {
      console.error('❌ Failed to fetch user details:', err);
      alert('Failed to load user details');
      setShowUserDetail(false);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const updateSubscription = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/admin/users/${userId}/subscription`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditModal(false);
      fetchAdminData();
      alert('✅ Subscription updated successfully!');
    } catch (err) {
      console.error('❌ Failed to update subscription:', err);
      alert('❌ Failed to update subscription');
    }
  };

  const deleteUser = async (userId, userName) => {
    if (window.confirm(`⚠️ Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchAdminData();
        alert('✅ User deleted successfully');
      } catch (err) {
        console.error('❌ Failed to delete user:', err);
        alert('❌ Failed to delete user');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const exportReport = () => {
    try {
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
      a.download = `freelanceflow_admin_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Failed to export report:', err);
      alert('Failed to export report. Please try again.');
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>🔐</div>
        <p style={{ color: '#6b7280' }}>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Admin Navbar */}
      <nav style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: isMobile ? '1rem' : '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
        flexWrap: 'wrap',
        gap: '1rem',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Shield size={28} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>FreelanceFlow Admin</h1>
            <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>Platform Management Dashboard</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'stretch' : 'flex-start' }}>
          <button
            onClick={() => navigate('/admin-freelancers')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <Users size={16} />
            Freelancers
          </button>
          <button
            onClick={fetchAdminData}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              opacity: refreshing ? 0.5 : 1,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      <div style={{ padding: isMobile ? '1rem' : '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
            <p style={{ color: '#6b7280' }}>Manage all customers and track platform revenue</p>
          </div>
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
              fontWeight: '500',
              transition: 'background 0.2s',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
          >
            <Download size={18} />
            Export Report
          </button>
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
            gap: '0.5rem',
            border: '1px solid #fecaca'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ background: '#3b82f620', padding: '0.4rem', borderRadius: '10px' }}>
                <Users size={20} color="#3b82f6" />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Customers</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.totalUsers || 0}</p>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ background: '#f59e0b20', padding: '0.4rem', borderRadius: '10px' }}>
                <Package size={20} color="#f59e0b" />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Connects Sold</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.totalConnectsSold || 0}</p>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ background: '#8b5cf620', padding: '0.4rem', borderRadius: '10px' }}>
                <Crown size={20} color="#8b5cf6" />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Active Subs</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stats.activeSubscriptions || 0}</p>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '1.25rem', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.4rem', borderRadius: '10px' }}>
                <DollarSign size={20} />
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Total Revenue</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Revenue Breakdown</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f9fafb', borderRadius: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={16} color="#f59e0b" /> Connects
                </span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(stats.connectsRevenue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f9fafb', borderRadius: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Crown size={16} color="#8b5cf6" /> Subscriptions
                </span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(stats.subscriptionRevenue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f9fafb', borderRadius: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={16} color="#10b981" /> Projects
                </span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(stats.projectRevenue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#e5e7eb', borderRadius: '8px', fontWeight: 'bold' }}>
                <span>Total</span>
                <span>{formatCurrency(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>

          {pieData.length > 0 && (
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Revenue Distribution</h3>
              <div style={{ height: '200px' }}>
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
        </div>

        {/* Monthly Revenue Chart */}
        {chartData.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>
                <Calendar size={16} style={{ marginRight: '0.5rem' }} />
                Monthly Revenue
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Last 6 months</span>
            </div>
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
          </div>
        )}

        {/* Manual Payout Ledger */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Manual Payout Ledger</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Track who needs to be paid, for which project, and how much.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', background: '#fef3c7', color: '#92400e', fontSize: '0.8rem', fontWeight: '600' }}>
                Pending: {payouts.filter(p => p.status === 'pending').length}
              </span>
              <span style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '0.8rem', fontWeight: '600' }}>
                Paid: {payouts.filter(p => p.status === 'paid').length}
              </span>
            </div>
          </div>

          {payoutsLoading ? (
            <p style={{ color: '#6b7280' }}>Loading payouts...</p>
          ) : payouts.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No payout records yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {payouts.map(payout => (
                <div key={payout._id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <strong>{payout.freelancer_id?.full_name || 'Freelancer'}</strong>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', background: payout.status === 'paid' ? '#dcfce7' : '#fef3c7', color: payout.status === 'paid' ? '#166534' : '#92400e', fontSize: '0.75rem', fontWeight: '600' }}>
                        {payout.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                      Project: {payout.project_id?.title || 'Unknown project'}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      Client: {payout.client_id?.full_name || 'Unknown client'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827' }}>{formatCurrency(payout.amount || 0)}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      {payout.notes || 'Manual payout pending'}
                    </p>
                    {payout.status !== 'paid' && (
                      <button
                        onClick={() => markPayoutAsPaid(payout._id)}
                        disabled={markingPayoutId === payout._id}
                        style={{ padding: '0.5rem 0.85rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        {markingPayoutId === payout._id ? 'Updating...' : 'Mark as Paid'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'stretch', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, background: 'white', padding: '0.25rem 1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: isMobile ? '100%' : 'auto' }}>
            <Search size={18} color="#6b7280" />
            <input
              type="text"
              placeholder="Search customers by name or email..."
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
              fontSize: '0.875rem',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>

        {/* Users Table */}
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>All Customers</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage subscriptions and track revenue</p>
          </div>
          <div style={{ display: isMobile ? 'none' : 'block', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Customer</th>
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
                    <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user._id || user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem' }}>
                        <div>
                          <p style={{ fontWeight: '500' }}>{user.full_name || 'User'}</p>
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
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>
                        {user.client_count || 0}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>
                        {user.project_count || 0}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                        {formatCurrency(user.total_revenue || 0)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {getStatusBadge(user.status || 'active')}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            const userId = user._id || user.id;
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
                            fontSize: '0.75rem',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#7c3aed'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#8b5cf6'}
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
                            fontSize: '0.75rem',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                        >
                          <Edit size={14} style={{ marginRight: '0.25rem' }} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteUser(user._id || user.id, user.full_name)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
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
          <div style={{ display: isMobile ? 'grid' : 'none', gap: '0.75rem', padding: '1rem' }}>
            {filteredUsers.map(user => (
              <div key={user._id || user.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: '600' }}>{user.full_name || 'User'}</p>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>{user.email}</p>
                  </div>
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
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.75rem' }}>
                  <div><strong>Connects:</strong> {user.connects_balance || 0}</div>
                  <div><strong>Clients:</strong> {user.client_count || 0}</div>
                  <div><strong>Projects:</strong> {user.project_count || 0}</div>
                  <div><strong>Revenue:</strong> {formatCurrency(user.total_revenue || 0)}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button onClick={() => { const userId = user._id || user.id; if (userId) { fetchUserDetail(userId); } else { alert('User ID not found'); } }} style={{ padding: '0.4rem 0.65rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>History</button>
                  <button onClick={() => { setSelectedUser(user); setEditData({ plan: user.plan || 'free', status: user.status || 'active', amount: user.subscription_amount || 19 }); setShowEditModal(true); }} style={{ padding: '0.4rem 0.65rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteUser(user._id || user.id, user.full_name)} style={{ padding: '0.4rem 0.65rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
            color: '#6b7280',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '0.5rem' : '0'
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

        {/* User Detail Modal */}
        {showUserDetail && (
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
            padding: isMobile ? '1rem' : '2rem' 
          }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '16px', 
              padding: isMobile ? '1rem' : '2rem', 
              maxWidth: '1000px', 
              width: isMobile ? '100%' : '95%', 
              maxHeight: '90vh', 
              overflow: 'auto' 
            }}>
              {userDetailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem' }}>
                  <RefreshCw size={36} className="spin" color="#8b5cf6" />
                  <p style={{ color: '#6b7280' }}>Fetching user history details...</p>
                </div>
              ) : userDetail ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem' }}>{userDetail.user?.name || userDetail.user?.full_name || 'User'}</h2>
                      <p style={{ color: '#6b7280' }}>{userDetail.user?.email}</p>
                      <p style={{ color: '#6b7280' }}>Plan: <strong>{userDetail.user?.subscription_tier || 'Free'}</strong></p>
                      <p style={{ color: '#6b7280' }}>Connects: <strong>{userDetail.user?.connects_balance || 0}</strong></p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowUserDetail(false);
                        setUserDetail(null);
                      }} 
                      style={{ 
                        padding: '0.5rem 1rem', 
                        background: '#ef4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
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
                                  {new Date(payment.created_at || payment.paid_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  {payment.description || 
                                   (payment.package_id ? `${payment.connects_purchased || 0} Connects` : 'Payment')}
                                </td>
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
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>Clients ({userDetail.clients?.length || 0})</h3>
                    {userDetail.clients?.length > 0 ? (
                      <div style={{ overflowX: 'auto', maxHeight: '200px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                          <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Company</th>
                              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.clients.map((client, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '0.5rem' }}>{client.name || client.contact_name}</td>
                                <td style={{ padding: '0.5rem' }}>{client.company || client.company_name || '-'}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                                  {formatCurrency(client.total_revenue || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p style={{ color: '#6b7280' }}>No clients</p>}
                  </div>

                  {/* Invoices */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>Invoices ({userDetail.invoices?.length || 0})</h3>
                    {userDetail.invoices?.length > 0 ? (
                      <div style={{ overflowX: 'auto', maxHeight: '200px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                          <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Invoice #</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Client (For Whom)</th>
                              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.invoices.map((invoice, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '0.5rem' }}>{invoice.number}</td>
                                <td style={{ padding: '0.5rem' }}>
                                  {invoice.client_name} {invoice.client_company ? `(${invoice.client_company})` : ''}
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600' }}>
                                  {formatCurrency(invoice.amount)}
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    background: invoice.status === 'paid' ? '#d1fae5' : 
                                                invoice.status === 'pending' ? '#fef3c7' : '#fee2e2',
                                    color: invoice.status === 'paid' ? '#065f46' : 
                                           invoice.status === 'pending' ? '#92400e' : '#991b1b'
                                  }}>
                                    {invoice.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p style={{ color: '#6b7280' }}>No invoices</p>}
                  </div>

                  {/* Projects */}
                  <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Projects ({userDetail.projects?.length || 0})</h3>
                    {userDetail.projects?.length > 0 ? (
                      <div style={{ overflowX: 'auto', maxHeight: '200px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                          <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Title</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Client</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                              <th style={{ padding: '0.5rem', textAlign: 'right' }}>Budget</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.projects.map((project, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '0.5rem' }}>{project.title}</td>
                                <td style={{ padding: '0.5rem', color: '#6b7280' }}>{project.client_name}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    background: project.status === 'completed' ? '#d1fae5' : 
                                              project.status === 'open' ? '#dbeafe' : '#fef3c7',
                                    color: project.status === 'completed' ? '#065f46' : 
                                           project.status === 'open' ? '#1e40af' : '#92400e'
                                  }}>
                                    {project.status}
                                  </span>
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                  {formatCurrency(project.budget_max || project.budget || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p style={{ color: '#6b7280' }}>No projects</p>}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Edit Modal */}
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
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                Customer: <strong>{selectedUser.full_name}</strong>
              </p>
              
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
                    min="0"
                    step="1"
                  />
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => updateSubscription(selectedUser._id || selectedUser.id)} 
                  style={{ 
                    flex: 1, 
                    padding: '0.75rem', 
                    background: '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontWeight: '500',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
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
                    fontWeight: '500',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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

export default AdminDashboard;