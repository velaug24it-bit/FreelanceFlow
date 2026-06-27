import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Download, TrendingUp, DollarSign, Users, Briefcase, 
  FileText, Calendar, PieChart, BarChart3, 
  ArrowUp, ArrowDown, Wallet, CreditCard
} from 'lucide-react';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalClients: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    monthlyData: [],
    recentActivity: []
  });
  const [timeRange, setTimeRange] = useState('year');

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch all required data
      const [clientsRes, projectsRes, invoicesRes, expensesRes] = await Promise.all([
        axios.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/expenses', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { expenses: [] } }))
      ]);
      
      const clients = clientsRes.data.clients || [];
      const projects = projectsRes.data.projects || [];
      const invoices = invoicesRes.data.invoices || [];
      const expenses = expensesRes.data.expenses || [];
      
      // Calculate revenue from paid invoices
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      
      // Calculate expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      
      // Calculate invoice stats
      const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
      const overdueInvoices = invoices.filter(inv => {
        return inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < new Date();
      });
      
      // Calculate project stats from invoices and paid amounts
      const invoicesByProject = invoices.reduce((map, inv) => {
        const projectId = inv.project_id?.toString();
        if (!projectId) return map;
        if (!map[projectId]) map[projectId] = [];
        map[projectId].push(inv);
        return map;
      }, {});

      let activeProjectCount = 0;
      let completedProjectCount = 0;
      
      projects.forEach(project => {
        const projectId = project._id?.toString();
        const projectInvoices = projectId ? invoicesByProject[projectId] || [] : [];
        const paidInvoiceTotal = projectInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);

        const isCompletedByPayment = project.budget > 0
          ? paidInvoiceTotal >= project.budget
          : projectInvoices.length > 0 && projectInvoices.every(inv => inv.status === 'paid');

        if (project.status === 'completed' || isCompletedByPayment) {
          completedProjectCount += 1;
        } else {
          activeProjectCount += 1;
        }
      });

      const totalProjectCount = projects.length;
      
      // Generate monthly data for chart
      const monthlyData = generateMonthlyData(invoices, expenses);
      
      setReportData({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalClients: clients.length,
        totalProjects: totalProjectCount,
        activeProjects: activeProjectCount,
        completedProjects: completedProjectCount,
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        pendingInvoices: pendingInvoices.length,
        overdueInvoices: overdueInvoices.length,
        monthlyData,
        recentActivity: generateRecentActivity(invoices, projects, clients)
      });
      
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (invoices, expenses) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthNum = index + 1;
      const monthlyRevenue = invoices
        .filter(inv => {
          const invDate = new Date(inv.created_at);
          return invDate.getFullYear() === currentYear && invDate.getMonth() + 1 === monthNum && inv.status === 'paid';
        })
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      
      const monthlyExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate.getFullYear() === currentYear && expDate.getMonth() + 1 === monthNum;
        })
        .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      
      return { month, revenue: monthlyRevenue, expenses: monthlyExpenses, profit: monthlyRevenue - monthlyExpenses };
    });
  };

  const generateRecentActivity = (invoices, projects, clients) => {
    const activities = [];
    
    // Add recent invoices
    invoices.slice(0, 3).forEach(inv => {
      activities.push({
        type: 'invoice',
        message: `Invoice ${inv.invoice_number} was ${inv.status}`,
        date: inv.created_at,
        amount: inv.total_amount
      });
    });
    
    // Add recent projects
    projects.slice(0, 2).forEach(proj => {
      activities.push({
        type: 'project',
        message: `Project "${proj.title}" was ${proj.status}`,
        date: proj.created_at
      });
    });
    
    // Add recent clients
    clients.slice(0, 2).forEach(client => {
      activities.push({
        type: 'client',
        message: `New client added: ${client.contact_name}`,
        date: client.created_at
      });
    });
    
    return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  };

  const exportReport = () => {
    // Create CSV data
    const csvData = [
      ['Report Generated:', new Date().toLocaleString()],
      [''],
      ['SUMMARY STATISTICS'],
      ['Metric', 'Value'],
      ['Total Revenue', `$${reportData.totalRevenue.toFixed(2)}`],
      ['Total Expenses', `$${reportData.totalExpenses.toFixed(2)}`],
      ['Net Profit', `$${reportData.netProfit.toFixed(2)}`],
      ['Total Clients', reportData.totalClients],
      ['Total Projects', reportData.totalProjects],
      ['Active Projects', reportData.activeProjects],
      ['Completed Projects', reportData.completedProjects],
      ['Total Invoices', reportData.totalInvoices],
      ['Paid Invoices', reportData.paidInvoices],
      ['Pending Invoices', reportData.pendingInvoices],
      ['Overdue Invoices', reportData.overdueInvoices],
      [''],
      ['MONTHLY BREAKDOWN'],
      ['Month', 'Revenue', 'Expenses', 'Profit'],
      ...reportData.monthlyData.map(m => [m.month, m.revenue.toFixed(2), m.expenses.toFixed(2), m.profit.toFixed(2)])
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Analytics & Reports</h1>
          <p style={{ color: '#6b7280' }}>View detailed business insights and performance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: 'white'
            }}
          >
            <option value="year">This Year</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <button
            onClick={exportReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#10b98120', padding: '0.5rem', borderRadius: '10px' }}>
              <DollarSign size={24} color="#10b981" />
            </div>
            <span style={{ fontSize: '0.875rem', color: '#10b981', background: '#10b98110', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>
              Total Revenue
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(reportData.totalRevenue)}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>From {reportData.paidInvoices} paid invoices</p>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#ef444420', padding: '0.5rem', borderRadius: '10px' }}>
              <CreditCard size={24} color="#ef4444" />
            </div>
            <span style={{ fontSize: '0.875rem', color: '#ef4444', background: '#ef444410', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>
              Total Expenses
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(reportData.totalExpenses)}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Business operations cost</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '10px' }}>
              <Wallet size={24} />
            </div>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Net Profit</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(reportData.netProfit)}</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
            Margin: {reportData.totalRevenue > 0 ? ((reportData.netProfit / reportData.totalRevenue) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#3b82f620', padding: '0.5rem', borderRadius: '10px' }}>
              <Users size={24} color="#3b82f6" />
            </div>
            <span style={{ fontSize: '0.875rem', color: '#3b82f6', background: '#3b82f610', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>
              Active Clients
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{reportData.totalClients}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>{reportData.activeProjects} active projects</p>
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Monthly Performance</h3>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '600px' }}>
            {/* Chart Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(12, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              <div></div>
              {reportData.monthlyData.map(m => (
                <div key={m.month} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '500' }}>{m.month}</div>
              ))}
            </div>
            
            {/* Revenue Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(12, 1fr)', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Revenue</div>
              {reportData.monthlyData.map((m, idx) => {
                const maxValue = Math.max(...reportData.monthlyData.map(d => d.revenue), 1000);
                const height = (m.revenue / maxValue) * 100;
                return (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div style={{ 
                      height: `${Math.max(height, 4)}px`, 
                      background: '#10b981',
                      borderRadius: '4px',
                      width: '100%',
                      minHeight: '4px'
                    }} />
                    <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: '#6b7280' }}>
                      {m.revenue > 0 ? `$${(m.revenue / 1000).toFixed(0)}k` : '0'}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Expenses Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(12, 1fr)', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>Expenses</div>
              {reportData.monthlyData.map((m, idx) => {
                const maxValue = Math.max(...reportData.monthlyData.map(d => d.expenses), 1000);
                const height = (m.expenses / maxValue) * 100;
                return (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div style={{ 
                      height: `${Math.max(height, 4)}px`, 
                      background: '#ef4444',
                      borderRadius: '4px',
                      width: '100%',
                      minHeight: '4px'
                    }} />
                    <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: '#6b7280' }}>
                      {m.expenses > 0 ? `$${(m.expenses / 1000).toFixed(0)}k` : '0'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Project Stats */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} /> Project Overview
          </h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.875rem' }}>Active Projects</span>
              <span style={{ fontWeight: '600' }}>{reportData.activeProjects}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.875rem' }}>Completed Projects</span>
              <span style={{ fontWeight: '600' }}>{reportData.completedProjects}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem' }}>Total Projects</span>
              <span style={{ fontWeight: '600' }}>{reportData.totalProjects}</span>
            </div>
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '0.75rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Completion Rate</span>
              <span style={{ fontWeight: '600' }}>
                {reportData.totalProjects > 0 ? ((reportData.completedProjects / reportData.totalProjects) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: '10px', marginTop: '0.5rem', overflow: 'hidden' }}>
              <div style={{
                width: `${reportData.totalProjects > 0 ? (reportData.completedProjects / reportData.totalProjects) * 100 : 0}%`,
                height: '6px',
                background: '#10b981',
                borderRadius: '10px'
              }} />
            </div>
          </div>
        </div>

        {/* Invoice Stats */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} /> Invoice Overview
          </h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.875rem' }}>Paid Invoices</span>
              <span style={{ fontWeight: '600', color: '#10b981' }}>{reportData.paidInvoices}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.875rem' }}>Pending Invoices</span>
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>{reportData.pendingInvoices}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem' }}>Overdue Invoices</span>
              <span style={{ fontWeight: '600', color: '#ef4444' }}>{reportData.overdueInvoices}</span>
            </div>
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '0.75rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Collection Rate</span>
              <span style={{ fontWeight: '600' }}>
                {reportData.totalInvoices > 0 ? ((reportData.paidInvoices / reportData.totalInvoices) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: '10px', marginTop: '0.5rem', overflow: 'hidden' }}>
              <div style={{
                width: `${reportData.totalInvoices > 0 ? (reportData.paidInvoices / reportData.totalInvoices) * 100 : 0}%`,
                height: '6px',
                background: '#10b981',
                borderRadius: '10px'
              }} />
            </div>
          </div>
        </div>

        {/* Business Health */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} /> Business Health
          </h3>
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem' }}>Profit Margin</span>
                <span style={{ fontWeight: '600', color: reportData.netProfit > 0 ? '#10b981' : '#ef4444' }}>
                  {reportData.totalRevenue > 0 ? ((reportData.netProfit / reportData.totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(0, reportData.totalRevenue > 0 ? (reportData.netProfit / reportData.totalRevenue) * 100 : 0))}%`,
                  height: '6px',
                  background: reportData.netProfit > 0 ? '#10b981' : '#ef4444',
                  borderRadius: '10px'
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Revenue per Client</p>
                <p style={{ fontWeight: '600' }}>
                  {reportData.totalClients > 0 ? formatCurrency(reportData.totalRevenue / reportData.totalClients) : '$0'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Avg. Invoice Value</p>
                <p style={{ fontWeight: '600' }}>
                  {reportData.paidInvoices > 0 ? formatCurrency(reportData.totalRevenue / reportData.paidInvoices) : '$0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      {reportData.recentActivity.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Recent Activity</h3>
          <div style={{ spaceY: '0.5rem' }}>
            {reportData.recentActivity.map((activity, idx) => (
              <div key={idx} style={{
                padding: '0.75rem',
                borderBottom: idx !== reportData.recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: activity.type === 'invoice' ? '#d1fae5' : activity.type === 'project' ? '#dbeafe' : '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {activity.type === 'invoice' ? <FileText size={14} /> : activity.type === 'project' ? <Briefcase size={14} /> : <Users size={14} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem' }}>{activity.message}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {new Date(activity.date).toLocaleDateString()}
                    {activity.amount && ` • ${formatCurrency(activity.amount)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* If no data */}
      {reportData.totalRevenue === 0 && reportData.totalClients === 0 && (
        <div style={{
          background: '#fef3c7',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <p style={{ color: '#92400e' }}>
            No data available yet. Start by adding clients, creating projects, and generating invoices to see your business analytics.
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;