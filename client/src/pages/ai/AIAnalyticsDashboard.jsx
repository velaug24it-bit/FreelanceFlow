import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Sparkles, DollarSign, Calendar, TrendingUp, Briefcase, 
  CheckCircle, ShieldAlert, Award, FileText, RefreshCw,
  HelpCircle, ChevronRight, ListChecks, Info
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AIAnalyticsDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [copilotData, setCopilotData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('roadmap'); // roadmap, pricing, risk
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActiveProjects();
  }, []);

  const fetchActiveProjects = async () => {
    setLoadingProjects(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/ai/deal-copilot/active-projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setProjects(res.data.projects || []);
        if (res.data.projects.length > 0) {
          setSelectedProjectId(res.data.projects[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching active projects for copilot:', err);
      setError('Could not load active projects. Please try again.');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleAnalyzeDeal = async () => {
    if (!selectedProjectId) return;
    setLoadingAnalysis(true);
    setError('');
    setCopilotData(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/ai/deal-copilot`, {
        projectId: selectedProjectId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setCopilotData(res.data.copilotPlan);
      }
    } catch (err) {
      console.error('Error generating deal copilot plan:', err);
      setError(err.response?.data?.error || 'Failed to analyze project deal. Please try again.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const getPricingBadgeColor = (rating) => {
    const r = rating?.toLowerCase() || '';
    if (r.includes('low')) return { bg: '#fef2f2', text: '#ef4444', border: '#fee2e2' };
    if (r.includes('high')) return { bg: '#fffbeb', text: '#d97706', border: '#fef3c7' };
    return { bg: '#ecfdf5', text: '#10b981', border: '#d1fae5' };
  };

  const selectedProject = projects.find(p => p._id === selectedProjectId);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4f46e5', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Sparkles size={16} />
            AI Deal Negotiation & Mediation
          </div>
          <h1 style={{ margin: '0.25rem 0 0.5rem', fontSize: '2rem', fontWeight: 800 }}>AI Deal Copilot</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
            Align scope, pricing, and escrow splits between Client and Freelancer with AI-guided mediation checkpoints.
          </p>
        </div>
        <button 
          onClick={fetchActiveProjects} 
          disabled={loadingProjects}
          style={{ 
            background: 'white', 
            border: '1px solid #cbd5e1', 
            padding: '0.5rem 1rem', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
        >
          <RefreshCw size={14} className={loadingProjects ? 'spin-anim' : ''} />
          Reload Projects
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem 1.25rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '14px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <ShieldAlert size={18} />
          {error}
        </div>
      )}

      {/* Project Selector Panel */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={18} style={{ color: '#4f46e5' }} />
          Select Active Contract to Analyze
        </h3>
        
        {loadingProjects ? (
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading active contracts...</div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>No active contract found in progress.</p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Accept a bid in the Marketplace first to start an active project contract.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '12px', 
                  border: '1px solid #cbd5e1', 
                  background: 'white',
                  fontSize: '0.95rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {projects.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.title} — (Client: {p.client_name || 'N/A'} | Freelancer: {p.selected_freelancer_name || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleAnalyzeDeal}
              disabled={loadingAnalysis || !selectedProjectId}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
              onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
            >
              {loadingAnalysis ? (
                <>
                  <RefreshCw size={16} className="spin-anim" />
                  Generating Alignment Plan...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Analyze Project & Bids
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Analysis Output Panel */}
      {loadingAnalysis && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', textAlign: 'center' }}>
          <div className="spinner-glow" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', animation: 'spin 1s infinite linear', marginBottom: '1.5rem' }}></div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>Analyzing Project & Proposal Details</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', maxWidth: '420px' }}>
            We're comparing project requirements, skills required, pricing metrics, and proposal scope to create the ultimate mediation blueprint...
          </p>
        </div>
      )}

      {!loadingAnalysis && copilotData && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }} className="responsive-grid">
          
          {/* Left Sidebar Plan Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Overview Card */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em' }}>Deal Rating</span>
              
              {/* Pricing Evaluation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Pricing Assessment</h4>
                {(() => {
                  const colors = getPricingBadgeColor(copilotData.pricingRating);
                  return (
                    <span style={{ 
                      padding: '0.3rem 0.75rem', 
                      borderRadius: '8px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      background: colors.bg, 
                      color: colors.text,
                      border: `1px solid ${colors.border}`
                    }}>
                      {copilotData.pricingRating}
                    </span>
                  );
                })()}
              </div>

              <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                {copilotData.pricingReasoning}
              </p>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '0.75rem', gap: '4px' }}>
              <button
                onClick={() => setActiveSubTab('roadmap')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeSubTab === 'roadmap' ? '#4f46e5' : 'transparent',
                  color: activeSubTab === 'roadmap' ? 'white' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <ListChecks size={16} />
                Agile Scope & Verification
              </button>
              
              <button
                onClick={() => setActiveSubTab('pricing')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeSubTab === 'pricing' ? '#4f46e5' : 'transparent',
                  color: activeSubTab === 'pricing' ? 'white' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <DollarSign size={16} />
                Valuation & Improvements
              </button>
              
              <button
                onClick={() => setActiveSubTab('risk')}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeSubTab === 'risk' ? '#4f46e5' : 'transparent',
                  color: activeSubTab === 'risk' ? 'white' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <ShieldAlert size={16} />
                Escrow & Risk Mitigation
              </button>
            </div>

            {/* Quick Context Card */}
            {selectedProject && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>Contract Summary</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Client:</strong> {selectedProject.client_name}</div>
                  <div><strong>Freelancer:</strong> {selectedProject.selected_freelancer_name}</div>
                  <div><strong>Agreed Budget:</strong> ${selectedProject.bid_amount}</div>
                  <div><strong>Current Status:</strong> <span style={{ textTransform: 'capitalize', color: '#4f46e5', fontWeight: 600 }}>{selectedProject.status}</span></div>
                </div>
              </div>
            )}

          </div>

          {/* Right Main Details Content */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            
            {/* TAB 1: ROADMAP & VERIFICATION */}
            {activeSubTab === 'roadmap' && (
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800 }}>Milestone Verification Roadmap</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
                  Technical deliverables for the freelancer, mapped directly to plain-English verification instructions so clients know what to test.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {copilotData.roadmap?.map((phase, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '16px', 
                        padding: '1.25rem', 
                        background: '#f8fafc',
                        position: 'relative'
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          background: '#dbeafe', 
                          color: '#1e40af', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '0.8rem',
                          fontWeight: 700 
                        }}>
                          {idx + 1}
                        </span>
                        {phase.phase}
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-grid">
                        
                        {/* Deliverables */}
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Technical Deliverables</span>
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                            {phase.deliverables?.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Verification */}
                        <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '12px', padding: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem' }}>
                            <CheckCircle size={14} />
                            Client Verification Steps
                          </span>
                          <p style={{ margin: 0, fontSize: '0.825rem', color: '#065f46', lineHeight: 1.5 }}>
                            {phase.verification_instructions_for_client}
                          </p>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: PRICING & VALUE IMPROVEMENTS */}
            {activeSubTab === 'pricing' && (
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800 }}>Valuation & Scope Improvements</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
                  Suggestions to maximize project value for clients, and realistic options to save costs or scope down.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }} className="responsive-grid">
                  
                  {/* Value Add suggestions */}
                  <div style={{ border: '1px solid #e0e7ff', background: '#f5f3ff', padding: '1.5rem', borderRadius: '18px' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUp size={18} />
                      Value-Add Opportunities
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#4338ca', lineHeight: 1.6 }}>
                      {copilotData.valueAddSuggestions?.map((item, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Cost Saving suggestions */}
                  <div style={{ border: '1px solid #fef3c7', background: '#fffbeb', padding: '1.5rem', borderRadius: '18px' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={18} />
                      Cost & Scope Optimization
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#b45309', lineHeight: 1.6 }}>
                      {copilotData.costSavingSuggestions?.map((item, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{item}</li>
                      ))}
                    </ul>
                  </div>

                </div>

                <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                  <Info size={18} style={{ color: '#4f46e5', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Tip:</strong> Discuss these recommendations directly in your project chat. Aligning on value add-ons early prevents misunderstandings during final milestones.
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: ESCROW SPLITS & RISK MITIGATION */}
            {activeSubTab === 'risk' && (
              <div>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800 }}>Escrow Splits & Risk Mitigation</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
                  Guidelines on setting escrow milestones and steps to handle potential execution delays or scope disputes.
                </p>

                {/* Escrow Release Box */}
                <div style={{ border: '1px solid #d1fae5', background: '#ecfdf5', padding: '1.5rem', borderRadius: '18px', marginBottom: '1.5rem', display: 'flex', gap: '12px' }}>
                  <Award size={24} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div>
                    <h4 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 700, color: '#065f46' }}>Recommended Escrow Split</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#047857', lineHeight: 1.5 }}>
                      {copilotData.escrowSplitGuidelines}
                    </p>
                  </div>
                </div>

                <h4 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Key Integration & Execution Risks</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {copilotData.disputeMitigationRules?.map((rule, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '14px', 
                        padding: '1rem 1.25rem', 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem', color: '#e11d48' }}>
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: '#e11d48' 
                        }}></span>
                        {rule.risk}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.825rem', color: '#475569', lineHeight: 1.5, paddingLeft: '12px' }}>
                        <strong>Mitigation Strategy:</strong> {rule.mitigation}
                      </p>
                    </div>
                  ))}
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {!loadingAnalysis && !copilotData && projects.length > 0 && (
        <div style={{ padding: '4rem 2rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Sparkles size={48} style={{ color: '#4f46e5', opacity: 0.8, marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>AI Deal Copilot Ready</h3>
          <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem', maxWidth: '380px' }}>
            Select one of your active marketplace contracts from the dropdown above and generate a customized plan.
          </p>
        </div>
      )}

      {/* Embedded Styles */}
      <style>{`
        .spin-anim {
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

export default AIAnalyticsDashboard;
