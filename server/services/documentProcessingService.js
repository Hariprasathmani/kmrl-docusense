'use strict';

// Shared document pipeline for manual uploads and email attachments.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const Document = require('../models/Document');
const RoutingLog = require('../models/RoutingLog');
const ticketService = require('./ticketService');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_REQUEST_CONFIG = { timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS || 8000) };
const CANONICAL_DEPTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];

function documentTypeFor(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') return 'PDF';
  if (ext === '.docx') return 'DOCX';
  return 'TXT';
}

async function processDocument({ filePath, originalFileName, fileSize, title, uploadedBy, source = 'manual', emailMetadata = null }) {
  const fileBuffer = await fs.promises.readFile(filePath);
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const existingDocument = await Document.findOne({ fileHash });
  if (existingDocument) return { duplicate: true, document: existingDocument };

  let document;
  try {
    document = await new Document({
      title,
      originalFileName,
      filePath,
      documentType: documentTypeFor(originalFileName),
      uploadedBy,
      fileSize,
      status: 'Pending',
      extractedText: null,
      summary: null,
      department: null,
      confidenceScore: 0,
      fileHash,
      source,
      ...(emailMetadata && {
        emailMessageId: emailMetadata.messageId,
        emailSender: emailMetadata.sender,
        emailSubject: emailMetadata.subject,
        emailReceivedAt: emailMetadata.receivedAt,
      }),
    }).save();
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.fileHash) {
      return { duplicate: true, document: await Document.findOne({ fileHash }) };
    }
    throw error;
  }

  let extractedText = null;
  let summary = null;
  let department = null;
  let confidenceScore = 0;

  try {
    const response = await axios.post(`${AI_SERVICE_URL}/extract`, { filePath }, AI_REQUEST_CONFIG);
    if (response.data?.success) extractedText = response.data.text;
  } catch (error) { console.error('[Document processing] extraction failed:', error.message); }

  if (extractedText) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/summarize`, { text: extractedText }, AI_REQUEST_CONFIG);
      if (response.data?.success) summary = response.data.summary;
    } catch (error) { console.error('[Document processing] summarization failed:', error.message); }
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/classify`, { text: extractedText }, AI_REQUEST_CONFIG);
      if (response.data?.success) {
        department = CANONICAL_DEPTS.includes(response.data.department) ? response.data.department : 'IT';
        confidenceScore = response.data.confidenceScore ?? (department === 'IT' ? 50 : 0);
      }
    } catch (error) { console.error('[Document processing] classification failed:', error.message); }
  }

  document.extractedText = extractedText;
  document.summary = summary;
  document.department = department;
  document.confidenceScore = confidenceScore;
  await document.save();

  // Preserve existing fallback behaviour: if classification is unavailable, the
  // ticket service routes to IT, while the persisted document remains unassigned.
  if (department) {
    try {
      await new RoutingLog({ documentId: document._id, department, confidenceScore, routedBy: 'AI', status: 'Routed' }).save();
      document.status = 'Routed';
      await document.save();
    } catch (error) { console.error('[Document processing] routing log failed:', error.message); }
  }

  const ticket = await ticketService.createTicketForDocument(
    document,
    uploadedBy,
    uploadedBy,
    { extractedText: Boolean(extractedText), summary: Boolean(summary), department }
  );
  document.ticketId = ticket.ticketId;
  await document.save();
  return { duplicate: false, document, ticket };
}

module.exports = { processDocument, documentTypeFor };
