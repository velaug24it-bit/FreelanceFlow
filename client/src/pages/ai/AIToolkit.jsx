import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, DollarSign, Calendar, Compass, 
  FileText, Clipboard, AlertTriangle, Check, ListChecks, 
  BookOpen, ChevronRight, Award, Github, Link, HelpCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Lightweight markdown-to-HTML renderer (no external dependency needed)
const renderMarkdown = (text) => {
  if (!text) return '';
  let html = text
    // Headings
    .replace(/^#### (.+)$/gm, '<h4 style="margin:1rem 0 0.25rem;font-size:0.95rem;color:#1e40af;">$1</h4>')
    .replace(/^### (.+)$/gm,  '<h3 style="margin:1.25rem 0 0.35rem;font-size:1.05rem;color:#1e3a8a;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">$1</h3>')
    .replace(/^## (.+)$/gm,   '<h2 style="margin:1.5rem 0 0.4rem;font-size:1.2rem;color:#0f172a;font-weight:700;">$1</h2>')
    .replace(/^# (.+)$/gm,    '<h1 style="margin:0 0 1rem;font-size:1.5rem;color:#0f172a;font-weight:800;text-align:center;">$1</h1>')
    // Bold & Italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,    '<em>$1</em>')
    // Horizontal rules
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0;"/>')
    // Tables (basic)
    .replace(/^\|(.+)\|$/gm, (row) => {
      const cells = row.split('|').filter(c => c.trim() !== '');
      if (cells.every(c => /^[-:\s]+$/.test(c))) return '';
      const tag = cells[0]?.trim().startsWith('---') ? '' : 'td';
      return '<tr>' + cells.map(c => `<td style="border:1px solid #e2e8f0;padding:6px 12px;">${c.trim()}</td>`).join('') + '</tr>';
    })
    // Bullet points
    .replace(/^[*-] (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul style="margin:0.5rem 0;padding-left:1.5rem;">${m}</ul>`)
    // Wrap consecutive <tr> in <table>
    .replace(/(<tr>.*<\/tr>\n?)+/g, m => `<table style="width:100%;border-collapse:collapse;margin:0.75rem 0;font-size:0.85rem;">${m}</table>`)
    // Line breaks
    .replace(/\n\n/g, '</p><p style="margin:0.5rem 0;">')
    .replace(/\n/g, '<br/>');
  return `<div style="font-size:0.85rem;line-height:1.7;color:#1e293b;"><p style="margin:0.5rem 0;">${html}</p></div>`;
};

const AIToolkit = () => {
  const { user } = useAuth();

  // Read URL params once on mount (set by Marketplace after accepting a bid)
  const _urlParams = new URLSearchParams(window.location.search);
  const _fromMarketplace = _urlParams.get('tab') === 'contracts';

  const [activeTab, setActiveTab] = useState(() =>
    _fromMarketplace ? 'contracts' : 'generator'
  );

  // States for Project Description Generator
  const [genTitle, setGenTitle] = useState('');
  const [genKeywords, setGenKeywords] = useState('');
  const [genOutput, setGenOutput] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  // States for Budget & Timeline Estimator
  const [estTitle, setEstTitle] = useState('');
  const [estCategory, setEstCategory] = useState('Web Development');
  const [estSkills, setEstSkills] = useState('');
  const [estOutput, setEstOutput] = useState(null);
  const [estLoading, setEstLoading] = useState(false);

  // States for Skill Gap Analyzer
  const [gapOutput, setGapOutput] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);

  // States for Portfolio Analyzer
  const [resumeText, setResumeText] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portOutput, setPortOutput] = useState(null);
  const [portLoading, setPortLoading] = useState(false);

  // States for Contract Generator — pre-filled from Marketplace redirect if present
  const [conClient,      setConClient]      = useState(() => _urlParams.get('clientName')     || '');
  const [conFreelancer,  setConFreelancer]  = useState(() => _urlParams.get('freelancerName') || '');
  const [conAmount,      setConAmount]      = useState(() => _urlParams.get('amount')          || '');
  const [conStartDate,   setConStartDate]   = useState(() => _urlParams.get('startDate')       || '');
  const [conEndDate,     setConEndDate]     = useState(() => _urlParams.get('endDate')         || '');
  const [conOutput,      setConOutput]      = useState(null);
  const [conLoading,     setConLoading]     = useState(false);
  const [conSaved,       setConSaved]       = useState(false);
  const [conSaving,      setConSaving]      = useState(false);

  // Clean up URL params without triggering a reload
  useEffect(() => {
    if (_fromMarketplace) {
      window.history.replaceState({}, '', '/ai-toolkit');
    }
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };

  };

  // Trigger generators
  const handleGenerateDescription = async () => {
    if (!genTitle.trim()) return;
    setGenLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai/projects/generate-description`, {
        title: genTitle,
        keywords: genKeywords
      }, getHeaders());
      if (res.data?.success) setGenOutput(res.data.data);
    } catch (err) {
      console.error(err);
      alert('Description generation failed.');
    } finally {
      setGenLoading(false);
    }
  };

  const handleEstimateCosts = async () => {
    if (!estTitle.trim()) return;
    setEstLoading(true);
    try {
      const skillsArray = estSkills.split(',').map(s => s.trim()).filter(Boolean);
      const budgetRes = await axios.post(`${API_URL}/ai/projects/estimate-budget`, {
        title: estTitle,
        category: estCategory,
        skills_required: skillsArray
      }, getHeaders());

      const timelineRes = await axios.post(`${API_URL}/ai/projects/estimate-timeline`, {
        title: estTitle,
        description: 'Estimated requirements from standard model inputs.',
        budget: budgetRes.data?.estimate?.average || 90000,
        skills_required: skillsArray
      }, getHeaders());

      setEstOutput({
        budget: budgetRes.data?.estimate,
        timeline: timelineRes.data?.timeline
      });
    } catch (err) {
      console.error(err);
      alert('Estimation failed.');
    } finally {
      setEstLoading(false);
    }
  };

  const handleAnalyzeSkillGap = async () => {
    setGapLoading(true);
    try {
      const res = await axios.get(`${API_URL}/ai/freelancers/skill-gap`, getHeaders());
      if (res.data?.success) setGapOutput(res.data.analysis);
    } catch (err) {
      console.error(err);
      alert('Skill gap scan failed.');
    } finally {
      setGapLoading(false);
    }
  };

  const handleAnalyzePortfolio = async () => {
    setPortLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai/freelancers/analyze-portfolio`, {
        resume_text: resumeText,
        portfolio_url: portfolioUrl,
        github_url: githubUrl
      }, getHeaders());
      if (res.data?.success) setPortOutput(res.data.analysis);
    } catch (err) {
      console.error(err);
      alert('Portfolio analysis failed.');
    } finally {
      setPortLoading(false);
    }
  };

  const handleGenerateContract = async () => {
    if (!conClient.trim() || !conFreelancer.trim() || !conAmount) return;
    setConLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai/documents/generate-contract`, {
        client_name: conClient,
        freelancer_name: conFreelancer,
        amount: parseFloat(conAmount),
        start_date: conStartDate || new Date().toISOString().split('T')[0],
        end_date: conEndDate || new Date().toISOString().split('T')[0],
        milestones: [{ title: 'Final Phase Delivery', amount: parseFloat(conAmount) }]
      }, getHeaders());
      if (res.data?.success) setConOutput(res.data.contract);
    } catch (err) {
      console.error(err);
      alert('Contract creation failed.');
    } finally {
      setConLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleSaveContract = async () => {
    if (!conOutput) return;
    setConSaving(true);
    try {
      // Save to localStorage so it persists across sessions
      const savedContracts = JSON.parse(localStorage.getItem('ff_saved_contracts') || '[]');
      const record = {
        id: Date.now(),
        client: conClient,
        freelancer: conFreelancer,
        amount: conAmount,
        startDate: conStartDate,
        endDate: conEndDate,
        savedAt: new Date().toISOString(),
        contract_text: conOutput.contract_text,
        agreement_summary: conOutput.agreement_summary
      };
      savedContracts.unshift(record);
      // Keep only last 20 contracts
      localStorage.setItem('ff_saved_contracts', JSON.stringify(savedContracts.slice(0, 20)));
      setConSaved(true);
      alert(`✅ Contract saved successfully!\n\nClient: ${conClient}\nFreelancer: ${conFreelancer}\nAmount: $${conAmount}\n\nYou can find all saved contracts in your browser storage.`);
    } catch (err) {
      alert('Failed to save contract.');
    } finally {
      setConSaving(false);
    }
  };


  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      <style>{`
        @media (max-width: 768px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .responsive-metrics {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.75rem !important;
          }
          .responsive-tabs {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: 'white', padding: '0.75rem', borderRadius: '16px', display: 'flex' }}>
          <Sparkles size={28} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800 }}>AI Business Toolkit</h1>
          <p style={{ margin: 0, color: '#64748b', marginTop: '0.25rem' }}>Modular tools to generate project specs, forecast timelines, and evaluate candidates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="responsive-tabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { id: 'generator', label: 'Spec Writer', icon: <FileText size={18} /> },
          { id: 'estimator', label: 'Timeline & Budget', icon: <DollarSign size={18} /> },
          { id: 'skillgap', label: 'Skill Gap', icon: <BookOpen size={18} /> },
          { id: 'portfolio', label: 'Resume & Portfolio', icon: <Award size={18} /> },
          { id: 'contract', label: 'Contract Generator', icon: <Clipboard size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 0.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #4f46e5' : '3px solid transparent',
              color: activeTab === tab.id ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 25px rgba(15, 23, 42, 0.02)' }}>
        
        {/* Panel 1: Project Description Generator */}
        {activeTab === 'generator' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem' }}>AI Project Specification Generator</h2>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Project Title</label>
                  <input
                    type="text"
                    value={genTitle}
                    onChange={e => setGenTitle(e.target.value)}
                    placeholder="e.g. Building an iOS Booking App"
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Keywords (comma separated)</label>
                  <input
                    type="text"
                    value={genKeywords}
                    onChange={e => setGenKeywords(e.target.value)}
                    placeholder="e.g. Flutter, Firebase, Stripe, Maps API"
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <button
                  onClick={handleGenerateDescription}
                  disabled={genLoading || !genTitle}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {genLoading ? 'Writing specs...' : 'Generate specifications'}
                </button>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', border: '1px dashed #cbd5e1', minHeight: '300px' }}>
                {genOutput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#4f46e5' }}>Generated Spec</strong>
                      <button onClick={() => copyToClipboard(genOutput.description)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clipboard size={12} /> Copy description
                      </button>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Description</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>{genOutput.description}</p>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Scope of Work</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                        {genOutput.scope_of_work?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Deliverables</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                        {genOutput.deliverables?.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <strong>Duration:</strong> {genOutput.estimated_duration}
                      </div>
                      <div>
                        <strong>Suggested budget:</strong> ₹{genOutput.suggested_budget}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '5rem' }}>
                    Type your project title and keywords, then click Generate to get full scope and specs.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Budget & Timeline Estimator */}
        {activeTab === 'estimator' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem' }}>AI Budget & Timeline Estimator</h2>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Project Title</label>
                  <input
                    type="text"
                    value={estTitle}
                    onChange={e => setEstTitle(e.target.value)}
                    placeholder="e.g. React Native Uber clone"
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Category</label>
                  <select
                    value={estCategory}
                    onChange={e => setEstCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                  >
                    {['Web Development', 'Mobile App', 'Design', 'Content Writing', 'Marketing', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Skills Needed (comma separated)</label>
                  <input
                    type="text"
                    value={estSkills}
                    onChange={e => setEstSkills(e.target.value)}
                    placeholder="e.g. React Native, Redux, Node.js"
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <button
                  onClick={handleEstimateCosts}
                  disabled={estLoading || !estTitle}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {estLoading ? 'Analyzing project baseline...' : 'Estimate Budget & Timeline'}
                </button>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', border: '1px dashed #cbd5e1', minHeight: '300px' }}>
                {estOutput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#4f46e5' }}>Budget Estimation Breakdown</h3>
                      <div className="responsive-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Minimum cost</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>₹{estOutput.budget?.minimum}</div>
                        </div>
                        <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#1e3a8a' }}>Average cost</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem' }}>₹{estOutput.budget?.average}</div>
                        </div>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Maximum cost</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>₹{estOutput.budget?.maximum}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.75rem', lineHeight: 1.5 }}>
                        <strong>Reasoning:</strong> {estOutput.budget?.reasoning}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#4f46e5', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Estimated timeline: {estOutput.timeline?.estimated_duration}</span>
                      </h3>
                      
                      <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Suggested Milestone Roadmap</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {estOutput.timeline?.milestones?.map((m, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'white', border: '1px solid #f1f5f9', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.825rem' }}>
                            <div>
                              <strong>{m.title}</strong>
                              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>{m.deliverables}</div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 600 }}>
                              <div>{m.duration_days} days</div>
                              <div style={{ color: '#4f46e5', fontSize: '0.75rem' }}>{m.budget_percentage}% budget</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: '#b91c1c', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={14} /> Delay Risk Alerts
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {estOutput.timeline?.risks?.map((r, i) => (
                          <div key={i} style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#991b1b' }}>
                            <strong>Risk:</strong> {r.risk}
                            <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.2rem' }}><strong>Mitigation:</strong> {r.mitigation}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '5rem' }}>
                    Type your project title, category, and skills to output standard budget forecasts and risk roadmaps.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Panel 3: Skill Gap Analyzer */}
        {activeTab === 'skillgap' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>AI Freelancer Skill Gap Analyzer</h2>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>Scans your profile skills against live projects demand and outlines steps to boost bookings</p>
            
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Profile Health</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Current Role:</span>
                    <strong style={{ textTransform: 'capitalize' }}>{user?.role}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Connects Balance:</span>
                    <strong>{user?.connects_balance} Connects</strong>
                  </div>
                  <button
                    onClick={handleAnalyzeSkillGap}
                    disabled={gapLoading}
                    style={{
                      padding: '0.85rem',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)'
                    }}
                  >
                    {gapLoading ? 'Scanning marketplace...' : 'Run Skill Gap Audit'}
                  </button>
                </div>
              </div>

              <div style={{ minHeight: '300px' }}>
                {gapOutput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: '#b91c1c', marginBottom: '0.5rem' }}>Missing Highly Demanded Skills</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {gapOutput.missing_skills?.map((s, i) => (
                          <span key={i} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: '#4f46e5', marginBottom: '0.5rem' }}>Hot/Trending Technologies</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {gapOutput.trending_technologies?.map((t, i) => (
                          <span key={i} style={{ background: '#eff6ff', border: '1px solid #dbeafe', color: '#1e40af', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>{t}</span>
                        ))}
                      </div>
                    </div>

                    <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#0f172a' }}>Suggested Certifications</strong>
                        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                          {gapOutput.suggested_certifications?.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#0f172a' }}>Profile Bio Enhancements</strong>
                        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                          {gapOutput.profile_improvement_suggestions?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                      <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#0f172a' }}>Custom Learning Roadmap</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {gapOutput.learning_roadmap?.map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid #f1f5f9' }}>
                            <ChevronRight size={14} style={{ color: '#4f46e5', marginTop: '2px' }} />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px dashed #cbd5e1', padding: '5rem 1.5rem', borderRadius: '16px', color: '#94a3b8', textAlign: 'center' }}>
                    Click Run Skill Gap Audit to compare your skills against open projects posted on FreelanceFlow.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Panel 4: Resume & Portfolio Analyzer */}
        {activeTab === 'portfolio' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem' }}>AI Portfolio & Resume Analyzer</h2>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Paste Resume/Portfolio text</label>
                  <textarea
                    rows={6}
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    placeholder="Paste education, experience history, or text resumes..."
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                  />
                </div>
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Portfolio Link</label>
                    <input
                      type="text"
                      value={portfolioUrl}
                      onChange={e => setPortfolioUrl(e.target.value)}
                      placeholder="https://myportfolio.com"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>GitHub Profile Link</label>
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={e => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/myname"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAnalyzePortfolio}
                  disabled={portLoading}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {portLoading ? 'Scoring portfolio quality...' : 'Analyze and Score Portfolio'}
                </button>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', border: '1px dashed #cbd5e1', minHeight: '300px' }}>
                {portOutput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#4f46e5' }}>Technical Scoring Breakdown</h3>
                    
                    <div className="responsive-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                      <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Skills Score</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>{portOutput.skill_score}/100</div>
                      </div>
                      <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Experience</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem' }}>{portOutput.experience_score}/100</div>
                      </div>
                      <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Portfolio Qlt</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{portOutput.portfolio_quality_score}/100</div>
                      </div>
                      <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#1e3a8a' }}>Confidence</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4f46e5', marginTop: '0.25rem' }}>{portOutput.hiring_confidence_score}/100</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: '#10b981', marginBottom: '0.4rem' }}>Candidate Strengths</strong>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                        {portOutput.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: '#ef4444', marginBottom: '0.4rem' }}>Recommended Improvements</strong>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                        {portOutput.improvements?.map((imp, i) => <li key={i}>{imp}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '5rem' }}>
                    Submit text descriptions or direct developer links to run an automated portfolio audit.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Panel 5: Contract Generator */}
        {activeTab === 'contract' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem' }}>AI Professional Contract Generator</h2>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Client Name</label>
                    <input
                      type="text"
                      value={conClient}
                      onChange={e => setConClient(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Freelancer Name</label>
                    <input
                      type="text"
                      value={conFreelancer}
                      onChange={e => setConFreelancer(e.target.value)}
                      placeholder="e.g. John Doe"
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Contract Value ($)</label>
                  <input
                    type="number"
                    value={conAmount}
                    onChange={e => setConAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Start Date</label>
                    <input
                      type="date"
                      value={conStartDate}
                      onChange={e => setConStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>End Date</label>
                    <input
                      type="date"
                      value={conEndDate}
                      onChange={e => setConEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerateContract}
                  disabled={conLoading || !conClient || !conFreelancer || !conAmount}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {conLoading ? 'Drafting agreement clauses...' : 'Generate Legal Agreement'}
                </button>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', border: '1px dashed #cbd5e1', minHeight: '300px' }}>
                {conOutput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#4f46e5' }}>Generated Contract</strong>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => copyToClipboard(conOutput.contract_text)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clipboard size={12} /> Copy Text
                        </button>
                        <button
                          onClick={handleSaveContract}
                          disabled={conSaving || conSaved}
                          style={{
                            background: conSaved ? '#d1fae5' : '#10b981',
                            color: conSaved ? '#065f46' : 'white',
                            border: 'none',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            cursor: conSaved ? 'default' : 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          {conSaved ? '✅ Saved' : conSaving ? 'Saving...' : '💾 Save Contract'}
                        </button>
                        <button onClick={() => window.print()} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem' }}>
                          Print / PDF
                        </button>
                      </div>
                    </div>
                    {conOutput.agreement_summary && (
                      <div style={{ background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem', color: '#1e3a8a', borderLeft: '3px solid #3b82f6' }}>
                        <strong>Summary:</strong> {conOutput.agreement_summary}
                      </div>
                    )}
                    <div
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1.5rem',
                        maxHeight: '480px',
                        overflowY: 'auto',
                        fontFamily: 'Georgia, serif'
                      }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(conOutput.contract_text) }}
                    />
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '5rem' }}>
                    Provide client/freelancer details and budget, then click Generate to create a legally binding agreement framework.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AIToolkit;
