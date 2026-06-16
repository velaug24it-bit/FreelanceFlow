const express = require('express');
const { body, validationResult } = require('express-validator');
const Contract = require('../models/Contract');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateJWT);

router.get('/', async (req, res) => {
    try {
        const documents = await Contract.find({ user_id: req.userId })
            .populate('project_id', 'title')
            .populate('client_id', 'contact_name')
            .sort({ created_at: -1 })
            .lean();

        const contracts = documents.map((contract) => ({
            ...contract,
            project_title: contract.project_id?.title || null,
            client_name: contract.client_id?.contact_name || null,
            project_id: contract.project_id?._id || contract.project_id,
            client_id: contract.client_id?._id || contract.client_id
        }));
        res.json({ contracts, total: contracts.length });
    } catch (error) {
        console.error('Get contracts error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', [
    body('title').trim().notEmpty().withMessage('Contract title is required'),
    body('project_id').notEmpty().withMessage('Project is required'),
    body('client_id').notEmpty().withMessage('Client is required'),
    body('total_amount').isNumeric().withMessage('Total amount is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const contract = await Contract.create({
            user_id: req.userId,
            project_id: req.body.project_id,
            client_id: req.body.client_id,
            contract_number: `CTR-${Date.now().toString(36).toUpperCase()}`,
            title: req.body.title,
            description: req.body.description,
            total_amount: req.body.total_amount,
            payment_terms: req.body.payment_terms,
            start_date: req.body.start_date || undefined,
            end_date: req.body.end_date || undefined,
            contract_content: req.body.contract_content
        });

        res.status(201).json({ message: 'Contract created successfully', contract });
    } catch (error) {
        console.error('Create contract error:', error);
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;
