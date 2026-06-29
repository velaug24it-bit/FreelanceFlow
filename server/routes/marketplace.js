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
        res.json({ bids });
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

        // ✅ FIX: Check if project already has a freelancer assigned
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
        // ✅ FIX: Comprehensive deduplication check
        // ============================================
        
        // Initialize arrays if they don't exist
        if (!freelancer.my_clients) freelancer.my_clients = [];
        if (!freelancer.my_projects) freelancer.my_projects = [];

        // Check if project already exists in my_projects
        const projectExists = freelancer.my_projects.some(p => 
            p.project_id && p.project_id.toString() === projectPost._id.toString()
        );

        let projectAdded = false;
        if (projectExists) {
            console.log(`⚠️ Project ${projectPost.title} already exists in freelancer's list. Skipping duplicate.`);
        } else {
            // ✅ Add project only once
            freelancer.my_projects.push({
                project_id: projectPost._id,
                project_title: projectPost.title,
                project_description: projectPost.description,
                client_id: client._id,
                client_name: client.full_name,
                client_email: client.email,
                budget: bid.bid_amount,
                status: 'ongoing',
                assigned_at: new Date(),
                deadline: projectPost.deadline
            });
            freelancer.total_projects_assigned = (freelancer.total_projects_assigned || 0) + 1;
            projectAdded = true;
            console.log(`✅ Added project to freelancer's my_projects: ${projectPost.title}`);
        }

        // Check if client already exists in my_clients
        const clientExists = freelancer.my_clients.some(c => 
            c.client_id && c.client_id.toString() === client._id.toString()
        );

        if (!clientExists) {
            freelancer.my_clients.push({
                client_id: client._id,
                client_name: client.full_name,
                client_email: client.email,
                client_company: client.company_name || '',
                project_id: projectPost._id,
                project_title: projectPost.title,
                project_description: projectPost.description,
                budget: bid.bid_amount,
                status: 'ongoing',
                assigned_at: new Date()
            });
            freelancer.total_clients = (freelancer.total_clients || 0) + 1;
            console.log(`✅ Added client to freelancer's my_clients: ${client.full_name}`);
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
        // 7. LEGACY PROJECT SYNC GUARD
        // ============================================
        try {
            // Project currently shares the projectposts collection, so the awarded
            // marketplace post itself is the only record we should keep.
            const existingFreelancerProject = await Project.findOne({
                _id: projectPost._id
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
                        phone: '',
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

            // Same guard for the client-side legacy sync branch.
            const existingClientProject = await Project.findOne({
                _id: projectPost._id
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
            actionUrl: `/projects`
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
            message: 'Bid accepted successfully. Freelancer has been updated with client and project details.'
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
        const freelancer = await User.findById(req.userId)
            .populate('my_clients.client_id', 'full_name email company_name');
        
        if (!freelancer) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        res.json({
            clients: freelancer.my_clients || [],
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
        const freelancer = await User.findById(req.userId)
            .populate('my_projects.project_id', 'title description')
            .populate('my_projects.client_id', 'full_name email company_name');
        
        if (!freelancer) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }

        res.json({
            projects: freelancer.my_projects || [],
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

        const totalEarnings = freelancer.my_projects
            ?.filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + (p.budget || 0), 0) || 0;

        res.json({
            totalClients: freelancer.total_clients || 0,
            totalProjects: freelancer.total_projects_assigned || 0,
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
                c => c.project_id.toString() === projectId
            );
            if (clientIndex !== -1) {
                freelancer.my_clients[clientIndex].status = 'completed';
                freelancer.my_clients[clientIndex].completed_at = new Date();
            }

            // Update project list
            const projectIndex = freelancer.my_projects.findIndex(
                p => p.project_id.toString() === projectId
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

module.exports = router;
