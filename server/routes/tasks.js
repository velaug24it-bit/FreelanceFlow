const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Task = require('../models/Task');
const Project = require('../models/Project');

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Multer setup for attachments
const uploadDir = path.join(__dirname, '..', 'uploads', 'task_attachments');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// GET /api/tasks — list all tasks for user (and kanban grouping)
router.get('/', verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ user_id: req.userId }).sort({ created_at: -1 });
    const groupedTasks = {
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      review: tasks.filter(t => t.status === 'review'),
      done: tasks.filter(t => t.status === 'done')
    };
    res.json({ tasks, kanban: groupedTasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get tasks for a project
router.get('/project/:projectId', verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ project_id: req.params.projectId }).sort({ order: 1 }).lean();
    res.json({ tasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create a task (optionally link to project)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, project_id, estimate_hours, assignees } = req.body;
    if (!title) return res.status(400).json({ error: 'Task title is required' });
    const task = await Task.create({
      user_id: req.userId,
      title,
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      due_date: due_date || null,
      project_id: project_id || null,
      estimated_hours: estimate_hours || 0,
      assignees: assignees || []
    });
    if (project_id) {
      try { await Project.findByIdAndUpdate(project_id, { $push: { tasks: task._id } }); } catch (e) { /* swallow */ }
    }
    res.status(201).json({ success: true, task });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update task
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, status, priority, due_date } = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { title, description, status, priority, due_date, updated_at: Date.now() },
      { returnDocument: 'after' }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update task status (for drag and drop)
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { status, updated_at: Date.now() },
      { returnDocument: 'after' }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete task
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user_id: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add subtask
router.post('/:id/subtasks', verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    task.subtasks.push({ title, done: false });
    await task.save();
    res.json({ subtasks: task.subtasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Toggle subtask done
router.put('/:id/subtasks/:subId/toggle', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const sub = task.subtasks.id(req.params.subId);
    if (!sub) return res.status(404).json({ error: 'Subtask not found' });
    sub.done = !sub.done;
    await task.save();
    res.json({ subtask: sub });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload attachment to task
router.post('/:id/attachments', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const file = req.file;
    task.attachments.push({ filename: file.filename, original_name: file.originalname, mimetype: file.mimetype, size: file.size, path: file.path });
    await task.save();
    res.json({ attachment: task.attachments[task.attachments.length - 1] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start/stop timer
router.post('/:id/timer/start', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.is_timer_running) return res.status(400).json({ error: 'Timer already running' });
    task.is_timer_running = true;
    task.timer_started_at = new Date();
    await task.save();
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/timer/stop', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!task.is_timer_running || !task.timer_started_at) return res.status(400).json({ error: 'Timer not running' });
    const started = task.timer_started_at;
    const ended = new Date();
    const duration = Math.round((ended - started) / 1000);
    task.time_logs.push({ started_at: started, ended_at: ended, duration_seconds: duration, note: req.body.note || '' });
    task.total_logged_hours = (task.total_logged_hours || 0) + (duration / 3600);
    task.is_timer_running = false;
    task.timer_started_at = null;
    await task.save();
    res.json({ task });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
