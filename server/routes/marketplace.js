const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ProjectPost = require('../models/ProjectPost');
const Bid = require('../models/Bid');
const Contract = require('../models/Contract');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Review = require('../models/Review');
const NotificationHelper = require('../utils/notificationHelper');

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

// ============================================
// SYNC FREELANCER ACCEPTED ASSIGNMENTS
// ============================================
const syncFreelancerAcceptedAssignments = async (freelancer) => {
    if (!freelancer) return freelancer;

    if (!freelancer.my_clients) freelancer.my_clients = [];
    if (!freelancer.my_projects) freelancer.my_projects = [];

    const acceptedBids = await Bid.find({
        freelancer_id: freelancer._id,
        status: 'accepted'
    }).sort({ created_at: -1 });

    console.log(`[SYNC] Freelancer ${freelancer.full_name} (${freelancer._id}): Found ${acceptedBids.length} accepted bids`);

    let changed = false;

    for (const bid of acceptedBids) {
        const projectPost = await ProjectPost.findById(bid.project_id);
        if (!projectPost) {
            console.warn(`[SYNC] ⚠️ ProjectPost not found for bid ${bid._id}`);
            continue;
        }

        const client = await User.findById(projectPost.client_id);
        if (!client) {
            console.warn(`[SYNC] ⚠️ Client not found for project ${projectPost._id}`);
            continue;
        }
        
        console.log(`[SYNC] Processing: Project "${projectPost.title}" | Client "${client.full_name}" | Bid Amount: $${bid.bid_amount}`);

        // ✅ ADD/UPDATE PROJECT ENTRY
        const projectEntryIndex = freelancer.my_projects.findIndex(p =>
            p.project_id && p.project_id.toString() === projectPost._id.toString()
        );

        const projectData = {
            project_id: projectPost._id,
            project_title: projectPost.title,
            project_description: projectPost.description,
            client_id: client._id,
            client_name: client.full_name,
            client_email: client.email,
            client_company: client.company_name || '',
            budget: bid.bid_amount,
            status: projectPost.status === 'completed' ? 'completed' : 'ongoing',
            assigned_at: new Date(),
            deadline: projectPost.deadline,
            completed_at: projectPost.status === 'completed' ? projectPost.completed_at : null,
            bid_amount: bid.bid_amount,
            estimated_days: bid.estimated_days,
            proposal: bid.proposal
        };

        if (projectEntryIndex >= 0) {
            freelancer.my_projects[projectEntryIndex] = {
                ...freelancer.my_projects[projectEntryIndex],
                ...projectData
            };
            console.log(`[SYNC] ✅ Updated existing project: ${projectPost.title}`);
        } else {
            freelancer.my_projects.push(projectData);
            console.log(`[SYNC] ✅ Added new project: ${projectPost.title}`);
        }

        // ✅ ADD/UPDATE CLIENT ENTRY
        const clientEntryIndex = freelancer.my_clients.findIndex(c =>
            c.client_id && c.client_id.toString() === client._id.toString() &&
            c.project_id && c.project_id.toString() === projectPost._id.toString()
        );

        const clientData = {
            client_id: client._id,
            client_name: client.full_name,
            client_email: client.email,
            client_company: client.company_name || '',
            client_phone: client.phone || '',
            project_id: projectPost._id,
            project_title: projectPost.title,
            project_description: projectPost.description,
            budget: bid.bid_amount,
            status: projectPost.status === 'completed' ? 'completed' : 'ongoing',
            assigned_at: new Date(),
            completed_at: projectPost.status === 'completed' ? projectPost.completed_at : null,
            bid_amount: bid.bid_amount,
            estimated_days: bid.estimated_days
        };

        if (clientEntryIndex >= 0) {
            freelancer.my_clients[clientEntryIndex] = {
                ...freelancer.my_clients[clientEntryIndex],
                ...clientData
            };
            console.log(`[SYNC] ✅ Updated existing client: ${client.full_name}`);
        } else {
            freelancer.my_clients.push(clientData);
            console.log(`[SYNC] ✅ Added new client: ${client.full_name}`);
        }

        changed = true;
    }

    // ✅ Update totals
    if (changed) {
        // Remove duplicates before saving
        const uniqueProjects = [];
        const seenProjectIds = new Set();
        for (const p of freelancer.my_projects) {
            if (p.project_id && !seenProjectIds.has(p.project_id.toString())) {
                seenProjectIds.add(p.project_id.toString());
                uniqueProjects.push(p);
            }
        }
        freelancer.my_projects = uniqueProjects;

        const uniqueClients = [];
        const seenClientIds = new Set();
        for (const c of freelancer.my_clients) {
            if (c.project_id && !seenClientIds.has(c.project_id.toString())) {
                seenClientIds.add(c.project_id.toString());
                uniqueClients.push(c);
            }
        }
        freelancer.my_clients = uniqueClients;

        freelancer.total_projects_assigned = freelancer.my_projects.length;
        freelancer.total_clients = freelancer.my_clients.length;

        await freelancer.save();
        console.log(`[SYNC] ✅ Saved! Projects: ${freelancer.my_projects.length}, Clients: ${freelancer.my_clients.length}`);
    } else {
        console.log(`[SYNC] ℹ️ No changes made. Projects: ${freelancer.my_projects.length}, Clients: ${freelancer.my_clients.length}`);
    }

    return freelancer;
};

