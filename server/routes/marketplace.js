const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ProjectPost = require('../models/ProjectPost');
const Bid = require('../models/Bid');
const Contract = require('../models/Contract');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Verify token middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ============ CLIENT ROUTES ============

// Post a new project
router.post('/projects', verifyToken, async (req, res) => {
    try {
        const { title, description, category, budget_min, budget_max, duration, skills_required, deadline } = req.body;
        
        const user = await User.findById(req.userId);
        
        const project = await ProjectPost.create({
            client_id: req.userId,
            client_name: user.full_name,
            title,
            description,
            category,
            budget_min,
            budget_max,
            duration,
            skills_required: skills_required || [],
            deadline,
            status: 'open',
            progress: 0,
            current_phase: 'planning',
            status_updates: [{
                message: 'Project posted and open for bids',
                status: 'open',
                progress: 0,
                updated_by: req.userId,
                updated_by_name: user.full_name
            }]
        });
        
        res.status(201).json({ success: true, project });
    } catch (err) {
        console.error('Error posting project:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get client's posted projects
router.get('/my-projects', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectPost.find({ client_id: req.userId }).sort({ created_at: -1 });
        res.json({ projects });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all open projects
router.get('/open-projects', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectPost.find({ status: 'open' }).sort({ created_at: -1 });
        res.json({ projects });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get freelancer's active projects
router.get('/my-active-projects', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectPost.find({
            selected_freelancer_id: req.userId,
            status: { $in: ['in_progress', 'review'] }
        }).sort({ created_at: -1 });
        res.json({ projects });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single project details
router.get('/projects/:id', verifyToken, async (req, res) => {
    try {
        const project = await ProjectPost.findById(req.params.id);
        res.json({ project });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ BIDDING ROUTES ============

// Place a bid - FIXED
router.post('/bids', verifyToken, async (req, res) => {
    try {
        const { project_id, bid_amount, estimated_days, proposal, portfolio_link } = req.body;
        
        const user = await User.findById(req.userId);
        const CONNECTS_COST = 1;
        
        if (user.connects_balance < CONNECTS_COST) {
            return res.status(400).json({ 
                error: 'Insufficient connects. Please purchase more connects to place bids.',
                needs_connects: true
            });
        }
        
        const existingBid = await Bid.findOne({ project_id, freelancer_id: req.userId });
        if (existingBid) {
            return res.status(400).json({ error: 'You have already placed a bid on this project' });
        }
        
        const bid = await Bid.create({
            project_id: project_id,
            freelancer_id: req.userId,
            freelancer_name: user.full_name,
            bid_amount: bid_amount,
            estimated_days: estimated_days,
            proposal: proposal,
            portfolio_link: portfolio_link || '',
            status: 'pending'
        });
        
        await User.findByIdAndUpdate(req.userId, {
            $inc: { connects_balance: -CONNECTS_COST, total_connects_used: CONNECTS_COST }
        });
        
        await ProjectPost.findByIdAndUpdate(project_id, { $inc: { bids_count: 1 } });
        
        console.log('✅ Bid placed:', bid._id, 'by user:', user.full_name);
        
        res.status(201).json({ success: true, bid });
    } catch (err) {
        console.error('Error placing bid:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get bids for a project
router.get('/projects/:projectId/bids', verifyToken, async (req, res) => {
    try {
        const bids = await Bid.find({ project_id: req.params.projectId }).sort({ bid_amount: 1 });
        res.json({ bids });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get my bids - FIXED
router.get('/my-bids', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;
        console.log('Fetching bids for user:', userId);
        
        const bids = await Bid.find({ freelancer_id: userId })
            .populate({
                path: 'project_id',
                select: 'title description status client_name budget_min budget_max'
            })
            .sort({ created_at: -1 });
        
        console.log(`Found ${bids.length} bids for user`);
        res.json({ bids });
    } catch (err) {
        console.error('Error fetching bids:', err);
        res.status(500).json({ error: err.message });
    }
});

// Accept a bid and create contract
router.put('/bids/:bidId/accept', verifyToken, async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.bidId);
        if (!bid) return res.status(404).json({ error: 'Bid not found' });
        
        const project = await ProjectPost.findById(bid.project_id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        
        if (project.client_id.toString() !== req.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const CLIENT_FEE_PERCENTAGE = 5;
        const clientFee = (bid.bid_amount * CLIENT_FEE_PERCENTAGE) / 100;
        const platformEarns = clientFee;
        const clientTotal = bid.bid_amount + clientFee;
        
        const freelancer = await User.findById(bid.freelancer_id);
        
        await Bid.findByIdAndUpdate(req.params.bidId, { status: 'accepted' });
        await Bid.updateMany(
            { project_id: bid.project_id, _id: { $ne: req.params.bidId } },
            { status: 'rejected' }
        );
        
        await ProjectPost.findByIdAndUpdate(bid.project_id, {
            status: 'in_progress',
            selected_freelancer_id: bid.freelancer_id,
            selected_freelancer_name: freelancer.full_name,
            started_at: new Date(),
            $push: {
                status_updates: {
                    message: `Freelancer ${freelancer.full_name} was awarded the project`,
                    status: 'in_progress',
                    progress: 10,
                    updated_by: req.userId,
                    updated_by_name: project.client_name
                }
            }
        });
        
        const contract = await Contract.create({
            project_id: bid.project_id,
            client_id: project.client_id,
            freelancer_id: bid.freelancer_id,
            agreed_amount: bid.bid_amount,
            client_fee: clientFee,
            platform_earnings: platformEarns,
            total_client_charge: clientTotal,
            start_date: new Date(),
            end_date: new Date(Date.now() + (bid.estimated_days * 24 * 60 * 60 * 1000)),
            status: 'active'
        });
        
        console.log('✅ Contract created:', contract._id);
        
        await Transaction.create({
            project_id: project._id,
            client_id: project.client_id,
            freelancer_id: bid.freelancer_id,
            amount: bid.bid_amount,
            client_fee: clientFee,
            platform_earnings: platformEarns,
            freelancer_earnings: bid.bid_amount,
            status: 'pending',
            transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        
        res.json({ success: true, contract });
    } catch (err) {
        console.error('Error accepting bid:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ CONTRACT ROUTES ============

// Get my contracts - FIXED
router.get('/my-contracts', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;
        
        console.log('🔍 Fetching contracts for user:', userId);
        
        // Get contracts where user is either client OR freelancer
        const contracts = await Contract.find({
            $or: [
                { client_id: userId },
                { freelancer_id: userId }
            ]
        })
        .populate({
            path: 'project_id',
            select: 'title description status client_name budget_min budget_max'
        })
        .populate({
            path: 'client_id',
            select: 'full_name email company_name'
        })
        .populate({
            path: 'freelancer_id',
            select: 'full_name email'
        })
        .sort({ created_at: -1 });
        
        console.log(`📋 Found ${contracts.length} contracts for user`);
        
        // Format the response with role information
        const formattedContracts = contracts.map(contract => {
            const isClient = contract.client_id._id.toString() === userId.toString();
            return {
                _id: contract._id,
                project: contract.project_id,
                agreed_amount: contract.agreed_amount,
                status: contract.status,
                start_date: contract.start_date,
                end_date: contract.end_date,
                created_at: contract.created_at,
                role: isClient ? 'client' : 'freelancer',
                client: contract.client_id,
                freelancer: contract.freelancer_id,
                client_fee: contract.client_fee,
                platform_earnings: contract.platform_earnings,
                total_client_charge: contract.total_client_charge
            };
        });
        
        res.json({ contracts: formattedContracts });
    } catch (err) {
        console.error('❌ Error fetching contracts:', err);
        res.status(500).json({ error: err.message });
    }
});

// Debug route - Check all contracts for a user
router.get('/debug-contracts', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;
        
        const asClient = await Contract.find({ client_id: userId });
        const asFreelancer = await Contract.find({ freelancer_id: userId });
        
        // Get all bids for this user
        const bids = await Bid.find({ freelancer_id: userId });
        
        res.json({
            userId: userId,
            asClient: asClient,
            asFreelancer: asFreelancer,
            total: asClient.length + asFreelancer.length,
            bids: bids,
            allContracts: await Contract.find({})
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manually create a contract from accepted bid
router.post('/create-contract/:bidId', verifyToken, async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.bidId);
        if (!bid) {
            return res.status(404).json({ error: 'Bid not found' });
        }
        
        if (bid.status !== 'accepted') {
            return res.status(400).json({ error: 'Bid is not accepted' });
        }
        
        // Check if contract already exists
        const existing = await Contract.findOne({
            project_id: bid.project_id,
            freelancer_id: bid.freelancer_id
        });
        
        if (existing) {
            return res.json({ message: 'Contract already exists', contract: existing });
        }
        
        const project = await ProjectPost.findById(bid.project_id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Calculate fees
        const CLIENT_FEE_PERCENTAGE = 5;
        const clientFee = (bid.bid_amount * CLIENT_FEE_PERCENTAGE) / 100;
        const platformEarns = clientFee;
        const clientTotal = bid.bid_amount + clientFee;
        
        // Create contract
        const contract = await Contract.create({
            project_id: bid.project_id,
            client_id: project.client_id,
            freelancer_id: bid.freelancer_id,
            agreed_amount: bid.bid_amount,
            client_fee: clientFee,
            platform_earnings: platformEarns,
            total_client_charge: clientTotal,
            start_date: new Date(),
            end_date: new Date(Date.now() + (bid.estimated_days * 24 * 60 * 60 * 1000)),
            status: 'active'
        });
        
        console.log('✅ Contract manually created:', contract._id);
        
        res.json({ success: true, contract });
    } catch (err) {
        console.error('Error creating contract:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ STATUS UPDATE ROUTES ============

router.put('/projects/:id/status', verifyToken, async (req, res) => {
    try {
        const { status, progress, message, current_phase } = req.body;
        const projectId = req.params.id;
        const userId = req.userId;
        
        const project = await ProjectPost.findById(projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        
        const isClient = project.client_id.toString() === userId.toString();
        const isFreelancer = project.selected_freelancer_id && 
                            project.selected_freelancer_id.toString() === userId.toString();
        
        if (!isClient && !isFreelancer) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const user = await User.findById(userId);
        
        const updateData = {
            status: status || project.status,
            progress: progress !== undefined ? progress : project.progress,
            current_phase: current_phase || project.current_phase
        };
        
        if (status === 'completed') {
            updateData.completed_at = new Date();
        }
        
        const statusUpdate = {
            message: message || `Project status updated to ${status}`,
            status: status || project.status,
            progress: progress !== undefined ? progress : project.progress,
            updated_by: userId,
            updated_by_name: user.full_name
        };
        
        updateData.$push = { status_updates: statusUpdate };
        
        const updatedProject = await ProjectPost.findByIdAndUpdate(
            projectId,
            updateData,
            { new: true }
        );
        
        res.json({ success: true, project: updatedProject });
    } catch (err) {
        console.error('Error updating project status:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get project status history
router.get('/projects/:id/history', verifyToken, async (req, res) => {
    try {
        const project = await ProjectPost.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        
        const isClient = project.client_id.toString() === req.userId.toString();
        const isFreelancer = project.selected_freelancer_id && 
                            project.selected_freelancer_id.toString() === req.userId.toString();
        
        if (!isClient && !isFreelancer) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        res.json({ history: project.status_updates || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ STATS ROUTES ============

router.get('/stats', verifyToken, async (req, res) => {
    try {
        const openProjects = await ProjectPost.countDocuments({ status: 'open' });
        const totalProjects = await ProjectPost.countDocuments();
        const totalBids = await Bid.countDocuments();
        const completedProjects = await ProjectPost.countDocuments({ status: 'completed' });
        
        res.json({
            openProjects,
            totalProjects,
            totalBids,
            completedProjects
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;