const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).id; next(); } catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
};

router.post('/', verifyToken, async (req, res) => {
  try {
    const { project_id, title, description, due_date, order } = req.body;
    const m = await Milestone.create({ project_id, title, description, due_date, order });
    await Project.findByIdAndUpdate(project_id, { $push: { milestones: m._id } });
    res.status(201).json({ milestone: m });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', verifyToken, async (req, res) => {
  try { const m = await Milestone.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' }); res.json({ milestone: m }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try { const m = await Milestone.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
