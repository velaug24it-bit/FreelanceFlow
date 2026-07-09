const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Import AI services
const { recommendFreelancers } = require('../services/ai/recommendation');
const { generateProjectDescription } = require('../services/ai/projectGen');
const { estimateBudget, estimateTimeline } = require('../services/ai/estimator');
const { smartSearch } = require('../services/ai/search');
const { callGemini } = require('../services/ai/gemini');
const { analyzeProposal } = require('../services/ai/proposalAnalyzer');
const { analyzeSkillGap } = require('../services/ai/skillGap');
const { summarizeReviews } = require('../services/ai/reviewSummarizer');
const { auditFraudRisk } = require('../services/ai/fraudDetector');
const { generatePlatformAnalytics } = require('../services/ai/analytics');
const { generateContractDocument, generateInvoiceDetails } = require('../services/ai/documentGen');
const { predictProjectRisk } = require('../services/ai/riskPredictor');
const { analyzePortfolio } = require('../services/ai/portfolioAnalyzer');
const Project = require('../models/Project');
const User = require('../models/User');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');

// Local JWT Authentication Verification middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verified.id;
    next();
  } catch (err) {
    console.error('Token verification failed inside AI router:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// 1. Recommend Freelancers for a Project
router.get('/projects/:projectId/recommendations', verifyToken, async (req, res) => {
  try {
    const recommendations = await recommendFreelancers(req.params.projectId);
    res.json({ success: true, recommendations });
  } catch (err) {
    res.status(500).json({ error: 'Recommendation matching failed', message: err.message });
  }
});

// 2. Project Description & Scope Generator
router.post('/projects/generate-description', verifyToken, async (req, res) => {
  try {
    const { title, keywords } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Project title is required' });
    }
    const data = await generateProjectDescription(title, keywords || '');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate project specifications', message: err.message });
  }
});

// 3. AI Budget Estimator
router.post('/projects/estimate-budget', verifyToken, async (req, res) => {
  try {
    const { title, category, skills_required } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and Category are required' });
    }
    const estimate = await estimateBudget(title, category, skills_required || []);
    res.json({ success: true, estimate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute budget estimate', message: err.message });
  }
});

// 4. AI Timeline Estimator
router.post('/projects/estimate-timeline', verifyToken, async (req, res) => {
  try {
    const { title, description, budget, skills_required } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const timeline = await estimateTimeline(title, description || '', budget || 0, skills_required || []);
    res.json({ success: true, timeline });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute timeline estimate', message: err.message });
  }
});

// 5. Smart Natural Language Search
router.get('/smart-search', verifyToken, async (req, res) => {
  try {
    const { q, type } = req.query; // type: 'projects' | 'freelancers'
    if (!q) {
      return res.status(400).json({ error: 'Query string is required' });
    }
    const results = await smartSearch(q, type || 'projects');
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: 'Smart search parsing failed', message: err.message });
  }
});

// 6. AI Business Assistant Chatbot
router.post('/chatbot', verifyToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fetch user context
    const user = await User.findById(req.userId);
    const userRole = user ? user.role : 'User';
    const userName = user ? user.name : 'User';
    
    // Fetch user's projects
    const projects = await Project.find({
      $or: [
        { user_id: req.userId },
        { client_id: req.userId },
        { selected_freelancer_id: req.userId }
      ]
    }).select('title status progress budget currency project_type');

    // Fetch user's clients and invoices
    const clients = await Client.find({ user_id: req.userId });
    const invoices = await Invoice.find({
      $or: [
        { user_id: req.userId },
        { client_id: req.userId }
      ]
    });

    const myInvoices = invoices.filter(i => i.user_id && i.user_id.toString() === req.userId.toString());
    let totalRevenue = myInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      
    // Include completed marketplace projects in revenue
    const mpProjects = projects.filter(p => p.selected_freelancer_id && p.selected_freelancer_id.toString() === req.userId.toString() && p.payment_status === 'paid' && p.status === 'completed');
    totalRevenue += mpProjects.reduce((sum, p) => sum + (parseFloat(p.bid_amount) || parseFloat(p.budget) || 0), 0);

    const pendingInvoices = myInvoices.filter(inv => inv.status === 'pending');
    const pendingInvoicesAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const completedProjects = projects.filter(p => p.status === 'completed');
    const activeProjectDocs = projects.filter(p => p.status !== 'completed' && p.user_id && p.user_id.toString() === req.userId.toString());
    const activeMpProjectDocs = projects.filter(p => p.status !== 'completed' && p.selected_freelancer_id && p.selected_freelancer_id.toString() === req.userId.toString());

    // Build the data context
    let projectContext = `\nDashboard Overview Data (Use EXACTLY these numbers if asked for an overview):\n`;
    projectContext += `Name: ${userName}\nRole: ${userRole}\n`;
    projectContext += `Total Clients: ${clients.length}\n`;
    projectContext += `Total Revenue: $${totalRevenue.toFixed(2)}\n`;
    projectContext += `Pending Invoices: $${pendingInvoicesAmount.toFixed(2)} (${pendingInvoices.length} invoices pending)\n`;
    projectContext += `Active Personal Projects Count: ${activeProjectDocs.length}\n`;
    projectContext += `Active Marketplace Projects Count: ${activeMpProjectDocs.length}\n`;
    
    // Only list up to 5 projects to save context space
    const displayActive = activeProjectDocs.slice(0, 5).map(p => `"${p.title}"`).join(', ');
    const displayActiveMp = activeMpProjectDocs.slice(0, 5).map(p => `"${p.title}"`).join(', ');
    
    projectContext += `Active Personal Projects List (Sample): ${displayActive || 'None'}${activeProjectDocs.length > 5 ? ' ...and more' : ''}\n`;
    projectContext += `Active Marketplace Projects List (Sample): ${displayActiveMp || 'None'}${activeMpProjectDocs.length > 5 ? ' ...and more' : ''}\n`;
    projectContext += `Completed Projects Count: ${completedProjects.length}\n`;

    // Build context-aware chat system instruction
    const systemPrompt = `
      You are FreelanceFlow AI, an elite virtual Business Assistant, recruiter, and dashboard consultant.
      You guide clients and freelancers on the platform.
      Provide detailed answers about:
      - Recommending freelancers (mention they can use AI Matchmaker)
      - Estimating budgets and milestones
      - Writing contracts and generating GST invoices
      - Explaining dashboard statistics (milestones progress, earnings, invoice statuses)
      - If the user asks about their own data, projects, completed projects, active projects, etc., use the "User Context" provided below to give them an EXACT list and answer, do NOT give generic steps on how to find them. Answer precisely based on their real data.
      ${projectContext}
      Keep answers professional, brief, and structured in clean markdown list styles.
    `;

    // Package conversational history for Gemini
    const fullPrompt = history 
      ? `Conversation History:\n${history.map(h => `${h.role}: ${h.text}`).join('\n')}\nUser: ${message}`
      : message;

    const response = await callGemini(fullPrompt, false, systemPrompt);
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ error: 'Chat assistant error', message: err.message });
  }
});

