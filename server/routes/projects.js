const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Project = require('../models/Project');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const ProjectTemplate = require('../models/ProjectTemplate');

// ─── File Upload Config ──────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        // Allow most common types
        cb(null, true);
    }
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = verified.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ─── Helper ──────────────────────────────────────────────────────────────────
const toObjectId = (id) => {
    try { return new mongoose.Types.ObjectId(id); } catch { return null; }
};

// ════════════════════════════════════════════════════════════════════════════
//  PROJECTS CRUD (unchanged existing behaviour)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/projects — list all
router.get('/', verifyToken, async (req, res) => {
    try {
        const projects = await Project.find({ user_id: req.userId })
            .populate('client_id', 'contact_name company_name email')
            .sort({ created_at: -1 });
        res.json({ projects });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/projects/templates — list templates (BEFORE /:id to avoid conflict)
router.get('/templates', verifyToken, async (req, res) => {
    try {
        const templates = await ProjectTemplate.find({
            $or: [{ user_id: req.userId }, { is_builtin: true }]
        }).sort({ created_at: -1 });
        res.json({ templates });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// POST /api/projects/templates — save new template
router.post('/templates', verifyToken, async (req, res) => {
    try {
        const { name, description, category, color, tasks, milestones } = req.body;
        if (!name) return res.status(400).json({ error: 'Template name is required' });
        const template = await ProjectTemplate.create({
            user_id: req.userId,
            name, description, category, color,
            tasks: tasks || [],
            milestones: milestones || []
        });
        res.status(201).json({ success: true, template });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/projects/templates/:tid
router.delete('/templates/:tid', verifyToken, async (req, res) => {
    try {
        await ProjectTemplate.findOneAndDelete({ _id: req.params.tid, user_id: req.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/projects/:id — single project
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, user_id: req.userId })
            .populate('client_id', 'contact_name company_name email');
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json({ project });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// POST /api/projects — create project
router.post('/', verifyToken, async (req, res) => {
    try {
        const { client_id, title, description, budget, due_date, project_type, status, color, tags } = req.body;
        if (!title) return res.status(400).json({ error: 'Project title is required' });

        let validClientId = null;
        let validClientName = '';
        if (client_id && mongoose.Types.ObjectId.isValid(client_id)) {
            const clientExists = await Client.findOne({ _id: client_id, user_id: req.userId });
            if (clientExists) {
                validClientId = client_id;
                validClientName = clientExists.contact_name || clientExists.company_name || '';
            } else {
                return res.status(400).json({ error: 'Invalid client selected' });
            }
        }

        const projectData = {
            user_id: req.userId,
            title: title.trim(),
            description: description ? description.trim() : '',
            budget: parseFloat(budget) || 0,
            due_date: due_date || null,
            project_type: project_type || 'web_development',
            status: status || 'active',
            color: color || '#3b82f6',
            tags: tags || [],
            category: 'general',
            duration: 'Not specified'
        };
        if (validClientId) {
            projectData.client_id = validClientId;
            if (validClientName) projectData.client_name = validClientName;
        }

        const project = await Project.create(projectData);
        const populated = await Project.findById(project._id).populate('client_id', 'contact_name company_name');
        res.status(201).json({ success: true, project: populated, message: 'Project created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create project', details: err.message });
    }
});

// PUT /api/projects/:id — update project
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { title, description, budget, due_date, project_type, status, progress, current_phase, color, tags } = req.body;
        const update = {
            title: title?.trim(),
            description: description?.trim(),
            budget: parseFloat(budget) || 0,
            due_date: due_date || null,
            project_type: project_type || 'web_development',
            status: status || 'active',
            progress: progress !== undefined ? progress : 0,
            current_phase: current_phase || 'planning'
        };
        if (color) update.color = color;
        if (tags) update.tags = tags;

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            update,
            { returnDocument: 'after', runValidators: true }
        ).populate('client_id', 'contact_name company_name');

        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true, project, message: 'Project updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// PATCH /api/projects/:id/status
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status, progress, current_phase } = req.body;
        const updateData = { status };
        if (progress !== undefined) updateData.progress = progress;
        if (current_phase) updateData.current_phase = current_phase;
        if (status === 'completed') updateData.completed_at = new Date();

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, user_id: req.userId },
            updateData,
            { returnDocument: 'after' }
        ).populate('client_id', 'contact_name company_name');

        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true, project });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update project status' });
    }
});

// DELETE /api/projects/bulk-delete
router.delete('/bulk-delete', verifyToken, async (req, res) => {
    try {
        const { projectIds } = req.body;
        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return res.status(400).json({ error: 'projectIds array is required' });
        }
        const projectsWithInvoices = [];
        for (const projectId of projectIds) {
            if (!mongoose.Types.ObjectId.isValid(projectId)) continue;
            const invoiceCount = await Invoice.countDocuments({ project_id: projectId, user_id: req.userId });
            if (invoiceCount > 0) {
                const project = await Project.findById(projectId);
                projectsWithInvoices.push({ id: projectId, title: project?.title || 'Unknown', invoiceCount });
            }
        }
        if (projectsWithInvoices.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete projects with associated invoices',
                hasInvoices: true, projectsWithInvoices,
                message: `${projectsWithInvoices.length} project(s) have invoices. Please delete them first.`
            });
        }
        const result = await Project.deleteMany({ _id: { $in: projectIds }, user_id: req.userId });
        res.json({ success: true, message: `${result.deletedCount} project(s) deleted successfully`, deletedCount: result.deletedCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete projects' });
    }
});

// DELETE /api/projects/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const invoiceCount = await Invoice.countDocuments({ project_id: req.params.id, user_id: req.userId });
        if (invoiceCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete project with associated invoices',
                hasInvoices: true, invoiceCount,
                message: `This project has ${invoiceCount} invoice(s). Please delete them first.`
            });
        }
        const project = await Project.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Also delete tasks, milestones for this project
        await Task.deleteMany({ project_id: req.params.id });
        await Milestone.deleteMany({ project_id: req.params.id });

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// ════════════════════════════════════════════════════════════════════════════
//  APPLY TEMPLATE TO PROJECT
// ════════════════════════════════════════════════════════════════════════════
router.post('/:id/apply-template', verifyToken, async (req, res) => {
    try {
        const { template_id } = req.body;
        const project = await Project.findOne({ _id: req.params.id, user_id: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const template = await ProjectTemplate.findOne({
            _id: template_id,
            $or: [{ user_id: req.userId }, { is_builtin: true }]
        });
        if (!template) return res.status(404).json({ error: 'Template not found' });

        // Create tasks from template
        const taskDocs = template.tasks.map((t, idx) => ({
            user_id: req.userId,
            project_id: project._id,
            title: t.title,
            description: t.description || '',
            priority: t.priority || 'medium',
            estimated_hours: t.estimated_hours || 0,
            kanban_column: t.kanban_column || 'todo',
            order: idx,
            subtasks: (t.subtasks || []).map((s, i) => ({ title: s.title, done: false, order: i })),
            checklist: (t.checklist || []).map((c, i) => ({ title: c.title, done: false, order: i })),
            tags: t.tags || []
        }));
        await Task.insertMany(taskDocs);

        // Create milestones from template
        const startDate = project.start_date || new Date();
        const milestoneDocs = template.milestones.map((m, idx) => {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + (m.due_offset_days || 7));
            return {
                user_id: req.userId,
                project_id: project._id,
                title: m.title,
                description: m.description || '',
                due_date: dueDate,
                color: m.color || '#3b82f6',
                order: idx
            };
        });
        await Milestone.insertMany(milestoneDocs);

        res.json({ success: true, message: `Template "${template.name}" applied successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ════════════════════════════════════════════════════════════════════════════
//  SAVE PROJECT AS TEMPLATE
// ════════════════════════════════════════════════════════════════════════════
router.post('/:id/save-as-template', verifyToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        const project = await Project.findOne({ _id: req.params.id, user_id: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const tasks = await Task.find({ project_id: req.params.id, user_id: req.userId });
        const milestones = await Milestone.find({ project_id: req.params.id, user_id: req.userId });

        const startDate = project.start_date || project.created_at || new Date();

        const template = await ProjectTemplate.create({
            user_id: req.userId,
            name: name || `${project.title} Template`,
            description: description || project.description || '',
            color: project.color || '#3b82f6',
            tasks: tasks.map(t => ({
                title: t.title,
                description: t.description,
                priority: t.priority,
                estimated_hours: t.estimated_hours,
                kanban_column: t.kanban_column,
                subtasks: t.subtasks.map(s => ({ title: s.title, done: false })),
                checklist: t.checklist.map(c => ({ title: c.title, done: false })),
                tags: t.tags
            })),
            milestones: milestones.map(m => {
                const offsetDays = m.due_date
                    ? Math.round((new Date(m.due_date) - new Date(startDate)) / (1000 * 60 * 60 * 24))
                    : 7;
                return {
                    title: m.title,
                    description: m.description,
                    due_offset_days: Math.max(0, offsetDays),
                    color: m.color
                };
            })
        });

        res.status(201).json({ success: true, template });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ════════════════════════════════════════════════════════════════════════════
//  TASKS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/projects/:id/tasks
router.get('/:id/tasks', verifyToken, async (req, res) => {
    try {
        const tasks = await Task.find({ project_id: req.params.id, user_id: req.userId })
            .sort({ order: 1, created_at: 1 });
        res.json({ tasks });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// POST /api/projects/:id/tasks
router.post('/:id/tasks', verifyToken, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, user_id: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const { title, description, priority, due_date, estimated_hours, kanban_column, tags, assigned_to, milestone_id, order } = req.body;
        if (!title) return res.status(400).json({ error: 'Task title is required' });

        const lastTask = await Task.findOne({ project_id: req.params.id }).sort({ order: -1 });
        const nextOrder = lastTask ? lastTask.order + 1 : 0;

        const task = await Task.create({
            user_id: req.userId,
            project_id: req.params.id,
            title: title.trim(),
            description: description || '',
            priority: priority || 'medium',
            due_date: due_date || null,
            estimated_hours: estimated_hours || 0,
            kanban_column: kanban_column || 'todo',
            status: kanban_column || 'todo',
            tags: tags || [],
            assigned_to: assigned_to || '',
            milestone_id: milestone_id && mongoose.Types.ObjectId.isValid(milestone_id) ? milestone_id : null,
            order: order !== undefined ? order : nextOrder
        });

        res.status(201).json({ success: true, task });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/projects/:id/tasks/:taskId
router.put('/:id/tasks/:taskId', verifyToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, user_id: req.userId, project_id: req.params.id });
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const {
            title, description, priority, status, kanban_column, due_date,
            estimated_hours, tags, assigned_to, milestone_id, order,
            subtasks, checklist
        } = req.body;

        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (priority !== undefined) task.priority = priority;
        if (status !== undefined) { task.status = status; task.kanban_column = status; }
        if (kanban_column !== undefined) { task.kanban_column = kanban_column; task.status = kanban_column; }
        if (due_date !== undefined) task.due_date = due_date;
        if (estimated_hours !== undefined) task.estimated_hours = estimated_hours;
        if (tags !== undefined) task.tags = tags;
        if (assigned_to !== undefined) task.assigned_to = assigned_to;
        if (order !== undefined) task.order = order;
        if (milestone_id !== undefined) task.milestone_id = milestone_id || null;
        if (subtasks !== undefined) task.subtasks = subtasks;
        if (checklist !== undefined) task.checklist = checklist;

        await task.save();
        res.json({ success: true, task });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/projects/:id/tasks/:taskId
router.delete('/:id/tasks/:taskId', verifyToken, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.taskId, user_id: req.userId, project_id: req.params.id });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        // Delete task attachments from disk
        for (const att of task.attachments || []) {
            const filePath = path.join(uploadsDir, att.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Time Tracking ───────────────────────────────────────────────────────────

// POST /api/projects/:id/tasks/:taskId/time/start
router.post('/:id/tasks/:taskId/time/start', verifyToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, user_id: req.userId, project_id: req.params.id });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (task.is_timer_running) return res.status(400).json({ error: 'Timer is already running' });

        task.is_timer_running = true;
        task.timer_started_at = new Date();
        await task.save();
        res.json({ success: true, task });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/projects/:id/tasks/:taskId/time/stop
router.post('/:id/tasks/:taskId/time/stop', verifyToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, user_id: req.userId, project_id: req.params.id });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (!task.is_timer_running) return res.status(400).json({ error: 'Timer is not running' });

        const now = new Date();
        const durationSeconds = Math.round((now - new Date(task.timer_started_at)) / 1000);

        task.time_logs.push({
            started_at: task.timer_started_at,
            ended_at: now,
            duration_seconds: durationSeconds,
            note: req.body.note || ''
        });
        task.total_logged_hours += durationSeconds / 3600;
        task.is_timer_running = false;
        task.timer_started_at = null;
        await task.save();
        res.json({ success: true, task, duration_seconds: durationSeconds });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Task File Attachments ────────────────────────────────────────────────────

// POST /api/projects/:id/tasks/:taskId/attachments
router.post('/:id/tasks/:taskId/attachments', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const task = await Task.findOne({ _id: req.params.taskId, user_id: req.userId, project_id: req.params.id });
        if (!task) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Task not found' });
        }
        const attachment = {
            filename: req.file.filename,
            original_name: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: `/uploads/${req.file.filename}`,
            uploaded_at: new Date()
        };
        task.attachments.push(attachment);
        await task.save();
        res.status(201).json({ success: true, attachment: task.attachments[task.attachments.length - 1] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/projects/:id/tasks/:taskId/attachments/:attachId
router.delete('/:id/tasks/:taskId/attachments/:attachId', verifyToken, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.taskId, user_id: req.userId, project_id: req.params.id });
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const att = task.attachments.id(req.params.attachId);
        if (!att) return res.status(404).json({ error: 'Attachment not found' });

        const filePath = path.join(uploadsDir, att.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        att.deleteOne();
        await task.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ════════════════════════════════════════════════════════════════════════════
//  MILESTONES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/projects/:id/milestones
router.get('/:id/milestones', verifyToken, async (req, res) => {
    try {
        const milestones = await Milestone.find({ project_id: req.params.id, user_id: req.userId })
            .sort({ order: 1, due_date: 1 });
        res.json({ milestones });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch milestones' });
    }
});

// POST /api/projects/:id/milestones
router.post('/:id/milestones', verifyToken, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, user_id: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const { title, description, due_date, color } = req.body;
        if (!title) return res.status(400).json({ error: 'Milestone title is required' });

        const lastMilestone = await Milestone.findOne({ project_id: req.params.id }).sort({ order: -1 });
        const milestone = await Milestone.create({
            user_id: req.userId,
            project_id: req.params.id,
            title, description: description || '',
            due_date: due_date || null,
            color: color || '#3b82f6',
            order: lastMilestone ? lastMilestone.order + 1 : 0
        });
        res.status(201).json({ success: true, milestone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/projects/:id/milestones/:mid
router.put('/:id/milestones/:mid', verifyToken, async (req, res) => {
    try {
        const { title, description, due_date, status, color } = req.body;
        const update = { title, description, due_date, status, color };
        if (status === 'completed') update.completed_at = new Date();

        const milestone = await Milestone.findOneAndUpdate(
            { _id: req.params.mid, project_id: req.params.id, user_id: req.userId },
            update,
            { returnDocument: 'after' }
        );
        if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
        res.json({ success: true, milestone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/projects/:id/milestones/:mid
router.delete('/:id/milestones/:mid', verifyToken, async (req, res) => {
    try {
        const milestone = await Milestone.findOneAndDelete({ _id: req.params.mid, project_id: req.params.id, user_id: req.userId });
        if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
        // Unlink tasks
        await Task.updateMany({ milestone_id: req.params.mid }, { $set: { milestone_id: null } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;