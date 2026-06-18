import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, 
  Download, Filter, Wallet, CreditCard, Receipt
} from 'lucide-react';

const Income = () => {
  const [loading, setLoading] = useState(true);
  const [incomeData, setIncomeData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    monthlyIncome: [],
    recentTransactions: []
  });

  useEffect(() => {
    fetchIncomeData();
  }, []);

  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [invoicesRes, expensesRes] = await Promise.all([
        axios.get('/api/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/expenses', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { expenses: [] } }))
      ]);
      
      const invoices = invoicesRes.data.invoices || [];
      const expenses = expensesRes.data.expenses || [];
      
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const totalIncome = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      const netIncome = totalIncome - totalExpenses;
      
      // Calculate monthly data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyIncome = months.map((month, index) => {
        const monthlyAmount = paidInvoices
          .filter(inv => {
            const invDate = new Date(inv.paid_at || inv.created_at);
            return invDate.getMonth() === index;
          })
          .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
        return { month, amount: monthlyAmount };
      });
      
      const recentTransactions = [...paidInvoices, ...expenses]
        .sort((a, b) => new Date(b.paid_at || b.expense_date || b.created_at) - new Date(a.paid_at || a.expense_date || a.created_at))
        .slice(0, 10);
      
      setIncomeData({
        totalIncome,
        totalExpenses,
        netIncome,
        monthlyIncome,
        recentTransactions
      });
      
    } catch (err) {
      console.error('Failed to fetch income data:', err);
    } finally {
      setLoading(false);
    }
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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Income & Revenue</h1>
        <p style={{ color: '#6b7280' }}>Track your earnings and financial growth</p>
      </div>

      {/* Stats Cards */}
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
            <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Total Income</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(incomeData.totalIncome)}</p>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#ef444420', padding: '0.5rem', borderRadius: '12px' }}>
              <CreditCard size={24} color="#ef4444" />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Total Expenses</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(incomeData.totalExpenses)}</p>
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
      </div>

      {/* Monthly Chart */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Monthly Income</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: '200px' }}>
          {incomeData.monthlyIncome.map((month, idx) => {
            const maxValue = Math.max(...incomeData.monthlyIncome.map(m => m.amount), 1000);
            const height = (month.amount / maxValue) * 180;
            return (
              <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ 
                  height: `${height}px`, 
                  background: '#3b82f6',
                  borderRadius: '8px 8px 0 0',
                  transition: 'height 0.3s'
                }} />
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>{month.month}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: '600' }}>{formatCurrency(month.amount)}</div>
              </div>
            );
          })}
        </div>
      </div>

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
    </div>
  );
};

export default Income;