// 7. AI Proposal Pitch Analyzer
router.post('/proposals/analyze', verifyToken, async (req, res) => {
  try {
    const { proposal_text, project_description, bid_amount } = req.body;
    if (!proposal_text || !project_description) {
      return res.status(400).json({ error: 'Proposal and Project details are required' });
    }
    const analysis = await analyzeProposal(proposal_text, project_description, bid_amount || 0);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze proposal', message: err.message });
  }
});

// 8. AI Skill Gap Analyzer (Uses logged in freelancer context)
router.get('/freelancers/skill-gap', verifyToken, async (req, res) => {
  try {
    const analysis = await analyzeSkillGap(req.userId);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: 'Skill gap analysis failed', message: err.message });
  }
});

// 9. AI Review Summarizer
router.get('/freelancers/:freelancerId/reviews-summary', verifyToken, async (req, res) => {
  try {
    const summary = await summarizeReviews(req.params.freelancerId);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ error: 'Review compilation failed', message: err.message });
  }
});

// 10. AI Trust & Fraud Compliance check
router.post('/fraud-check', verifyToken, async (req, res) => {
  try {
    const { target_type, target_id } = req.body;
    if (!target_type || !target_id) {
      return res.status(400).json({ error: 'Target type and Target ID are required' });
    }
    const audit = await auditFraudRisk(target_type, target_id);
    res.json({ success: true, audit });
  } catch (err) {
    res.status(500).json({ error: 'Fraud check failed', message: err.message });
  }
});

// 11. AI Platform Business Analytics
router.get('/analytics/dashboard', verifyToken, async (req, res) => {
  try {
    const analytics = await generatePlatformAnalytics();
    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ error: 'Analytics compilation failed', message: err.message });
  }
});

// 12. AI Contract & Invoice Generator
router.post('/documents/generate-contract', verifyToken, async (req, res) => {
  try {
    const { project_id, client_name, freelancer_name, amount, start_date, end_date, milestones } = req.body;
    if (!client_name || !freelancer_name || !amount) {
      return res.status(400).json({ error: 'Missing details for contract generation' });
    }
    const contract = await generateContractDocument(project_id, client_name, freelancer_name, amount, start_date, end_date, milestones || []);
    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ error: 'Contract generation failed', message: err.message });
  }
});

router.post('/documents/generate-invoice', verifyToken, async (req, res) => {
  try {
    const { invoice_number, client_name, client_company, freelancer_name, subtotal, tax_rate } = req.body;
    if (!invoice_number || !client_name || !subtotal) {
      return res.status(400).json({ error: 'Missing details for invoice generation' });
    }
    const invoice = generateInvoiceDetails(invoice_number, client_name, client_company, freelancer_name, subtotal, tax_rate || 18);
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ error: 'Invoice generation failed', message: err.message });
  }
});

// 13. AI Project Delivery Risk Predictor
router.get('/projects/:projectId/risk-prediction', verifyToken, async (req, res) => {
  try {
    const prediction = await predictProjectRisk(req.params.projectId);
    res.json({ success: true, prediction });
  } catch (err) {
    res.status(500).json({ error: 'Risk assessment failed', message: err.message });
  }
});

// 15. AI Portfolio Analyzer
router.post('/freelancers/analyze-portfolio', verifyToken, async (req, res) => {
  try {
    const { resume_text, portfolio_url, github_url } = req.body;
    const analysis = await analyzePortfolio(resume_text || '', portfolio_url || '', github_url || '');
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: 'Portfolio analysis failed', message: err.message });
  }
});

module.exports = router;
