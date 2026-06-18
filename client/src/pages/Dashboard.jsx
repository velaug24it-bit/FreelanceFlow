import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeProjects: 0,
    totalInvoices: 0,
    recentClients: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
        axios.get('/api/clients', { headers }),
        axios.get('/api/projects', { headers }),
        axios.get('/api/invoices', { headers })
      ]);

      const clients = clientsRes.data.clients || [];
      const projects = projectsRes.data.projects || [];
      const invoices = invoicesRes.data.invoices || [];

      const activeProjects = projects.filter(p => p.status !== 'completed').length;
      const recentClients = clients.slice(0, 5);

      setStats({
        totalClients: clients.length,
        activeProjects,
        totalInvoices: invoices.length,
        recentClients
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        Welcome back, {user?.full_name}!
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Here's what's happening with your freelance business
      </p>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h3 style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Clients</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{stats.totalClients}</p>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
          <h3 style={{ fontSize: '0.875rem', opacity: 0.9 }}>Active Projects</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{stats.activeProjects}</p>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
          <h3 style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Invoices</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{stats.totalInvoices}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => window.location.href = '/clients/new'}>
            Add New Client
          </button>
          <button className="btn btn-primary" onClick={() => window.location.href = '/projects/new'}>
            Create Project
          </button>
          <button className="btn btn-primary" onClick={() => window.location.href = '/invoices/new'}>
            Create Invoice
          </button>
        </div>
      </div>

      {/* Recent Clients */}
      {stats.recentClients.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Recent Clients</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentClients.map(client => (
                  <tr key={client._id}>
                    <td>{client.contact_name}</td>
                    <td>{client.company_name || '-'}</td>
                    <td>{client.email}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: client.status === 'active' ? '#d1fae5' : '#fee2e2',
                        color: client.status === 'active' ? '#065f46' : '#991b1b',
                        fontSize: '0.875rem'
                      }}>
                        {client.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Free Tier Notice */}
      {user?.subscription_tier === 'free' && (
        <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '1.5rem',
            color: 'white'
        }}>
            <p>You're on the Free plan. <a href="/subscription" style={{color: 'white', fontWeight: 'bold'}}>
                Upgrade to Pro → 
            </a> for unlimited clients, invoices, and advanced features.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;