import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Download, TrendingUp, DollarSign, Users, Briefcase, 
  FileText, Calendar, PieChart, BarChart3, 
  ArrowUp, ArrowDown, Wallet, CreditCard
} from 'lucide-react';
import Invoices from './Invoices';
import Expenses from './Expenses';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, earnings, ledger
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState('all'); // all, income, expense
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
    recentActivity: [],
    allTransactions: [],
    invoiceEarnings: 0,
    marketplaceEarnings: 0,
    projectedEarnings: 0,
    topMonth: 'N/A'
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
      const [clientsRes, projectsRes, invoicesRes, expensesRes, mpProjectsRes] = await Promise.all([
        axios.get('/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/expenses', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { expenses: [] } })),
        axios.get('/api/marketplace/freelancer/my-projects', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { projects: [] } }))
      ]);
      
      const clients = clientsRes.data.clients || [];
      const projects = projectsRes.data.projects || [];
      const invoices = invoicesRes.data.invoices || [];
      const expenses = expensesRes.data.expenses || [];
      const mpProjects = mpProjectsRes.data.projects || [];
      
      // Calculate direct client invoice earnings
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const invoiceEarnings = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      
      // Calculate marketplace contract earnings
      let marketplaceEarnings = 0;
      if (mpProjects.length > 0) {
        marketplaceEarnings += mpProjects
          .filter(p => p.payment_status === 'paid' && p.status === 'completed')
          .reduce((sum, p) => sum + (parseFloat(p.bid_amount) || parseFloat(p.budget) || 0), 0);
      }
      
      const totalRevenue = invoiceEarnings + marketplaceEarnings;
      
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
      const monthlyData = generateMonthlyData(invoices, expenses, mpProjects);

      // Find top earning month
      let topMonth = 'N/A';
      let maxMonthEarnings = 0;
      monthlyData.forEach(d => {
        if (d.revenue > maxMonthEarnings) {
          maxMonthEarnings = d.revenue;
          topMonth = d.month;
        }
      });

      // Calculate projected earnings from pending/unpaid invoices & in-progress marketplace projects
      const pendingInvoiceSum = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      let pendingMpSum = 0;
      if (mpProjects.length > 0) {
        pendingMpSum += mpProjects
          .filter(p => p.payment_status !== 'paid' && p.status === 'in_progress')
          .reduce((sum, p) => sum + (parseFloat(p.bid_amount) || parseFloat(p.budget) || 0), 0);
      }
      const projectedEarnings = pendingInvoiceSum + pendingMpSum;

      // Build unified transaction ledger
      const allTransactions = [];
      invoices.forEach(inv => {
        const clientName = inv.client_id?.contact_name || inv.client_name || 'Direct Client';
        allTransactions.push({
          id: inv._id,
          date: inv.created_at || inv.date || new Date(),
          type: 'income',
          category: 'Invoice Payment',
          description: `Invoice #${inv.invoice_number || 'INV'} - ${inv.project_id?.title || 'Project Milestone Work'}`,
          entity: clientName,
          amount: parseFloat(inv.total_amount || 0),
          status: inv.status
        });
      });

      expenses.forEach(exp => {
        allTransactions.push({
          id: exp._id,
          date: exp.expense_date || new Date(),
          type: 'expense',
          category: exp.category || 'Office Expense',
          description: exp.description || 'Business Expense',
          entity: exp.vendor || 'Vendor',
          amount: parseFloat(exp.amount || 0),
          status: 'paid'
        });
      });

      // Sort combined ledger by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
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
        recentActivity: generateRecentActivity(invoices, projects, clients),
        allTransactions,
        invoiceEarnings,
        marketplaceEarnings,
        projectedEarnings,
        topMonth
      });
      
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (invoices, expenses, mpProjects) => {
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
        
      let mpRevenue = 0;
      if (mpProjects && mpProjects.length > 0) {
        mpRevenue = mpProjects
          .filter(p => {
            if (p.payment_status !== 'paid' || p.status !== 'completed') return false;
            const pDate = new Date(p.payment_date || p.completed_at || p.updated_at);
            return pDate.getFullYear() === currentYear && pDate.getMonth() + 1 === monthNum;
          })
          .reduce((sum, p) => sum + (parseFloat(p.bid_amount) || parseFloat(p.budget) || 0), 0);
      }
      
      const totalMonthRevenue = monthlyRevenue + mpRevenue;
      
      return { month, revenue: totalMonthRevenue, expenses: monthlyExpenses, profit: totalMonthRevenue - monthlyExpenses };
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

  // Filtered transactions for the ledger view
  const filteredTransactions = reportData.allTransactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                          tx.entity.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                          tx.category.toLowerCase().includes(ledgerSearch.toLowerCase());
    
    if (ledgerFilter === 'all') return matchesSearch;
    if (ledgerFilter === 'income') return matchesSearch && tx.type === 'income';
    if (ledgerFilter === 'expense') return matchesSearch && tx.type === 'expense';
    return matchesSearch;
  });

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .responsive-tabs {
            flex-direction: column !important;
            gap: 0.5rem !important;
            border-bottom: none !important;
          }
          .responsive-tabs button {
            width: 100% !important;
            text-align: left !important;
            padding: 0.6rem 0.8rem !important;
            border-bottom: none !important;
            border-left: 3px solid transparent !important;
          }
          .responsive-tabs button.active-tab {
            border-left: 3px solid #4f46e5 !important;
            background-color: #f8fafc !important;
          }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem', color: '#0f172a' }}>Analytics & Reports</h1>
          <p style={{ color: '#64748b' }}>Detailed financial insights, earnings tracking, and transaction ledger</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              background: 'white',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
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
              padding: '0.6rem 1.2rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
              transition: 'all 0.2s'
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="responsive-tabs" style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '2rem',
        gap: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={activeTab === 'overview' ? 'active-tab' : ''}
          style={{
            padding: '0.8rem 0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'overview' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'overview' ? '3px solid #4f46e5' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📈 Financial Overview
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={activeTab === 'earnings' ? 'active-tab' : ''}
          style={{
            padding: '0.8rem 0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'earnings' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'earnings' ? '3px solid #4f46e5' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          💰 Earnings Analytics
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={activeTab === 'invoices' ? 'active-tab' : ''}
          style={{
            padding: '0.8rem 0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'invoices' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'invoices' ? '3px solid #4f46e5' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📄 Invoices Manager
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={activeTab === 'expenses' ? 'active-tab' : ''}
          style={{
            padding: '0.8rem 0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'expenses' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'expenses' ? '3px solid #4f46e5' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          💳 Expenses Manager
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={activeTab === 'ledger' ? 'active-tab' : ''}
          style={{
            padding: '0.8rem 0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'ledger' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'ledger' ? '3px solid #4f46e5' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📋 Transaction Ledger
        </button>
      </div>

      {/* Tab 1: Financial Overview */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#10b98120', padding: '0.5rem', borderRadius: '10px' }}>
                  <DollarSign size={24} color="#10b981" />
                </div>
                <span style={{ fontSize: '0.875rem', color: '#10b981', background: '#10b98110', padding: '0.25rem 0.5rem', borderRadius: '20px', fontWeight: 600 }}>
                  Total Revenue
                </span>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(reportData.totalRevenue)}</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>From {reportData.paidInvoices} paid invoices & contracts</p>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#ef444420', padding: '0.5rem', borderRadius: '10px' }}>
                  <CreditCard size={24} color="#ef4444" />
                </div>
                <span style={{ fontSize: '0.875rem', color: '#ef4444', background: '#ef444410', padding: '0.25rem 0.5rem', borderRadius: '20px', fontWeight: 600 }}>
                  Total Expenses
                </span>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(reportData.totalExpenses)}</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>Business operations cost</p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', borderRadius: '12px', padding: '1.5rem', color: 'white', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '10px' }}>
                  <Wallet size={24} />
                </div>
                <span style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 600 }}>Net Profit</span>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(reportData.netProfit)}</p>
              <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                Margin: {reportData.totalRevenue > 0 ? ((reportData.netProfit / reportData.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#3b82f620', padding: '0.5rem', borderRadius: '10px' }}>
                  <Users size={24} color="#3b82f6" />
                </div>
                <span style={{ fontSize: '0.875rem', color: '#3b82f6', background: '#3b82f610', padding: '0.25rem 0.5rem', borderRadius: '20px', fontWeight: 600 }}>
                  Active Clients
                </span>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>{reportData.totalClients}</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>{reportData.activeProjects} active projects</p>
            </div>
          </div>

          {/* Monthly Performance Chart */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #f1f5f9'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#0f172a' }}>Monthly Performance</h3>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '600px' }}>
                {/* Chart Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(12, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div></div>
                  {reportData.monthlyData.map(m => (
                    <div key={m.month} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>{m.month}</div>
                  ))}
                </div>
                
                {/* Revenue Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(12, 1fr)', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#10b981' }}>Revenue</div>
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
                        <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: '#64748b' }}>
                          {m.revenue > 0 ? `$${(m.revenue / 1000).toFixed(0)}k` : '0'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Expenses Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(12, 1fr)', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ef4444' }}>Expenses</div>
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
                        <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: '#64748b' }}>
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
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <Briefcase size={18} color="#4f46e5" /> Project Overview
              </h3>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>Active Projects</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{reportData.activeProjects}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>Completed Projects</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{reportData.completedProjects}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>Total Projects</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{reportData.totalProjects}</span>
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.75rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#475569' }}>Completion Rate</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>
                    {reportData.totalProjects > 0 ? ((reportData.completedProjects / reportData.totalProjects) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: '10px', marginTop: '0.5rem', overflow: 'hidden' }}>
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
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <FileText size={18} color="#3b82f6" /> Invoice Overview
              </h3>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>Paid Invoices</span>
                  <span style={{ fontWeight: '600', color: '#10b981' }}>{reportData.paidInvoices}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>Pending Invoices</span>
                  <span style={{ fontWeight: '600', color: '#f59e0b' }}>{reportData.pendingInvoices}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>Overdue Invoices</span>
                  <span style={{ fontWeight: '600', color: '#ef4444' }}>{reportData.overdueInvoices}</span>
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.75rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#475569' }}>Collection Rate</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>
                    {reportData.totalInvoices > 0 ? ((reportData.paidInvoices / reportData.totalInvoices) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: '10px', marginTop: '0.5rem', overflow: 'hidden' }}>
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
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <PieChart size={18} color="#f59e0b" /> Business Health
              </h3>
              <div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>Profit Margin</span>
                    <span style={{ fontWeight: '600', color: reportData.netProfit > 0 ? '#10b981' : '#ef4444' }}>
                      {reportData.totalRevenue > 0 ? ((reportData.netProfit / reportData.totalRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(0, reportData.totalRevenue > 0 ? (reportData.netProfit / reportData.totalRevenue) * 100 : 0))}%`,
                      height: '6px',
                      background: reportData.netProfit > 0 ? '#10b981' : '#ef4444',
                      borderRadius: '10px'
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Revenue per Client</p>
                    <p style={{ fontWeight: '600', color: '#0f172a' }}>
                      {reportData.totalClients > 0 ? formatCurrency(reportData.totalRevenue / reportData.totalClients) : '$0'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Avg. Invoice Value</p>
                    <p style={{ fontWeight: '600', color: '#0f172a' }}>
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #f1f5f9'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#0f172a' }}>Recent Activity</h3>
              <div>
                {reportData.recentActivity.map((activity, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem 0',
                    borderBottom: idx !== reportData.recentActivity.length - 1 ? '1px solid #f1f5f9' : 'none',
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
                      {activity.type === 'invoice' ? <FileText size={14} color="#10b981" /> : activity.type === 'project' ? <Briefcase size={14} color="#3b82f6" /> : <Users size={14} color="#f59e0b" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', margin: 0, fontWeight: 500, color: '#1e293b' }}>{activity.message}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                        {new Date(activity.date).toLocaleDateString()}
                        {activity.amount && ` • ${formatCurrency(activity.amount)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Freelancer Earnings Analytics */}
      {activeTab === 'earnings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Earnings Analytics Overview cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ background: '#4f46e515', padding: '0.4rem', borderRadius: '8px' }}>
                  <TrendingUp size={20} color="#4f46e5" />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Gross Earnings</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: '#0f172a' }}>{formatCurrency(reportData.totalRevenue)}</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Total invoiced + marketplace contract pay</p>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ background: '#10b98115', padding: '0.4rem', borderRadius: '8px' }}>
                  <Calendar size={20} color="#10b981" />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Top Earning Month</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: '#0f172a' }}>{reportData.topMonth}</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Month with peak financial returns</p>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ background: '#3b82f615', padding: '0.4rem', borderRadius: '8px' }}>
                  <FileText size={20} color="#3b82f6" />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Projected / In-Flight</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: '#0f172a' }}>{formatCurrency(reportData.projectedEarnings)}</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>From pending invoices & active bids</p>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ background: '#f59e0b15', padding: '0.4rem', borderRadius: '8px' }}>
                  <DollarSign size={20} color="#f59e0b" />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Average per Month</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: '#0f172a' }}>
                {formatCurrency(reportData.totalRevenue / 12)}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Calculated monthly rate this year</p>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚙️ Earnings Channel Breakdown
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 500, color: '#475569' }}>Direct Client Invoices</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {formatCurrency(reportData.invoiceEarnings)} ({reportData.totalRevenue > 0 ? ((reportData.invoiceEarnings / reportData.totalRevenue) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${reportData.totalRevenue > 0 ? (reportData.invoiceEarnings / reportData.totalRevenue) * 100 : 0}%`,
                      height: '100%',
                      background: '#4f46e5'
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 500, color: '#475569' }}>Marketplace Contract Wins</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {formatCurrency(reportData.marketplaceEarnings)} ({reportData.totalRevenue > 0 ? ((reportData.marketplaceEarnings / reportData.totalRevenue) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${reportData.totalRevenue > 0 ? (reportData.marketplaceEarnings / reportData.totalRevenue) * 100 : 0}%`,
                      height: '100%',
                      background: '#10b981'
                    }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>🚀 Earnings Projection Summary</h4>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
                Based on your current platform activity, you have **{formatCurrency(reportData.projectedEarnings)}** in potential upcoming cashflow.
              </p>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.8 }}>
                <li>Direct unpaid / pending invoices: **{formatCurrency(reportData.pendingInvoices * (reportData.totalRevenue / Math.max(1, reportData.paidInvoices)))}**</li>
                <li>In-flight marketplace contract bids: **{formatCurrency(reportData.projectedEarnings - (reportData.pendingInvoices * (reportData.totalRevenue / Math.max(1, reportData.paidInvoices))))}**</li>
              </ul>
              <div style={{
                background: '#eff6ff',
                color: '#1e40af',
                fontSize: '0.8rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                marginTop: '1rem',
                fontWeight: 500
              }}>
                💡 Tip: Follow up with clients on overdue invoices to speed up payment collections!
              </div>
            </div>
          </div>

          {/* Monthly Earnings Table */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>Earning Performance History</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>Month</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: '#64748b', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: '#64748b', textAlign: 'right' }}>Operating Expenses</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: '#64748b', textAlign: 'right' }}>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {reportData.monthlyData.map((d, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, color: '#334155' }}>{d.month}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#10b981', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(d.revenue)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#ef4444', textAlign: 'right' }}>-{formatCurrency(d.expenses)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: d.profit >= 0 ? '#4f46e5' : '#ef4444', textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(d.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Unified Transaction Ledger */}
      {activeTab === 'ledger' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          {/* Filters Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder="Search ledger by description, category, client, vendor..."
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setLedgerFilter('all')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: ledgerFilter === 'all' ? '#4f46e5' : 'white',
                  color: ledgerFilter === 'all' ? 'white' : '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              <button
                onClick={() => setLedgerFilter('income')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: ledgerFilter === 'income' ? '#10b981' : 'white',
                  color: ledgerFilter === 'income' ? 'white' : '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Income / Invoices
              </button>
              <button
                onClick={() => setLedgerFilter('expense')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: ledgerFilter === 'expense' ? '#ef4444' : 'white',
                  color: ledgerFilter === 'expense' ? 'white' : '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Expenses
              </button>
            </div>
          </div>

          {/* Transactions Table Ledger */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b' }}>Client / Vendor</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#64748b', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      No matching transaction entries found in the ledger.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => (
                    <tr key={idx} style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      background: tx.type === 'income' ? 'rgba(16, 185, 129, 0.02)' : 'rgba(239, 68, 68, 0.02)'
                    }}>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap', color: '#475569' }}>
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: tx.type === 'income' ? '#d1fae5' : '#fee2e2',
                          color: tx.type === 'income' ? '#065f46' : '#991b1b'
                        }}>
                          {tx.type === 'income' ? 'INCOMING' : 'OUTGOING'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#334155', fontWeight: 500 }}>
                        {tx.category}
                      </td>
                      <td style={{ padding: '1rem', color: '#1e293b' }}>
                        {tx.description}
                      </td>
                      <td style={{ padding: '1rem', color: '#475569' }}>
                        {tx.entity}
                      </td>
                      <td style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        fontWeight: 700,
                        color: tx.type === 'income' ? '#10b981' : '#ef4444' 
                      }}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: tx.status === 'paid' ? '#d1fae5' : tx.status === 'pending' ? '#fef3c7' : '#fee2e2',
                          color: tx.status === 'paid' ? '#065f46' : tx.status === 'pending' ? '#92400e' : '#991b1b'
                        }}>
                          {tx.status?.toUpperCase() || 'PAID'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Invoices Manager */}
      {activeTab === 'invoices' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          <Invoices />
        </div>
      )}

      {/* Tab: Expenses Manager */}
      {activeTab === 'expenses' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
          <Expenses />
        </div>
      )}
    </div>
  );
};

export default Reports;