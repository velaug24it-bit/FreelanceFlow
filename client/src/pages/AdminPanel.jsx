import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, DollarSign, TrendingUp, Crown, 
  Calendar, Download, Edit, Trash2,
  CheckCircle, XCircle, Shield
} from 'lucide-react';

const AdminPanel = () => {
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ plan: 'free', status: 'active', amount: 0 });

  useEffect(() => {
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
      
      setUsers(usersRes.data.users || []);
      setStats(statsRes.data);
      setRevenue(revenueRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      if (err.response?.status === 403) {
        alert('Admin access required. Please login with admin account.');
      }
    } finally {
      setLoading(false);
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
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
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

  const exportReport = () => {
    const csvData = [
      ['Admin Revenue Report - FreelanceFlow'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['SUMMARY STATISTICS'],
      ['Total Earnings', `$${revenue.totalEarnings.toFixed(2)}`],
      ['Total Users', stats.totalUsers],
      ['Active Subscriptions', stats.activeSubscriptions],
      [''],
      ['MONTHLY REVENUE BREAKDOWN'],
      ['Month', 'New Subscribers', 'Revenue'],
      ...revenue.monthlyRevenue.map(m => [m.month, m.new_subscribers, `$${m.revenue}`]),
      [''],
      ['ALL COMPANIES/USERS'],
      ['Name', 'Email', 'Plan', 'Clients', 'Projects', 'Revenue', 'Status'],
      ...users.map(u => [
        u.full_name,
        u.email,
        u.subscription_plan,
        u.client_count || 0,
        u.project_count || 0,
        `$${u.total_revenue || 0}`,
        u.subscription_status
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
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
          <p style={{ color: '#6b7280' }}>Manage all companies, users, and track platform revenue</p>
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
            fontWeight: '500'
          }}
        >
          <Download size={18} />
          Export Full Report
        </button>
      </div>

      {/* Stats Cards - Platform Revenue */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
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

        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '12px' }}>
              <DollarSign size={24} />
            </div>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Platform Revenue</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(revenue.totalEarnings)}</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>From all subscriptions</p>
        </div>

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

        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#10b98120', padding: '0.5rem', borderRadius: '12px' }}>
              <TrendingUp size={24} color="#10b981" />
            </div>
            <span style={{ fontSize: '0.875rem', color: '#10b981' }}>Monthly Revenue</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {formatCurrency(revenue.monthlyRevenue[0]?.revenue || 0)}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Last 30 days</p>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Monthly Platform Revenue</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', height: '250px', overflowX: 'auto' }}>
          {revenue.monthlyRevenue.slice().reverse().map((month, idx) => {
            const maxValue = Math.max(...revenue.monthlyRevenue.map(m => m.revenue), 100);
            const height = (month.revenue / maxValue) * 200;
            return (
              <div key={idx} style={{ flex: 1, textAlign: 'center', minWidth: '100px' }}>
                <div style={{ 
                  height: `${height}px`, 
                  background: '#3b82f6',
                  borderRadius: '8px 8px 0 0',
                  transition: 'height 0.3s',
                  cursor: 'pointer'
                }} />
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: '600' }}>{month.month}</div>
                <div style={{ fontSize: '0.7rem', color: '#10b981' }}>{formatCurrency(month.revenue)}</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>+{month.new_subscribers} new</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Companies/Users Table */}
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
                <th style={{ padding: '1rem', textAlign: 'left' }}>Company / User</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Plan</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Clients</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Projects</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Revenue Generated</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
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
                      background: user.subscription_plan === 'free' ? '#fef3c7' : '#d1fae5',
                      color: user.subscription_plan === 'free' ? '#92400e' : '#065f46'
                    }}>
                      {user.subscription_plan === 'free' ? 'Free' : user.subscription_plan?.charAt(0).toUpperCase() + user.subscription_plan?.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>{user.client_count || 0}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500' }}>{user.project_count || 0}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                    {formatCurrency(user.total_revenue || 0)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {user.subscription_status === 'active' ? (
                      <span style={{ color: '#10b981' }}><CheckCircle size={18} /></span>
                    ) : (
                      <span style={{ color: '#ef4444' }}><XCircle size={18} /></span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setEditData({ plan: user.subscription_plan, status: user.subscription_status, amount: user.subscription_amount || 19 });
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
                      onClick={() => deleteUser(user.id, user.full_name)}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                onClick={() => updateSubscription(selectedUser.id)}
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
    </div>
  );
};

export default AdminPanel;