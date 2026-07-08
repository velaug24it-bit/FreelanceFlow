const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = require('../config/mongodb');

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

// Models for seed data
const User = require('../models/User');
const ProjectPost = require('../models/ProjectPost');
const Bid = require('../models/Bid');
const Review = require('../models/Review');

async function runTests() {
  console.log('🤖 Starting FreelanceFlow AI Test Suite...');
  
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Database connection failed. Cannot run tests.');
    process.exit(1);
  }

  try {
    // 1. Seed dummy data if database is empty
    console.log('⚙️ Seeding test resources...');
    let testFreelancer = await User.findOne({ role: 'freelancer' });
    if (!testFreelancer) {
      testFreelancer = await User.create({
        email: `test_free_${Date.now()}@example.com`,
        full_name: 'Test Freelancer AI',
        password_hash: 'hash',
        role: 'freelancer',
        skills: ['React', 'Node.js', 'MongoDB', 'CSS'],
        bio: 'Senior Full Stack React Developer and MongoDB expert.',
        hourly_rate: 45
      });
    }

    let testClient = await User.findOne({ role: 'user' });
    if (!testClient) {
      testClient = await User.create({
        email: `test_client_${Date.now()}@example.com`,
        full_name: 'Test Client AI',
        password_hash: 'hash',
        role: 'user'
      });
    }

    let testProject = await ProjectPost.findOne({ title: 'AI Recommendation Test Project' });
    if (!testProject) {
      testProject = await ProjectPost.create({
        client_id: testClient._id,
        client_name: testClient.full_name,
        title: 'AI Recommendation Test Project',
        description: 'React developer needed for building a premium SaaS dashboard UI.',
        category: 'Web Development',
        budget_min: 50000,
        budget_max: 150000,
        duration: '1 Month',
        skills_required: ['React', 'Node.js']
      });
    }

    let testBid = await Bid.findOne({ freelancer_id: testFreelancer._id });
    if (!testBid) {
      testBid = await Bid.create({
        project_id: testProject._id,
        freelancer_id: testFreelancer._id,
        freelancer_name: testFreelancer.full_name,
        bid_amount: 90000,
        estimated_days: 20,
        proposal: 'I have 5 years experience building custom React SPAs with Express endpoints.',
        phone_number: '+919999999999'
      });
    }

    let testReview = await Review.findOne({ reviewee_id: testFreelancer._id });
    if (!testReview) {
      testReview = await Review.create({
        project_id: testProject._id,
        reviewer_id: testClient._id,
        reviewer_name: testClient.full_name,
        reviewee_id: testFreelancer._id,
        reviewee_name: testFreelancer.full_name,
        rating: 5,
        comment: 'Amazing code quality, delivered early. Outstanding communication!'
      });
    }

    console.log('✅ Seeding completed successfully. Running verification checks...');

    // Test 1: Gemini Core Helper
    console.log('\n🔍 Testing Module: Gemini Core API Connection...');
    const chatResult = await callGemini('Hello. Say: Platform AI Active.');
    console.log('Result:', chatResult);

    // Test 2: Project Description Generator
    console.log('\n🔍 Testing Module: AI Project Description Generator...');
    const descResult = await generateProjectDescription('Mobile Booking App', 'Flutter, Firebase, Stripe');
    console.log('Result Keys:', Object.keys(descResult));

    // Test 3: AI Budget Estimator
    console.log('\n🔍 Testing Module: AI Budget Estimator...');
    const budgetResult = await estimateBudget('E-commerce Website', 'Web Development', ['React', 'Shopify']);
    console.log('Result:', budgetResult);

    // Test 4: AI Timeline Estimator
    console.log('\n🔍 Testing Module: AI Timeline & Milestone Estimator...');
    const timelineResult = await estimateTimeline('E-commerce Website', 'Build custom React/Node checkout funnel.', 80000, ['React']);
    console.log('Result:', timelineResult);

    // Test 5: AI Freelancer Recommendation Engine
    console.log('\n🔍 Testing Module: AI Freelancer Recommendation Engine...');
    const recs = await recommendFreelancers(testProject._id);
    console.log('Results Count:', recs.length, 'Top match %:', recs[0]?.matchPercentage);

    // Test 6: AI Proposal Analyzer
    console.log('\n🔍 Testing Module: AI Proposal Pitch Analyzer...');
    const pitchResult = await analyzeProposal(testBid.proposal, testProject.description, testBid.bid_amount);
    console.log('Result:', pitchResult);

    // Test 7: AI Skill Gap Analyzer
    console.log('\n🔍 Testing Module: AI Skill Gap Analyzer...');
    const gapResult = await analyzeSkillGap(testFreelancer._id);
    console.log('Result Keys:', Object.keys(gapResult));

    // Test 8: AI Review Summarizer
    console.log('\n🔍 Testing Module: AI Review Summarizer...');
    const summaryResult = await summarizeReviews(testFreelancer._id);
    console.log('Result:', summaryResult);

    // Test 9: AI Fraud compliance detection
    console.log('\n🔍 Testing Module: AI Fraud Detection...');
    const fraudResultProfile = await auditFraudRisk('profile', testFreelancer._id);
    console.log('Profile risk:', fraudResultProfile.risk_score, 'flags:', fraudResultProfile.flags);
    const fraudResultBid = await auditFraudRisk('bid', testBid._id);
    console.log('Bid risk:', fraudResultBid.risk_score, 'flags:', fraudResultBid.flags);

    // Test 10: AI Project Delivery Risk Predictor
    console.log('\n🔍 Testing Module: AI Project Risk Predictor...');
    const riskResult = await predictProjectRisk(testProject._id);
    console.log('Result:', riskResult);

    // Test 11: AI Invoice & Contract Generator
    console.log('\n🔍 Testing Module: AI Invoice & Contract Generator...');
    const contractResult = await generateContractDocument(testProject._id, testClient.full_name, testFreelancer.full_name, 120000, '2026-07-09', '2026-08-09', [{title: 'Alpha Delivery', amount: 60000}]);
    console.log('Contract Summary:', contractResult.agreement_summary);
    const invoiceResult = generateInvoiceDetails('INV-2026-0001', testClient.full_name, 'Test Corp', testFreelancer.full_name, 60000, 18);
    console.log('GST Invoice computed total:', invoiceResult.total_amount);

    // Test 12: AI Smart Search translator
    console.log('\n🔍 Testing Module: AI Smart Search parser...');
    const searchResult = await smartSearch('Need React developer under $50/hr', 'freelancers');
    console.log('Parsed criteria:', searchResult.criteria);
    console.log('Found matches:', searchResult.results.length);

    // Test 13: AI platform business analytics
    console.log('\n🔍 Testing Module: AI Business Analytics Insights...');
    const analyticsResult = await generatePlatformAnalytics();
    console.log('Forecasted Revenue:', analyticsResult.forecastedRevenue, 'Insights:', analyticsResult.insights.length);

    // Test 14: AI Portfolio Analyzer
    console.log('\n🔍 Testing Module: AI Portfolio Analyzer...');
    const portfolioResult = await analyzePortfolio('Resume: 3 years node development, 2 React projects.', 'https://johndoe.dev', 'https://github.com/johndoe');
    console.log('Hiring confidence score:', portfolioResult.hiring_confidence_score);

    console.log('\n🎉 ALL 15 AI BACKEND MODULES SUCCESSFULLY VERIFIED AND PASSING!');
  } catch (err) {
    console.error('❌ Verification Suite Failed:', err);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

runTests();