const getProfileBadges = (user, completedProjects = 0, averageResponseHours = null) => {
    const badges = [];

    if (user?.is_email_verified || user?.subscription_tier !== 'free') {
        badges.push('Verified');
    }

    if (completedProjects >= 5 || user?.total_projects_assigned >= 5) {
        badges.push('Top-Rated');
    }

    if (averageResponseHours !== null && averageResponseHours <= 24) {
        badges.push('Quick-Responder');
    }

    return badges;
};

const buildFreelancerSocialProofMap = async (freelancerIds, viewerId = null) => {
    const ids = [...new Set((freelancerIds || []).filter(Boolean).map(id => id.toString()))];
    if (ids.length === 0) return {};

    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    const [freelancers, reviewStats, completedStats, acceptedBids, viewer] = await Promise.all([
        User.find({ _id: { $in: objectIds } }).select('full_name is_email_verified subscription_tier total_projects_assigned favorite_freelancers'),
        Review.aggregate([
            { $match: { reviewee_id: { $in: objectIds } } },
            { $group: { _id: '$reviewee_id', average_rating: { $avg: '$rating' }, reviews_count: { $sum: 1 } } }
        ]),
        ProjectPost.aggregate([
            { $match: { selected_freelancer_id: { $in: objectIds }, status: 'completed' } },
            { $group: { _id: '$selected_freelancer_id', completed_projects: { $sum: 1 } } }
        ]),
        Bid.find({ freelancer_id: { $in: objectIds }, status: 'accepted' }).select('freelancer_id created_at').sort({ created_at: -1 }),
        viewerId ? User.findById(viewerId).select('favorite_freelancers') : null
    ]);

    const statsById = {};
    reviewStats.forEach(stat => {
        statsById[stat._id.toString()] = {
            ...(statsById[stat._id.toString()] || {}),
            average_rating: Number(stat.average_rating.toFixed(1)),
            reviews_count: stat.reviews_count
        };
    });
    completedStats.forEach(stat => {
        statsById[stat._id.toString()] = {
            ...(statsById[stat._id.toString()] || {}),
            completed_projects: stat.completed_projects
        };
    });

    const responseById = {};
    acceptedBids.forEach(bid => {
        const id = bid.freelancer_id.toString();
        if (!responseById[id]) responseById[id] = { totalHours: 0, count: 0 };
        responseById[id].totalHours += Math.max(0, (new Date() - bid.created_at) / 36e5);
        responseById[id].count += 1;
    });

    const favoriteIds = new Set((viewer?.favorite_freelancers || []).map(id => id.toString()));
    const map = {};

    freelancers.forEach(freelancer => {
        const id = freelancer._id.toString();
        const stats = statsById[id] || {};
        const response = responseById[id];
        const averageResponseHours = response ? response.totalHours / response.count : null;

        map[id] = {
            freelancer_id: id,
            full_name: freelancer.full_name,
            average_rating: stats.average_rating || 0,
            reviews_count: stats.reviews_count || 0,
            completed_projects: stats.completed_projects || 0,
            badges: getProfileBadges(freelancer, stats.completed_projects || 0, averageResponseHours),
            is_favorited: favoriteIds.has(id)
        };
    });

    return map;
};

const attachBidSocialProof = async (bids, viewerId) => {
    const proofMap = await buildFreelancerSocialProofMap(bids.map(bid => bid.freelancer_id), viewerId);
    return bids.map(bid => ({
        ...bid.toObject(),
        freelancer_profile: proofMap[bid.freelancer_id.toString()] || null
    }));
};

// ============ CLIENT ROUTES ============

