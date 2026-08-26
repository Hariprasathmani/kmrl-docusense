// routes/documentRoutes.js — Document endpoints
'use strict';

const express = require('express');
const router  = express.Router();
const upload  = require('../config/multer');
const { uploadDocument, getDocuments, getDocumentById, shareDocument, unshareDocument, deleteDocument } = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// POST /upload — only authenticated, non-Viewer roles can upload
router.post(
  '/upload',
  authorize('Admin', 'Department Officer'),
  upload.single('file'),
  uploadDocument
);

// GET / — list documents (all roles; Viewer gets summary-only response)
router.get('/', getDocuments);

// Specific routes (more specific patterns first)
router.post('/:id/share', authorize('Admin', 'Department Officer'), shareDocument);
router.delete('/:id/share/:department', authorize('Admin', 'Department Officer'), unshareDocument);

// DELETE /:id — delete document (Admin only)
router.delete('/:id', authorize('Admin'), deleteDocument);

// GET /:id — single document (all roles; Viewer gets summary-only response)
router.get('/:id', getDocumentById);

module.exports = router;
