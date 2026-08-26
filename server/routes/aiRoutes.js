// routes/aiRoutes.js — AI service proxy endpoints
'use strict';

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

// POST /api/ai/summarize/:docId    — trigger summarization
router.post('/summarize/:docId', aiController.summarizeDocument);

// POST /api/ai/classify/:docId     — trigger classification
router.post('/classify/:docId', aiController.classifyDocument);

// POST /api/ai/extract/:docId      — trigger entity extraction
router.post('/extract/:docId', aiController.extractEntities);

// POST /api/ai/query               — RAG-based Q&A
router.post('/query', aiController.queryDocuments);

module.exports = router;
