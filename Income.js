import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, 
  Download, Filter, ArrowUp, ArrowDown, Wallet,
  CreditCard, Receipt, PieChart, BarChart3
} from 'lucide-react';

const Income = () => {
  const [loading, setLoading] = useState(true);
  const [incomeData, setIncomeData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    monthlyIncome: [],
    recentTransactions: [],
    incomeByCategory: [],
    projectedIncome: 0,
    growthRate: 0
  });
  const [timeRange, setTimeRange] = useState('month');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchIncomeData();
  }, [timeRange]);

  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch invoices and expenses
      const [invoicesRes, expensesRes] = await Promise.all([
        axios.get('/api/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/expenses', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { expenses: [] } }))
      ]);
      
      const invoices = invoicesRes.data.invoices || [];
      const expenses = expensesRes.data.expenses || [];
      
      // Calculate totals
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const totalIncome = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      const netIncome = totalIncome - totalExpenses;
      
      // Calculate monthly breakdown
      const monthlyData = calculateMonthlyData(paidInvoices, expenses);
      
      // Get recent transactions
      const recentTransactions = [...paidInvoices, ...expenses]
        .sort((a, b) => new Date(b.created_at || b.expense_date) - new Date(a.created_at || a.expense_date))
        .slice(0, 10);
      
      // Calculate projected income (based on last 3 months average)
      const last3Months = monthlyData.slice(-3);
      const avgMonthlyIncome = last3Months.reduce((sum, m) => sum + m.income, 0) / (last3Months.length || 1);
      const projectedIncome = avgMonthlyIncome * 12;
      
      // Calculate growth rate
      const growthRate = calculateGrowthRate(monthlyData);
      
      setIncomeData({
        totalIncome,
        totalExpenses,
        netIncome,
        monthlyIncome: monthlyData,
        recentTransactions,
        incomeByCategory: calculateIncomeByCategory(invoices),
        projectedIncome,
        growthRate
      });
      
    } catch (err) {
      console.error('Failed to fetch income data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyData = (invoices, expenses) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthNum = index + 1;
      const monthlyIncome = invoices
        .filter(inv => {
          const invDate = new Date(inv.paid_at || inv.created_at);
          return invDate.getFullYear() === currentYear && invDate.getMonth() + 1 === monthNum;
        })
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      
      const monthlyExpenses = expenses
        .filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate.getFullYear() === currentYear && expDate.getMonth() + 1 === monthNum;
        })
        .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      
      return { 
        month, 
        income: monthlyIncome, 
        expenses: monthlyExpenses,
        profit: monthlyIncome - monthlyExpenses
      };
    });
  };

  const calculateIncomeByCategory = (invoices) => {
    const categories = {};
    invoices.forEach(inv => {
      const category = inv.project_type || 'General';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += parseFloat(inv.total_amount || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  };

  const calculateGrowthRate = (monthlyData) => {
    const last3Months = monthlyData.slice(-3).reduce((sum, m) => sum + m.income, 0);
    const previous3Months = monthlyData.slice(-6, -3).reduce((sum, m) => sum + m.income, 0);
    if (previous3Months === 0) return 0;
    return ((last3Months - previous3Months) / previous3Months) * 100;
  };

  const exportData = () => {
    const csvData = [
      ['Income Report Generated:', new Date().toLocaleString()],
      [''],
      ['SUMMARY'],
      ['Total Income', `$${incomeData.totalIncome.toFixed(2)}`],
      ['Total Expenses', `$${incomeData.totalExpenses.toFixed(2)}`],
      ['Net Income', `$${incomeData.netIncome.toFixed(2)}`],
      [''],
      ['MONTHLY BREAKDOWN'],
      ['Month', 'Income', 'Expenses', 'Profit'],
      ...incomeData.monthlyIncome.map(m => [m.month, m.income.toFixed(2), m.expenses.toFixed(2), m.profit.toFixed(2)]),
      [''],
      ['RECENT TRANSACTIONS'],
      ['Type', 'Description', 'Amount', 'Date'],
      ...incomeData.recentTransactions.map(t => [
        t.status === 'paid' ? 'Income' : 'Expense',
        t.invoice_number || t.description || 'N/A',
        `$${parseFloat(t.total_amount || t.amount || 0).toFixed(2)}`,
        new Date(t.paid_at || t.expense_date || t.created_at).toLocaleDateString()
      ])
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading income data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Income & Revenue</h1>
          <p style={{ color: '#6b7280' }}>Track your earnings, expenses, and financial growth</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Filter size={16} />
            Filter
          </button>
          <button
            onClick={exportData}
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
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        background: '#f9fafb',
        padding: '0.5rem',
        borderRadius: '12px',
        width: 'fit-content'
      }}>
        {['week', 'month', 'quarter', 'year'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            style={{
              padding: '0.5rem 1rem',
              background: timeRange === range ? '#3b82f6' : 'transparent',
              color: timeRange === range ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#10b98120', padding: '0.5rem', borderRadius: '12px' }}>
              <DollarSign size={24} color="#10b981" />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', background: '#10b98110', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>
              Total Income
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(incomeData.totalIncome)}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>All time earnings</p>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#ef444420', padding: '0.5rem', borderRadius: '12px' }}>
              <CreditCard size={24} color="#ef4444" />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#ef4444', background: '#ef444410', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>
              Total Expenses
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(incomeData.totalExpenses)}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Business costs</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '1.5rem', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '12px' }}>
              <Wallet size={24} />
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Net Income</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(incomeData.netIncome)}</p>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
            Profit Margin: {incomeData.totalIncome > 0 ? ((incomeData.netIncome / incomeData.totalIncome) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f59e0b20', padding: '0.5rem', borderRadius: '12px' }}>
              <TrendingUp size={24} color="#f59e0b" />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#f59e0b10', padding: '0.25rem 0.5rem', borderRadius: '20px' }}>
              Growth Rate
            </span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: incomeData.growthRate >= 0 ? '#10b981' : '#ef4444' }}>
            {incomeData.growthRate >= 0 ? '+' : ''}{incomeData.growthRate.toFixed(1)}%
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>vs previous period</p>
        </div>
      </div>

      {/* Monthly Chart */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Monthly Performance</h3>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '600px' }}>
            {/* Chart Bars */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: '200px', marginBottom: '1rem' }}>
              {incomeData.monthlyIncome.map((month, idx) => {
                const maxValue = Math.max(...incomeData.monthlyIncome.map(m => m.income), 1000);
                const height = (month.income / maxValue) * 180;
                return (
                  <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ 
                      height: `${height}px`, 
                      background: '#3b82f6',
                      borderRadius: '8px 8px 0 0',
                      transition: 'height 0.3s',
                      cursor: 'pointer'
                    }}
                    title={`${month.month}: $${month.income.toFixed(2)}`}
                    />
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>{month.month}</div>
                  </div>
                );
              })}
            </div>
            
            {/* Monthly Stats Table */}
            <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Month</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Income</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Expenses</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Profit</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeData.monthlyIncome.filter(m => m.income > 0 || m.expenses > 0).map((month, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{month.month}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981' }}>
                        {formatCurrency(month.income)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444' }}>
                        {formatCurrency(month.expenses)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: month.profit >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatCurrency(month.profit)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {month.profit >= 0 ? 
                          <TrendingUp size={16} color="#10b981" /> : 
                          <TrendingDown size={16} color="#ef4444" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Income by Category */}
      {incomeData.incomeByCategory.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Income by Category</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {incomeData.incomeByCategory.map((cat, idx) => {
              const percentage = (cat.value / incomeData.totalIncome) * 100;
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>{cat.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{percentage.toFixed(1)}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '8px',
                      background: '#3b82f6',
                      borderRadius: '10px'
                    }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{formatCurrency(cat.value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Recent Transactions</h3>
        {incomeData.recentTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
            <Receipt size={48} style={{ marginBottom: '1rem' }} />
            <p>No transactions yet</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Create invoices and mark them as paid to see your income
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {incomeData.recentTransactions.map((transaction, idx) => {
                  const isIncome = transaction.status === 'paid';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          background: isIncome ? '#d1fae5' : '#fee2e2',
                          color: isIncome ? '#065f46' : '#991b1b'
                        }}>
                          {isIncome ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {transaction.invoice_number || transaction.description || 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: isIncome ? '#10b981' : '#ef4444' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(transaction.total_amount || transaction.amount || 0)}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                        {new Date(transaction.paid_at || transaction.expense_date || transaction.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Projected Income Section */}
      <div style={{
        marginTop: '2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '1.5rem',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ opacity: 0.9, marginBottom: '0.25rem' }}>Projected Annual Income</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(incomeData.projectedIncome)}</p>
            <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
              Based on average of last 3 months
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ opacity: 0.9, marginBottom: '0.25rem' }}>Monthly Average</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {formatCurrency(incomeData.projectedIncome / 12)}
            </p>
          </div>
        </div>
      </div>

      {/* Empty State Guide */}
      {incomeData.totalIncome === 0 && incomeData.totalExpenses === 0 && (
        <div style={{
          marginTop: '2rem',
          background: '#fef3c7',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <p style={{ color: '#92400e', marginBottom: '1rem' }}>
            📊 No income data available yet
          </p>
          <p style={{ color: '#92400e', fontSize: '0.875rem' }}>
            To see your income report:
            <br />
            1. Create invoices for your clients
            <br />
            2. Mark invoices as "paid" when you receive payment
            <br />
            3. Add your business expenses
          </p>
        </div>
      )}
    </div>
  );
};

export default Income;