// Post a new project - WITH NOTIFICATION
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

        // ========== NOTIFICATION: New Project for all freelancers ==========
        const freelancers = await User.find({ role: 'freelancer' });

        if (freelancers.length > 0) {
            await NotificationHelper.createBulkNotifications({
                userIds: freelancers.map(f => f._id),
                type: 'new_project',
                title: '🆕 New Project Available',
                message: `${user.full_name} posted a new project: "${title}" - Budget: $${budget_min} - $${budget_max}`,
                referenceId: project._id,
                referenceType: 'project',
                actionUrl: `/marketplace/projects/${project._id}`
            });
        }

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
        const projectsWithContracts = await Promise.all(projects.map(async (project) => {
            const contract = await Contract.findOne({ project_id: project._id });
            const acceptedBid = await Bid.findOne({
                project_id: project._id,
                status: 'accepted'
            });

            return {
                ...project.toObject(),
                contract_details: contract ? {
                    agreed_amount: contract.agreed_amount,
                    client_fee: contract.client_fee,
                    total_client_charge: contract.total_client_charge,
                    status: contract.status
                } : null,
                freelancer_payment_phone: acceptedBid?.phone_number || null
            };
        }));

        res.json({ projects: projectsWithContracts });
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
            status: { $in: ['in_progress', 'review'] },
            user_id: { $exists: false }
        }).sort({ created_at: -1 });
        
        // Remove duplicates client-side just in case
        const uniqueProjects = [];
        const seenIds = new Set();
        for (const project of projects) {
            if (!seenIds.has(project._id.toString())) {
                seenIds.add(project._id.toString());
                uniqueProjects.push(project);
            }
        }
        
        res.json({ projects: uniqueProjects });
    } catch (err) {
        console.error('Error fetching active projects:', err);
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

// Get awarded projects for freelancer
router.get('/my-awarded-projects', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;

        const projects = await ProjectPost.find({
            selected_freelancer_id: userId,
            status: { $in: ['in_progress', 'review', 'completed'] }
        })
            .populate('client_id', 'full_name email company_name')
            .sort({ created_at: -1 });

        const projectsWithContracts = await Promise.all(projects.map(async (project) => {
            const contract = await Contract.findOne({
                project_id: project._id,
                freelancer_id: userId
            });

            return {
                ...project.toObject(),
                contract_details: contract ? {
                    agreed_amount: contract.agreed_amount,
                    start_date: contract.start_date,
                    end_date: contract.end_date,
                    status: contract.status
                } : null
            };
        }));

        res.json({ projects: projectsWithContracts });
    } catch (err) {
        console.error('Error fetching awarded projects:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ BIDDING ROUTES WITH NOTIFICATIONS ============

// Place a bid - WITH NOTIFICATION
router.post('/bids', verifyToken, async (req, res) => {
    try {
        const { project_id, bid_amount, estimated_days, proposal, phone_number, portfolio_link } = req.body;

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
            project_id,
            freelancer_id: req.userId,
            freelancer_name: user.full_name,
            bid_amount,
            estimated_days,
            proposal,
            phone_number,
            portfolio_link,
            status: 'pending'
        });

        await User.findByIdAndUpdate(req.userId, {
            $inc: { connects_balance: -CONNECTS_COST, total_connects_used: CONNECTS_COST }
        });

        await ProjectPost.findByIdAndUpdate(project_id, { $inc: { bids_count: 1 } });

        // ========== NOTIFICATION: Bid Received for Client ==========
        const project = await ProjectPost.findById(project_id);
        if (project) {
            await NotificationHelper.createNotification({
                userId: project.client_id,
                type: 'bid_received',
                title: '📩 New Bid Received',
                message: `${user.full_name} placed a bid of $${bid_amount} on your project "${project.title}"`,
                referenceId: project._id,
                referenceType: 'project',
                actionUrl: `/marketplace/projects/${project._id}`
            });
        }

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
        res.json({ bids: await attachBidSocialProof(bids, req.userId) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get my bids
router.get('/my-bids', verifyToken, async (req, res) => {
    try {
        const bids = await Bid.find({ freelancer_id: req.userId }).populate('project_id').sort({ created_at: -1 });
        res.json({ bids });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/favorites/:freelancerId', verifyToken, async (req, res) => {
    try {
        if (req.params.freelancerId === req.userId) {
            return res.status(400).json({ error: 'You cannot favorite your own profile' });
        }

        const freelancer = await User.findById(req.params.freelancerId);
        if (!freelancer || freelancer.role !== 'freelancer') {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        const user = await User.findById(req.userId);
        const existing = (user.favorite_freelancers || []).some(id => id.toString() === req.params.freelancerId);

        if (existing) {
            user.favorite_freelancers = user.favorite_freelancers.filter(id => id.toString() !== req.params.freelancerId);
        } else {
            user.favorite_freelancers.push(freelancer._id);
        }

        await user.save();
        res.json({ success: true, is_favorited: !existing });
    } catch (err) {
        console.error('Error toggling favorite freelancer:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/projects/:projectId/reviews', verifyToken, async (req, res) => {
    try {
        const { rating, comment = '' } = req.body;
        const numericRating = Number(rating);

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' });
        }

        const project = await ProjectPost.findById(req.params.projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.status !== 'completed') {
            return res.status(400).json({ error: 'Reviews can only be added after a project is completed' });
        }
        if (project.client_id.toString() !== req.userId) {
            return res.status(403).json({ error: 'Only the client can review the freelancer for this project' });
        }
        if (!project.selected_freelancer_id) {
            return res.status(400).json({ error: 'This project does not have an assigned freelancer' });
        }

        const [reviewer, reviewee] = await Promise.all([
            User.findById(req.userId),
            User.findById(project.selected_freelancer_id)
        ]);

        const review = await Review.findOneAndUpdate(
            {
                project_id: project._id,
                reviewer_id: reviewer._id,
                reviewee_id: reviewee._id
            },
            {
                reviewer_name: reviewer.full_name,
                reviewee_name: reviewee.full_name,
                rating: numericRating,
                comment: comment.trim().slice(0, 1000)
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({ success: true, review });
    } catch (err) {
        console.error('Error saving marketplace review:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ACCEPT A BID - UPDATES FREELANCER'S CLIENTS & PROJECTS (FIXED)
// ============================================
router.put('/bids/:bidId/accept', verifyToken, async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.bidId);
        if (!bid) return res.status(404).json({ error: 'Bid not found' });

        const projectPost = await ProjectPost.findById(bid.project_id);
        if (!projectPost) return res.status(404).json({ error: 'Project not found' });

        if (projectPost.client_id.toString() !== req.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // ✅ Check if project already has a freelancer assigned
        if (projectPost.selected_freelancer_id) {
            const selectedFreelancerId = projectPost.selected_freelancer_id.toString();
            const bidFreelancerId = bid.freelancer_id.toString();

            if (selectedFreelancerId === bidFreelancerId && bid.status === 'accepted') {
                return res.json({
                    success: true,
                    alreadyAccepted: true,
                    message: 'Bid accepted successfully. The project is already in progress.'
                });
            }

            return res.status(400).json({
                error: 'Project already assigned to another freelancer',
                freelancer: projectPost.selected_freelancer_name
            });
        }

        const CLIENT_FEE_PERCENTAGE = 5;
        const clientFee = (bid.bid_amount * CLIENT_FEE_PERCENTAGE) / 100;
        const platformEarns = clientFee;
        const clientTotal = bid.bid_amount + clientFee;

        const freelancer = await User.findById(bid.freelancer_id);
        const client = await User.findById(projectPost.client_id);

        if (!freelancer || !client) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`🔍 Accepting bid from ${freelancer.full_name} for project ${projectPost.title}`);

        // ============================================
        // ✅ FIX: Add Client to Freelancer's Client List (my_clients)
        // ============================================
        freelancer.my_clients = freelancer.my_clients || [];

        // Check if client already exists for this project
        const clientExists = freelancer.my_clients.some(c =>
            c.project_id && c.project_id.toString() === projectPost._id.toString()
        );

        if (!clientExists) {
            freelancer.my_clients.push({
                client_id: client._id,
                client_name: client.full_name,
                client_email: client.email,
                client_company: client.company_name || '',
                client_phone: client.phone || '',
                project_id: projectPost._id,
                project_title: projectPost.title,
                project_description: projectPost.description,
                budget: bid.bid_amount,
                status: 'ongoing',
                assigned_at: new Date(),
                bid_amount: bid.bid_amount,
                estimated_days: bid.estimated_days
            });
            freelancer.total_clients = (freelancer.total_clients || 0) + 1;
            console.log(`✅ Added client to freelancer's my_clients: ${client.full_name}`);
        } else {
            console.log(`⚠️ Client already exists for this project, skipping duplicate`);
        }

        // ============================================
        // ✅ FIX: Add Project to Freelancer's Project List (my_projects)
        // ============================================
        freelancer.my_projects = freelancer.my_projects || [];

        // Check if project already exists
        const projectExists = freelancer.my_projects.some(p =>
            p.project_id && p.project_id.toString() === projectPost._id.toString()
        );

        if (!projectExists) {
            freelancer.my_projects.push({
                project_id: projectPost._id,
                project_title: projectPost.title,
                project_description: projectPost.description,
                client_id: client._id,
                client_name: client.full_name,
                client_email: client.email,
                client_company: client.company_name || '',
                budget: bid.bid_amount,
                status: 'ongoing',
                assigned_at: new Date(),
                deadline: projectPost.deadline,
                bid_amount: bid.bid_amount,
                estimated_days: bid.estimated_days,
                proposal: bid.proposal
            });
            freelancer.total_projects_assigned = (freelancer.total_projects_assigned || 0) + 1;
            console.log(`✅ Added project to freelancer's my_projects: ${projectPost.title}`);
        } else {
            console.log(`⚠️ Project already exists in freelancer's list, skipping duplicate`);
        }

        await freelancer.save();
        console.log(`✅ Updated freelancer: ${freelancer.full_name} - Clients: ${freelancer.total_clients}, Projects: ${freelancer.total_projects_assigned}`);

        // ============================================
        // 3. UPDATE BID STATUS
        // ============================================
        await Bid.findByIdAndUpdate(req.params.bidId, { status: 'accepted' });
        await Bid.updateMany(
            { project_id: bid.project_id, _id: { $ne: req.params.bidId } },
            { status: 'rejected' }
        );

        // ============================================
        // 4. UPDATE PROJECT POST
        // ============================================
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
                    updated_by_name: projectPost.client_name
                }
            }
        });

        // ============================================
        // 5. CREATE CONTRACT
        // ============================================
        const contract = await Contract.create({
            project_id: bid.project_id,
            client_id: projectPost.client_id,
            freelancer_id: bid.freelancer_id,
            agreed_amount: bid.bid_amount,
            client_fee: clientFee,
            platform_earnings: platformEarns,
            total_client_charge: clientTotal,
            start_date: new Date(),
            end_date: new Date(Date.now() + (bid.estimated_days * 24 * 60 * 60 * 1000)),
            status: 'active'
        });

        // ============================================
        // 6. CREATE TRANSACTION
        // ============================================
        await Transaction.create({
            project_id: projectPost._id,
            client_id: projectPost.client_id,
            freelancer_id: bid.freelancer_id,
            amount: bid.bid_amount,
            client_fee: clientFee,
            platform_earnings: platformEarns,
            freelancer_earnings: bid.bid_amount,
            status: 'pending',
            transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });

        // ============================================
        // 7. CREATE PROJECT IN PROJECTS COLLECTION FOR FREELANCER
        // ============================================
        try {
            // Check if project already exists in Projects collection
            const existingFreelancerProject = await Project.findOne({
                user_id: bid.freelancer_id,
                title: projectPost.title,
                status: { $in: ['in_progress', 'active', 'draft'] }
            });

            if (!existingFreelancerProject) {
                // Get or create client for freelancer
                let existingClient = await Client.findOne({
                    user_id: bid.freelancer_id,
                    email: client.email
                });

                let createdClient = existingClient;
                if (!existingClient) {
                    createdClient = await Client.create({
                        user_id: bid.freelancer_id,
                        contact_name: client.full_name,
                        company_name: client.company_name || '',
                        email: client.email,
                        phone: client.phone || '',
                        address: '',
                        notes: `Imported from marketplace project ${projectPost._id}`
                    });
                    console.log(`✅ Created client for freelancer: ${createdClient.contact_name}`);
                }

                if (createdClient) {
                    const newProject = await Project.create({
                        user_id: bid.freelancer_id,
                        client_id: createdClient._id,
                        client_name: createdClient.contact_name,
                        client_email: client.email,
                        client_company: client.company_name || '',
                        title: projectPost.title,
                        description: projectPost.description,
                        budget: bid.bid_amount,
                        due_date: projectPost.deadline || null,
                        project_type: 'marketplace',
                        status: 'in_progress',
                        selected_freelancer_id: bid.freelancer_id,
                        selected_freelancer_name: freelancer.full_name,
                        freelancer_email: freelancer.email,
                        freelancer_company: freelancer.company_name || ''
                    });
                    console.log(`✅ Project created for freelancer: ${newProject.title} (${newProject._id})`);
                }
            } else {
                console.log(`ℹ️ Project already exists for freelancer: ${projectPost.title}`);
            }

            // Check if project already exists for client
            const existingClientProject = await Project.findOne({
                user_id: projectPost.client_id,
                title: projectPost.title,
                selected_freelancer_id: bid.freelancer_id
            });

            if (!existingClientProject) {
                const clientProject = await Project.create({
                    user_id: projectPost.client_id,
                    client_name: projectPost.client_name || client.full_name,
                    client_email: client.email,
                    client_company: client.company_name || '',
                    title: projectPost.title,
                    description: projectPost.description,
                    budget: bid.bid_amount,
                    due_date: projectPost.deadline || null,
                    project_type: 'marketplace',
                    status: 'in_progress',
                    selected_freelancer_id: bid.freelancer_id,
                    selected_freelancer_name: freelancer.full_name,
                    freelancer_email: freelancer.email,
                    freelancer_company: freelancer.company_name || ''
                });
                console.log(`✅ Project created for client: ${clientProject.title} (${clientProject._id})`);
            } else {
                console.log(`ℹ️ Project already exists for client: ${projectPost.title}`);
            }

        } catch (err) {
            console.error('Error syncing client/project records after bid accept:', err);
        }

        // ============================================
        // 8. CREATE NOTIFICATIONS
        // ============================================
        await NotificationHelper.createNotification({
            userId: bid.freelancer_id,
            type: 'bid_accepted',
            title: '🎉 Bid Accepted!',
            message: `Your bid of $${bid.bid_amount} for "${projectPost.title}" has been accepted! You now have a new client: ${client.full_name}`,
            referenceId: projectPost._id,
            referenceType: 'project',
            actionUrl: `/clients`  // Redirect to clients page
        });

        await NotificationHelper.createBulkNotifications({
            userIds: [projectPost.client_id, bid.freelancer_id],
            type: 'contract_created',
            title: '📝 Contract Created',
            message: `Contract created for project "${projectPost.title}" with amount $${bid.bid_amount}`,
            referenceId: contract._id,
            referenceType: 'contract',
            actionUrl: `/contracts/${contract._id}`
        });

        console.log(`✅ Successfully accepted bid! Freelancer: ${freelancer.full_name}, Project: ${projectPost.title}`);

        res.json({
            success: true,
            contract,
            message: 'Bid accepted successfully. Freelancer has been updated with client and project details.',
            clientAdded: !clientExists,
            projectAdded: !projectExists
        });

    } catch (err) {
        console.error('Error accepting bid:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET FREELANCER'S CLIENTS
// ============================================
router.get('/freelancer/my-clients', verifyToken, async (req, res) => {
    try {
        let freelancer = await User.findById(req.userId);

        if (!freelancer) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        // ✅ Sync freelancer's accepted assignments
        await syncFreelancerAcceptedAssignments(freelancer);

        // ✅ Re-fetch with populated references to get updated data
        freelancer = await User.findById(req.userId)
            .populate('my_clients.client_id', 'full_name email company_name');

        // ✅ Remove duplicates before sending
        const uniqueClients = [];
        const seenIds = new Set();
        for (const client of freelancer.my_clients || []) {
            if (client.project_id && !seenIds.has(client.project_id.toString())) {
                seenIds.add(client.project_id.toString());
                uniqueClients.push(client);
            }
        }

        res.json({
            clients: uniqueClients,
            totalClients: freelancer.total_clients || 0
        });
    } catch (err) {
        console.error('Error fetching freelancer clients:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET FREELANCER'S PROJECTS
// ============================================
router.get('/freelancer/my-projects', verifyToken, async (req, res) => {
    try {
        let freelancer = await User.findById(req.userId);

        if (!freelancer) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        // ✅ Sync freelancer's accepted assignments
        await syncFreelancerAcceptedAssignments(freelancer);

        // ✅ Re-fetch with populated references to get updated data
        freelancer = await User.findById(req.userId)
            .populate('my_projects.project_id', 'title description')
            .populate('my_projects.client_id', 'full_name email company_name');

        // ✅ Remove duplicates before sending
        const uniqueProjects = [];
        const seenIds = new Set();
        for (const project of freelancer.my_projects || []) {
            if (project.project_id && !seenIds.has(project.project_id.toString())) {
                seenIds.add(project.project_id.toString());
                uniqueProjects.push(project);
            }
        }

        res.json({
            projects: uniqueProjects,
            totalProjects: freelancer.total_projects_assigned || 0
        });
    } catch (err) {
        console.error('Error fetching freelancer projects:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET FREELANCER DASHBOARD STATS
// ============================================
router.get('/freelancer/stats', verifyToken, async (req, res) => {
    try {
        const freelancer = await User.findById(req.userId);
        if (!freelancer) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        // ✅ Sync first to ensure accurate stats
        await syncFreelancerAcceptedAssignments(freelancer);

        const totalEarnings = freelancer.my_projects
            ?.filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + (p.budget || 0), 0) || 0;

        // ✅ Use unique counts
        const uniqueProjectIds = new Set();
        const uniqueClientIds = new Set();

        for (const project of freelancer.my_projects || []) {
            if (project.project_id) {
                uniqueProjectIds.add(project.project_id.toString());
            }
        }
        for (const client of freelancer.my_clients || []) {
            if (client.project_id) {
                uniqueClientIds.add(client.project_id.toString());
            }
        }

        res.json({
            totalClients: uniqueClientIds.size,
            totalProjects: uniqueProjectIds.size,
            completedProjects: freelancer.my_projects?.filter(p => p.status === 'completed').length || 0,
            ongoingProjects: freelancer.my_projects?.filter(p => p.status === 'ongoing').length || 0,
            totalEarnings: totalEarnings
        });
    } catch (err) {
        console.error('Error fetching freelancer stats:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MARK PROJECT AS COMPLETED (By Freelancer)
// ============================================
router.patch('/projects/:projectId/complete', verifyToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.userId;

        const projectPost = await ProjectPost.findById(projectId);
        if (!projectPost) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (projectPost.selected_freelancer_id.toString() !== userId) {
            return res.status(403).json({ error: 'Only the assigned freelancer can mark as complete' });
        }

        projectPost.status = 'completed';
        projectPost.completed_at = new Date();
        await projectPost.save();

        const freelancer = await User.findById(userId);
        if (freelancer) {
            // Update client list
            const clientIndex = freelancer.my_clients.findIndex(
                c => c.project_id && c.project_id.toString() === projectId
            );
            if (clientIndex !== -1) {
                freelancer.my_clients[clientIndex].status = 'completed';
                freelancer.my_clients[clientIndex].completed_at = new Date();
            }

            // Update project list
            const projectIndex = freelancer.my_projects.findIndex(
                p => p.project_id && p.project_id.toString() === projectId
            );
            if (projectIndex !== -1) {
                freelancer.my_projects[projectIndex].status = 'completed';
                freelancer.my_projects[projectIndex].completed_at = new Date();
                freelancer.total_earnings = (freelancer.total_earnings || 0) + freelancer.my_projects[projectIndex].budget;
            }

            await freelancer.save();
        }

        // Also update the project in Projects collection
        await Project.findOneAndUpdate(
            {
                title: projectPost.title,
                selected_freelancer_id: userId
            },
            {
                status: 'completed',
                completed_at: new Date(),
                progress: 100
            }
        );

        // ✅ Re-sync to ensure consistency
        await syncFreelancerAcceptedAssignments(freelancer);

        res.json({
            success: true,
            message: 'Project marked as completed',
            project: projectPost
        });

    } catch (err) {
        console.error('Error completing project:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ STATUS UPDATE WITH NOTIFICATION ============

// Update project status - WITH NOTIFICATION
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
            updateData.payment_status = 'unpaid';
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
            { returnDocument: 'after' }
        );

        // ✅ Sync changes to Projects collection
        await Project.updateMany(
            {
                title: project.title,
                selected_freelancer_id: project.selected_freelancer_id,
                project_type: 'marketplace'
            },
            {
                $set: {
                    status: updatedProject.status,
                    progress: updatedProject.progress,
                    current_phase: updatedProject.current_phase,
                    completed_at: updatedProject.completed_at,
                    payment_status: updatedProject.payment_status
                }
            }
        );

        const statusMessages = {
            'in_progress': 'started working on',
            'review': 'sent for review',
            'completed': 'marked as completed'
        };

        const statusAction = statusMessages[status] || `updated status to ${status}`;

        if (isClient && project.selected_freelancer_id) {
            await NotificationHelper.createNotification({
                userId: project.selected_freelancer_id,
                type: 'project_status_updated',
                title: '📋 Project Status Updated',
                message: `The client has ${statusAction} "${project.title}"`,
                referenceId: project._id,
                referenceType: 'project',
                actionUrl: `/marketplace/projects/${project._id}`
            });
        } else if (isFreelancer) {
            await NotificationHelper.createNotification({
                userId: project.client_id,
                type: 'project_status_updated',
                title: '📋 Project Status Updated',
                message: `${user.full_name} has ${statusAction} "${project.title}"`,
                referenceId: project._id,
                referenceType: 'project',
                actionUrl: `/marketplace/projects/${project._id}`
            });
        }

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

// ============ CONTRACT ROUTES ============

// Get my contracts
router.get('/my-contracts', verifyToken, async (req, res) => {
    try {
        const contracts = await Contract.find({
            $or: [{ client_id: req.userId }, { freelancer_id: req.userId }]
        }).populate('project_id').sort({ created_at: -1 });
        res.json({ contracts });
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

// Create a marketplace project
router.post('/projects', verifyToken, async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            budget_min,
            budget_max,
            duration,
            skills_required,
            deadline
        } = req.body;

        console.log('📝 Creating marketplace project:', { title, budget_min, budget_max });

        if (!title) {
            return res.status(400).json({ error: 'Project title is required' });
        }
        if (!category) {
            return res.status(400).json({ error: 'Category is required' });
        }
        if (!budget_min || !budget_max) {
            return res.status(400).json({ error: 'Budget range is required' });
        }
        if (!duration) {
            return res.status(400).json({ error: 'Duration is required' });
        }

        const user = await User.findById(req.userId);
        const clientName = user?.full_name || 'Unknown Client';

        const projectData = {
            user_id: req.userId,
            client_id: req.userId,
            client_name: clientName,
            title: title.trim(),
            description: description ? description.trim() : '',
            category: category,
            budget_min: parseFloat(budget_min) || 0,
            budget_max: parseFloat(budget_max) || 0,
            duration: duration,
            skills_required: skills_required || [],
            deadline: deadline || null,
            status: 'open',
            project_type: 'other'
        };

        const project = await Project.create(projectData);

        res.status(201).json({
            success: true,
            project: project,
            message: 'Project posted successfully'
        });

    } catch (err) {
        console.error('❌ Error creating marketplace project:', err);
        res.status(500).json({
            error: 'Failed to post project',
            details: err.message
        });
    }
});

// ============ CLEANUP ROUTE - DEDUPLICATE EXISTING PROJECTS ============
router.post('/cleanup/deduplicate-projects', verifyToken, async (req, res) => {
    try {
        console.log('🧹 Starting project deduplication cleanup...');

        const users = await User.find({
            $or: [
                { my_projects: { $exists: true, $ne: [] } },
                { my_clients: { $exists: true, $ne: [] } }
            ]
        });

        let totalDuplicatesRemoved = 0;
        const results = [];

        for (const user of users) {
            let duplicatesForUser = 0;

            // Deduplicate my_projects
            if (user.my_projects && user.my_projects.length > 0) {
                const uniqueProjectIds = new Set();
                const uniqueProjects = [];

                for (const project of user.my_projects) {
                    const projectId = project.project_id?.toString();
                    if (projectId && !uniqueProjectIds.has(projectId)) {
                        uniqueProjectIds.add(projectId);
                        uniqueProjects.push(project);
                    } else if (projectId) {
                        duplicatesForUser++;
                    }
                }

                if (uniqueProjects.length !== user.my_projects.length) {
                    user.my_projects = uniqueProjects;
                    user.total_projects_assigned = uniqueProjects.length;
                    duplicatesForUser = user.my_projects.length - uniqueProjects.length;
                }
            }

            // Deduplicate my_clients
            if (user.my_clients && user.my_clients.length > 0) {
                const uniqueClientIds = new Set();
                const uniqueClients = [];

                for (const client of user.my_clients) {
                    const projectId = client.project_id?.toString();
                    if (projectId && !uniqueClientIds.has(projectId)) {
                        uniqueClientIds.add(projectId);
                        uniqueClients.push(client);
                    } else if (projectId) {
                        // This is a duplicate
                    }
                }

                if (uniqueClients.length !== user.my_clients.length) {
                    user.my_clients = uniqueClients;
                    user.total_clients = uniqueClients.length;
                }
            }

            if (duplicatesForUser > 0) {
                await user.save();
                totalDuplicatesRemoved += duplicatesForUser;
                results.push({
                    freelancer: user.full_name,
                    duplicates_removed: duplicatesForUser
                });
                console.log(`✅ ${user.full_name}: Removed ${duplicatesForUser} duplicate(s)`);
            }
        }

        console.log(`🎉 Deduplication complete! Total duplicates removed: ${totalDuplicatesRemoved}`);

        res.json({
            success: true,
            message: `Cleanup complete. Removed ${totalDuplicatesRemoved} duplicate project(s).`,
            details: results,
            total_duplicates_removed: totalDuplicatesRemoved
        });
    } catch (err) {
        console.error('Error during deduplication cleanup:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============ SYNC ACCEPTED ASSIGNMENTS FOR FREELANCER ============
router.post('/sync-accepted-assignments', verifyToken, async (req, res) => {
    try {
        console.log('🔄 Syncing accepted assignments for freelancer...');

        const freelancer = await User.findById(req.userId);
        if (!freelancer) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        if (!freelancer.my_clients) freelancer.my_clients = [];
        if (!freelancer.my_projects) freelancer.my_projects = [];

        const acceptedBids = await Bid.find({
            freelancer_id: req.userId,
            status: 'accepted'
        }).sort({ created_at: -1 });

        console.log(`📋 Found ${acceptedBids.length} accepted bid(s) for freelancer`);

        let projectsAdded = 0;
        let clientsAdded = 0;
        let projectsUpdated = 0;
        let clientsUpdated = 0;

        for (const bid of acceptedBids) {
            const projectPost = await ProjectPost.findById(bid.project_id);
            if (!projectPost) {
                console.warn(`⚠️ ProjectPost not found for bid: ${bid._id}`);
                continue;
            }

            const client = await User.findById(projectPost.client_id);
            if (!client) {
                console.warn(`⚠️ Client not found for project: ${projectPost._id}`);
                continue;
            }

            // Sync project entry
            const projectEntryIndex = freelancer.my_projects.findIndex(p =>
                p.project_id && p.project_id.toString() === projectPost._id.toString()
            );

            const projectData = {
                project_id: projectPost._id,
                project_title: projectPost.title,
                project_description: projectPost.description,
                client_id: client._id,
                client_name: client.full_name,
                client_email: client.email,
                budget: bid.bid_amount,
                status: projectPost.status === 'completed' ? 'completed' : 'ongoing',
                assigned_at: freelancer.my_projects[projectEntryIndex]?.assigned_at || new Date(),
                deadline: projectPost.deadline,
                completed_at: projectPost.status === 'completed' ? projectPost.completed_at : null
            };

            if (projectEntryIndex >= 0) {
                freelancer.my_projects[projectEntryIndex] = {
                    ...freelancer.my_projects[projectEntryIndex],
                    ...projectData
                };
                projectsUpdated++;
                console.log(`✅ Updated project entry: ${projectPost.title}`);
            } else {
                freelancer.my_projects.push(projectData);
                projectsAdded++;
                console.log(`✅ Added project entry: ${projectPost.title}`);
            }

            // Sync client entry
            const clientEntryIndex = freelancer.my_clients.findIndex(c =>
                c.client_id && c.client_id.toString() === client._id.toString() &&
                c.project_id && c.project_id.toString() === projectPost._id.toString()
            );

            const clientData = {
                client_id: client._id,
                client_name: client.full_name,
                client_email: client.email,
                client_company: client.company_name || '',
                project_id: projectPost._id,
                project_title: projectPost.title,
                project_description: projectPost.description,
                budget: bid.bid_amount,
                status: projectPost.status === 'completed' ? 'completed' : 'ongoing',
                assigned_at: freelancer.my_clients[clientEntryIndex]?.assigned_at || new Date(),
                completed_at: projectPost.status === 'completed' ? projectPost.completed_at : null
            };

            if (clientEntryIndex >= 0) {
                freelancer.my_clients[clientEntryIndex] = {
                    ...freelancer.my_clients[clientEntryIndex],
                    ...clientData
                };
                clientsUpdated++;
                console.log(`✅ Updated client entry: ${client.full_name}`);
            } else {
                freelancer.my_clients.push(clientData);
                clientsAdded++;
                console.log(`✅ Added client entry: ${client.full_name}`);
            }
        }

        freelancer.total_projects_assigned = freelancer.my_projects.length;
        freelancer.total_clients = freelancer.my_clients.length;

        await freelancer.save();
        console.log(`🎉 Sync complete!`);

        res.json({
            success: true,
            message: 'Freelancer assignments synced successfully',
            summary: {
                projects_added: projectsAdded,
                projects_updated: projectsUpdated,
                clients_added: clientsAdded,
                clients_updated: clientsUpdated,
                total_projects: freelancer.my_projects.length,
                total_clients: freelancer.my_clients.length,
                accepted_bids_processed: acceptedBids.length
            }
        });
    } catch (err) {
        console.error('Error syncing accepted assignments:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
