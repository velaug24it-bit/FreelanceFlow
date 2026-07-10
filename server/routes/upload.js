const express = require('express');
const router = express.Router();
const multer = require('multer');

// Use memory storage — no disk files, no ephemeral filesystem issues.
// The file buffer is converted to a Base64 data URI and returned directly.
// This means the image is stored in MongoDB and works on any host (localhost, Render, mobile, etc.)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (base64 inflates size ~33%)
});

router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const mimeType = req.file.mimetype;
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;

        res.json({ success: true, url: dataUri });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;