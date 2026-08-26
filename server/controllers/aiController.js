// controllers/aiController.js — AI service proxy with department isolation
'use strict';

const axios    = require('axios');
const Document = require('../models/Document');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/summarize/:docId
// ─────────────────────────────────────────────────────────────────────────────
exports.summarizeDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    // RBAC: employees only see their department docs
    if (req.user.role !== 'Admin' && doc.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    if (!doc.extractedText)
      return res.status(400).json({ success: false, message: 'No extracted text available for summarization.' });

    const { data } = await axios.post(`${AI_SERVICE_URL}/summarize`, { text: doc.extractedText });
    if (data?.success) {
      doc.summary = data.summary;
      await doc.save();
    }
    return res.status(200).json({ success: true, summary: doc.summary });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/classify/:docId
// ─────────────────────────────────────────────────────────────────────────────
exports.classifyDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (req.user.role !== 'Admin' && doc.department !== req.user.department)
      return res.status(403).json({ success: false, message: 'Forbidden.' });

    if (!doc.extractedText)
      return res.status(400).json({ success: false, message: 'No extracted text available.' });

    const { data } = await axios.post(`${AI_SERVICE_URL}/classify`, { text: doc.extractedText });
    if (data?.success) {
      doc.department     = data.department;
      doc.confidenceScore = data.confidenceScore;
      await doc.save();
    }
    return res.status(200).json({ success: true, department: doc.department, confidenceScore: doc.confidenceScore });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/extract/:docId
// ─────────────────────────────────────────────────────────────────────────────
exports.extractEntities = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (req.user.role !== 'Admin' && doc.department !== req.user.department)
      return res.status(403).json({ success: false, message: 'Forbidden.' });

    const { data } = await axios.post(`${AI_SERVICE_URL}/extract`, { filePath: doc.filePath });
    if (data?.success) {
      doc.extractedText = data.text;
      await doc.save();
    }
    return res.status(200).json({ success: true, text: doc.extractedText });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/query  — RAG Chatbot
// Builds context from the user's authorized documents ONLY then queries AI.
// Admin sees all documents; Employees see their department; Viewers see their
// department summaries only (no raw extracted text).
// ─────────────────────────────────────────────────────────────────────────────
exports.queryDocuments = async (req, res, next) => {
  try {
    const { prompt, documentIds } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim())
      return res.status(400).json({ success: false, message: 'A prompt/question is required.' });

    // ── Build authorized document query ──────────────────────────────────────
    const docQuery = {};
    if (req.user.role !== 'Admin') {
      docQuery.department = req.user.department;
    }

    // If specific documentIds provided, further restrict to those (still filtered by dept above)
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      docQuery._id = { $in: documentIds };
    }

    // Fetch the documents — Viewers get summaries only, others get full text
    const selectFields = req.user.role === 'Viewer'
      ? 'title department summary'
      : 'title department summary extractedText';

    const docs = await Document.find(docQuery).select(selectFields).limit(10);

    if (docs.length === 0) {
      return res.status(200).json({
        success: true,
        answer: 'No documents found in your authorized scope. Please upload relevant documents first.',
        sources: [],
      });
    }

    // ── Build context for AI service ─────────────────────────────────────────
    const context = docs.map(d => {
      const text = d.extractedText || d.summary || '';
      return `[Document: ${d.title} | Department: ${d.department}]\n${text.slice(0, 2000)}`;
    }).join('\n\n---\n\n');

    // ── Call FastAPI RAG endpoint ─────────────────────────────────────────────
    let answer = '';
    try {
      const { data } = await axios.post(`${AI_SERVICE_URL}/rag`, {
        question: prompt.trim(),
        context,
      }, { timeout: 30000 });
      answer = data?.answer || data?.response || 'The AI service returned an empty response.';
    } catch (aiErr) {
      // Graceful degradation — return document summaries if AI unavailable
      console.error('[AI Query] FastAPI /rag unreachable:', aiErr.message);
      const summaries = docs.map(d => `**${d.title}**: ${d.summary || 'No summary available.'}`).join('\n\n');
      answer = `AI service is temporarily unavailable. Here are the relevant document summaries:\n\n${summaries}`;
    }

    return res.status(200).json({
      success: true,
      answer,
      sources: docs.map(d => ({ id: d._id, title: d.title, department: d.department })),
    });
  } catch (err) { next(err); }
};
