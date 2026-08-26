// controllers/documentController.js Ã¢â‚¬â€ KMRL DocuSense document handling
'use strict';

const mongoose       = require('mongoose');
const Document       = require('../models/Document');
const RoutingLog     = require('../models/RoutingLog');
const path           = require('path');
const axios          = require('axios');
const fs             = require('fs');
const crypto         = require('crypto');
const ticketService  = require('../services/ticketService');
const { processDocument } = require('../services/documentProcessingService');
const { departmentFilter, canAccessDepartment } = require('../middleware/departmentScope');

// AI enrichment must never prevent an uploaded document from being persisted.
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_REQUEST_CONFIG = { timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS || 8000) };

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// POST /api/documents/upload
// Viewer is blocked upstream by authorize() middleware.
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const legacyUploadDocument = async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded.' });

    const { title } = req.body;
    if (!title)
      return res.status(400).json({ message: 'Title is required.' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    let documentType = 'TXT';
    if (ext === '.pdf')  documentType = 'PDF';
    else if (ext === '.docx') documentType = 'DOCX';

    const uploadedBy = req.user?.id || req.user?._id;

    let extractedText   = null;
    let summary         = null;
    let department      = null;   // set to null until AI classify runs
    let confidenceScore = 0;

    // Step 0: Generate SHA-256 hash of the actual file contents
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Quick pre-check for existing duplicate
    const existingDoc = await Document.findOne({ fileHash });
    if (existingDoc) {
      return res.status(409).json({
        success: false,
        message: 'This document has already been uploaded.',
        duplicate: true
      });
    }

    // Persist the upload before calling external services. An unavailable AI
    // service must not leave the document unsaved.
    let savedDocument;
    try {
      savedDocument = await new Document({
        title,
        originalFileName: req.file.originalname,
        filePath:         req.file.path,
        documentType,
        uploadedBy,
        fileSize:         req.file.size,
        status:           'Pending',
        extractedText,
        summary,
        department,
        confidenceScore,
        fileHash,
      }).save();
    } catch (saveErr) {
      if (saveErr.code === 11000 && saveErr.keyPattern && saveErr.keyPattern.fileHash) {
        // Handle race condition where another upload completed the save first
        return res.status(409).json({
          success: false,
          message: 'This document has already been uploaded.',
          duplicate: true
        });
      }
      throw saveErr;
    }

    // Step 1: Extract
    try {
      const extractResponse = await axios.post(AI_SERVICE_URL + '/extract', {
        filePath: req.file.path,
      }, AI_REQUEST_CONFIG);
      if (extractResponse.data?.success) extractedText = extractResponse.data.text;
    } catch (e) {
      console.error('FastAPI /extract error:', e.message);
    }

    // Step 2: Summarize
    if (extractedText) {
      try {
        const summarizeResponse = await axios.post(AI_SERVICE_URL + '/summarize', {
          text: extractedText,
        }, AI_REQUEST_CONFIG);
        if (summarizeResponse.data?.success) summary = summarizeResponse.data.summary;
      } catch (e) {
        console.error('FastAPI /summarize error:', e.message);
      }
    }

    // Step 3: Classify
    if (extractedText) {
      try {
        const classifyResponse = await axios.post(AI_SERVICE_URL + '/classify', {
          text: extractedText,
        }, AI_REQUEST_CONFIG);
        if (classifyResponse.data?.success) {
          const CANONICAL_DEPTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];
          const rawDept = classifyResponse.data.department;
          // Only accept canonical department values; discard anything unexpected
          if (CANONICAL_DEPTS.includes(rawDept)) {
            department      = rawDept;
            confidenceScore = classifyResponse.data.confidenceScore;
          } else {
            console.warn(`AI classifier returned non-canonical department '${rawDept}' — defaulting to 'IT'.`);
            department      = 'IT';
            confidenceScore = classifyResponse.data.confidenceScore ?? 50;
          }
        }
      } catch (e) {
        console.error('FastAPI /classify error:', e.message);
      }
    }

    // Step 4: Save the enrichment results on the already-persisted document.
    savedDocument.extractedText = extractedText;
    savedDocument.summary = summary;
    savedDocument.department = department;
    savedDocument.confidenceScore = confidenceScore;
    await savedDocument.save();

    // Step 5: Routing log
    try {
      const routingLog = new RoutingLog({
        documentId:      savedDocument._id,
        department,
        confidenceScore,
        routedBy:        'AI',
        status:          'Routed',
      });
      await routingLog.save();
      savedDocument.status = 'Routed';
      await savedDocument.save();
    } catch (routingErr) {
      console.error('RoutingLog error:', routingErr.message);
    }

    // Step 6: Create Ticket automatically
    let createdTicket = null;
    try {
      createdTicket = await ticketService.createTicketForDocument(
        savedDocument,
        req.user,
        {
          extractedText: !!extractedText,
          summary:       !!summary,
          department,
        }
      );
    } catch (ticketErr) {
      console.error('Ticket creation error:', ticketErr.message);
      return res.status(500).json({
        success: false,
        message: 'Document was uploaded, but its ticket could not be created. Please retry the upload.',
        data: savedDocument,
      });
    }

    // Step 7: Write ticketId back onto the document
    if (createdTicket) {
      try {
        savedDocument.ticketId = createdTicket.ticketId;
        await savedDocument.save();
      } catch (linkErr) {
        console.error('Ticket link error:', linkErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and ticket created successfully',
      data:    savedDocument,
      ticket:  createdTicket
        ? { ticketId: createdTicket.ticketId, _id: createdTicket._id }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// GET /api/documents  Ã¢â‚¬â€ list documents with server-side pagination & search
// Viewer: only receives title, department, summary, status, createdAt
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// HTTP adapter for the shared manual/email document pipeline.
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    if (!req.body.title) return res.status(400).json({ success: false, message: 'Title is required.' });

    const result = await processDocument({
      filePath: req.file.path,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      title: req.body.title,
      uploadedBy: req.user?.id || req.user?._id,
    });
    if (result.duplicate) {
      return res.status(409).json({ success: false, message: 'This document has already been uploaded.', duplicate: true });
    }
    return res.status(201).json({
      success: true,
      message: 'Document uploaded and ticket created successfully',
      data: result.document,
      ticket: { ticketId: result.ticket.ticketId, _id: result.ticket._id },
    });
  } catch (error) { next(error); }
};

const getDocuments = async (req, res, next) => {
  try {
    const {
      page       = 1,
      limit      = 20,
      search     = '',
      department = '',
      sort       = '-createdAt',
    } = req.query;

    // Ã¢â€â‚¬Ã¢â€â‚¬ Department filter based on role Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // Non-admin requests are scoped by the department in the signed JWT.
    // The department query parameter is honoured only for administrators.
    const query = departmentFilter(req.user);
    if (req.user.role === 'Admin' && department) query.department = department;

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { title:    searchRegex },
        { summary:  searchRegex },
        { keywords: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Field projection Ã¢â‚¬â€ Viewers get summary-only Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const isViewer = req.user.role === 'Viewer';
    const selectFields = isViewer
      ? 'title department status summary confidenceScore createdAt uploadedBy source emailSender emailSubject'
      : 'title department status confidenceScore createdAt uploadedBy source emailSender emailSubject';

    const [documents, total] = await Promise.all([
      Document.find(query)
              .select(selectFields)
              .populate('uploadedBy', 'name email')
              .sort(sort)
              .skip(skip)
              .limit(Number(limit)),
      Document.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: documents,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// GET /api/documents/:id
// Viewer: only receives summary fields, no filePath, no extractedText
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid document ID.' });

    const doc = await Document.findById(id).populate('uploadedBy', 'name email');
    if (!doc)
      return res.status(404).json({ success: false, message: 'Document not found.' });

    // ── RBAC ──
    // Allow:
    // 1. Admin (always)
    // 2. Users who belong to the document's department (officers, collaborators)
    // 3. Viewer users who uploaded the document (requesters viewing their own)
    const uploadedById = doc.uploadedBy?._id || doc.uploadedBy;
    const isRequesterViewingOwnDocument = req.user.role === 'Viewer' && String(uploadedById) === String(req.user.id);
    
    if (!isRequesterViewingOwnDocument && !canAccessDepartment(req.user, doc)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: you can only access documents belonging to your department.',
      });
    }

    const routingLogs = await RoutingLog.find({ documentId: id }).sort({ routedAt: -1 });

    // Ã¢â€â‚¬Ã¢â€â‚¬ Strip sensitive fields for Viewer Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const isViewer = req.user.role === 'Viewer';
    const docObj   = doc.toObject();
    if (isViewer) {
      delete docObj.filePath;
      delete docObj.extractedText;
    }

    return res.status(200).json({
      success: true,
      data: { ...docObj, routingHistory: routingLogs },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/documents/:id/share
// ─────────────────────────────────────────────────────────────────────────────
const shareDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { department, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid document ID.' });

    const VALID_DEPTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];
    if (!VALID_DEPTS.includes(department))
      return res.status(400).json({ success: false, message: 'Invalid target department.' });

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    // Only Admin or the owner department can share
    if (req.user.role !== 'Admin' && doc.department !== req.user.department)
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this document.' });

    if (doc.department === department)
      return res.status(400).json({ success: false, message: 'Cannot share document with its own department.' });

    // Check if already shared
    if (doc.sharedWith.some(s => s.department === department))
      return res.status(400).json({ success: false, message: 'Document is already shared with this department.' });

    const shareEntry = {
      department,
      sharedBy: req.user.id || req.user._id,
      reason: reason || '',
      sharedAt: new Date()
    };

    doc.sharedWith.push(shareEntry);
    await doc.save();

    // Mirror to Ticket if it exists
    if (doc.ticketId) {
      const Ticket = require('../models/Ticket');
      const ticket = await Ticket.findOne({ documentId: doc._id });
      if (ticket) {
        ticket.sharedWith.push(shareEntry);
        ticket.timeline.push({
          action: `Document shared with ${department}`,
          performedBy: req.user.name || req.user.email || 'System',
          timestamp: new Date()
        });
        await ticket.save();
      }
    }

    // Log the action
    const RoutingLog = require('../models/RoutingLog');
    await new RoutingLog({
      documentId: doc._id,
      department: department,
      confidenceScore: 100, // Manual share
      routedBy: req.user.name || 'System',
      status: 'Routed'
    }).save();

    const updatedDoc = await Document.findById(id).populate('sharedWith.sharedBy', 'name email');
    return res.status(200).json({ success: true, data: updatedDoc, message: `Shared successfully with ${department}` });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/documents/:id/share/:department
// ─────────────────────────────────────────────────────────────────────────────
const unshareDocument = async (req, res, next) => {
  try {
    const { id, department } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid document ID.' });

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    // Admin or owner department can unshare
    if (req.user.role !== 'Admin' && doc.department !== req.user.department)
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this document.' });

    const initialLength = doc.sharedWith.length;
    doc.sharedWith = doc.sharedWith.filter(s => s.department !== department);

    if (doc.sharedWith.length === initialLength)
      return res.status(404).json({ success: false, message: 'Share not found for this department.' });

    await doc.save();

    // Mirror to Ticket if it exists
    if (doc.ticketId) {
      const Ticket = require('../models/Ticket');
      const ticket = await Ticket.findOne({ documentId: doc._id });
      if (ticket) {
        ticket.sharedWith = ticket.sharedWith.filter(s => s.department !== department);
        ticket.timeline.push({
          action: `Share access revoked for ${department}`,
          performedBy: req.user.name || req.user.email || 'System',
          timestamp: new Date()
        });
        await ticket.save();
      }
    }

    const updatedDoc = await Document.findById(id).populate('sharedWith.sharedBy', 'name email');
    return res.status(200).json({ success: true, data: updatedDoc, message: `Share access revoked for ${department}` });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/documents/:id (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Delete a document and its associated file permanently.
 * Only Admin users can delete documents.
 * This also deletes the associated ticket if it exists.
 * This is a hard delete and cannot be undone.
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid document ID.' });

    const doc = await Document.findById(id);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Document not found.' });

    // Store document info for response before deletion
    const docTitle = doc.title;
    const docFileName = doc.originalFileName;
    const filePath = doc.filePath;

    // Delete associated file from disk if it exists
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.error(`[FILE DELETE] Failed to delete file: ${filePath}`, fileErr.message);
        // Continue with document deletion even if file deletion fails
      }
    }

    // Delete associated ticket(s) if they exist
    const Ticket = require('../models/Ticket');
    await Ticket.deleteMany({ documentId: doc._id });

    // Delete routing logs for this document
    await RoutingLog.deleteMany({ documentId: doc._id });

    // Delete the document record
    await Document.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Document "${docTitle}" and associated file have been deleted permanently.`,
      data: {
        _id: id,
        title: docTitle,
        originalFileName: docFileName,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocument, getDocuments, getDocumentById, shareDocument, unshareDocument, deleteDocument };
