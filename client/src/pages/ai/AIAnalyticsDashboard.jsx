import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Sparkles, DollarSign, TrendingUp, Users, CheckCircle, 
  ArrowUpRight, Activity, Zap, Compass 
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AIAnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/ai/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setData(res.data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Could not load platform analytics insights.');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      <style>{`
        @media (max-width: 768px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4f46e5', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Sparkles size={16} />
            AI Operations Intelligence
          </div>
          <h1 style={{ margin: '0.25rem 0 0', fontSize: '2.25rem', fontWeight: 800 }}>Business Analytics & Forecast</h1>
        </div>
        <button 
          onClick={fetchAnalytics} 
          style={{ 
            background: 'white', 
            border: '1px solid #cbd5e1', 
            padding: '0.6rem 1.2rem', 
            borderRadius: '12px', 
            cursor: 'pointer', 
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
        >
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
          Aggregating platform history and running linear growth regressions...
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', background: '#fef2f2', borderRadius: '20px', border: '1px solid #fee2e2', color: '#ef4444' }}>
          {error}
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Key Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            
            {/* Card 1: Revenue Forecast */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Next Month Forecast</span>
                <h3 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, color: '#4f46e5' }}>${data.forecastedRevenue.toLocaleString()}</h3>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: data.growthRate >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                  <TrendingUp size={14} />
                  {data.growthRate >= 0 ? '+' : ''}{data.growthRate}% growth rate
                </span>
              </div>
              <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '0.75rem', borderRadius: '16px' }}>
                <DollarSign size={24} />
              </div>
            </div>

            {/* Card 2: Completion Rate */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Project Completion Rate</span>
                <h3 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{data.projectCompletionRate}%</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Based on {data.totalProjects} posted projects
                </span>
              </div>
              <div style={{ background: '#ecfdf5', color: '#10b981', padding: '0.75rem', borderRadius: '16px' }}>
                <CheckCircle size={24} />
              </div>
            </div>

            {/* Card 3: User Base */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Total Registered Users</span>
                <h3 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{data.totalUsers}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Growth metrics active
                </span>
              </div>
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.75rem', borderRadius: '16px' }}>
                <Users size={24} />
              </div>
            </div>

          </div>

          {/* AI Insights Card */}
          <div style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)', border: '1px solid #c084fc', borderRadius: '24px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Sparkles size={20} style={{ color: '#7c3aed' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#4c1d95' }}>AI-Generated Platform Strategy Insights</h3>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {data.insights?.map((ins, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'white', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(124, 58, 237, 0.1)' }}>
                  <ArrowUpRight size={18} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '0.9rem', color: '#4c1d95', lineHeight: 1.5, fontWeight: 500 }}>{ins}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
            
            {/* Revenue Trend Area Chart */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Invoiced Revenue Trend (USD)</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <AreaChart data={data.monthlyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: 'white', fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Client Signup Growth Bar Chart */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>User Acquisition Rate</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <BarChart data={data.clientGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: 'white', fontSize: 12 }} />
                    <Bar dataKey="signups" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      ) : null}

    </div>
  );
};

export default AIAnalyticsDashboard;
