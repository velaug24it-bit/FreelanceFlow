const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ProjectTemplate = require('../models/ProjectTemplate');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).id; next(); } catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
};

router.get('/', verifyToken, async (req, res) => {
  try { const templates = await ProjectTemplate.find({}); res.json({ templates }); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', verifyToken, async (req, res) => {
  try { const t = await ProjectTemplate.create({ ...req.body, created_by: req.userId }); res.status(201).json({ template: t }); } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
