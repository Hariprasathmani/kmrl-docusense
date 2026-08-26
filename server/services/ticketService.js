// services/ticketService.js â€” Reusable, source-agnostic ticket creation logic
//
// DESIGN NOTE (Future-Ready):
//   This service is completely independent of the upload controller.
//   Email fetch service, API integration, or any other source can call
//   createTicketForDocument() without modifying this module.
'use strict';

const Counter = require('../models/Counter');
const Ticket  = require('../models/Ticket');
const Document = require('../models/Document');

// Document has a deliberately smaller lifecycle than Ticket. Keep the mapping
// here so every ticket-status mutation updates the linked MongoDB document in
// the same, predictable way without introducing new document status values.
const DOCUMENT_STATUS_BY_TICKET_STATUS = Object.freeze({
  New: 'Routed',
  Assigned: 'Routed',
  'In Progress': 'Processed',
  Shared: 'Processed',
  Returned: 'Processed',
  Resolved: 'Processed',
  Closed: 'Processed',
});

function documentStatusForTicketStatus(ticketStatus) {
  const documentStatus = DOCUMENT_STATUS_BY_TICKET_STATUS[ticketStatus];
  if (!documentStatus) {
    throw new Error(`No document status mapping exists for ticket status "${ticketStatus}".`);
  }
  return documentStatus;
}

/**
 * Persist a ticket status change and its linked document lifecycle state.
 *
 * Mongoose validates the ticket before the document is touched. If saving the
 * ticket subsequently fails, the document status is compensated back to its
 * former value so this standalone-Mongo deployment does not report success
 * with mismatched records.
 */
async function saveTicketAndSyncDocumentStatus(ticket) {
  await ticket.validate();

  const documentId = ticket.documentId?._id || ticket.documentId;
  const document = await Document.findById(documentId);
  if (!document) {
    // Throw a structured error so the controller can return a 404 instead of a 500.
    const err = new Error(
      `The document linked to ticket ${ticket.ticketId || ticket._id} no longer exists. ` +
      `It may have been deleted. Please contact an administrator.`
    );
    err.statusCode = 404;
    err.code = 'LINKED_DOCUMENT_NOT_FOUND';
    throw err;
  }

  const previousDocumentStatus = document.status;
  const nextDocumentStatus = documentStatusForTicketStatus(ticket.status);
  const documentChanged = previousDocumentStatus !== nextDocumentStatus;

  if (documentChanged) {
    document.status = nextDocumentStatus;
    await document.save();
  }

  try {
    return await ticket.save();
  } catch (error) {
    if (documentChanged) {
      await Document.updateOne(
        { _id: document._id, status: nextDocumentStatus },
        { $set: { status: previousDocumentStatus } }
      ).catch((rollbackError) => {
        console.error('[Ticket/document sync] document rollback failed:', rollbackError.message);
      });
    }
    throw error;
  }
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Returns the next sequential number for a given year.
 * Uses MongoDB's atomic findOneAndUpdate to prevent race conditions.
 *
 * @param  {number|string} year  e.g. 2026
 * @returns {Promise<number>}    e.g. 1, 2, 3 â€¦
 */
async function _nextSeq(year) {
  const counter = await Counter.findOneAndUpdate(
    { _id: `ticket-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

/**
 * Generates a human-readable Ticket ID in the format KMRL-YYYY-000001.
 *
 * @param  {number|string} [year]  Defaults to current year.
 * @returns {Promise<string>}
 */
async function generateTicketId(year) {
  const y   = year ?? new Date().getFullYear();
  const seq = await _nextSeq(y);
  return `KMRL-${y}-${String(seq).padStart(6, '0')}`;
}

// â”€â”€â”€ Core Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Creates a Ticket for a given document record and builds the initial timeline.
 *
 * This is the single entry-point for ALL ticket creation sources:
 *   - Manual upload (current)
 *   - Email fetch service (future)
 *   - API integration (future)
 *
 * @param {object} document      Saved Mongoose Document instance
 * @param {object|string} requester The user who requested/created this ticket
 *                                  Can be a User object {_id, name, email} or a user ID string
 *                                  Required - this is the ticket requester
 * @param {object} [actor]       The user/system that triggered creation
 *                               Shape: { name?: string, email?: string } or null
 * @param {object} [pipelineLog] Optional pipeline metadata for timeline
 *   Shape: { extractedText: boolean, summary: boolean, department: string }
 * @returns {Promise<Ticket>}    The saved Ticket document
 */
async function createTicketForDocument(document, requester, actor = null, pipelineLog = {}) {
  // A retry of the same upload must not create a second ticket.
  const existingTicket = await Ticket.findOne({ documentId: document._id });
  if (existingTicket) return existingTicket;

  // Extract requester ID from either object or string
  let requesterId = requester;
  if (typeof requester === 'object' && requester !== null) {
    requesterId = requester._id || requester.id;
  }

  const actorLabel = actor?.name ?? actor?.email ?? 'System';
  const ticketId   = await generateTicketId();

  // Build the initial timeline from the upload/AI pipeline steps
  const now   = new Date();
  const timeline = [];

  // 1. Ticket Created
  timeline.push({
    action:      'Ticket Created',
    performedBy: actorLabel,
    timestamp:   now,
  });

  // 2. OCR / text extraction
  if (pipelineLog.extractedText) {
    timeline.push({
      action:      'OCR / Text Extraction Completed',
      performedBy: 'AI Engine',
      timestamp:   new Date(now.getTime() + 100),
    });
  }

  // 3. AI Summary
  if (pipelineLog.summary) {
    timeline.push({
      action:      'AI Summary Generated',
      performedBy: 'AI Engine',
      timestamp:   new Date(now.getTime() + 200),
    });
  }

  // 4. Department routing
  // Use the document's classified department, or 'IT' as the canonical fallback.
  // IMPORTANT: 'General' is NOT a canonical department and would fail the Ticket enum.
  const dept = pipelineLog.department ?? document.department ?? 'IT';
  timeline.push({
    action:      `Routed to ${dept}`,
    performedBy: 'AI Classifier',
    timestamp:   new Date(now.getTime() + 300),
  });

  const CANONICAL_DEPTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];
  const ticketDept = document.department && CANONICAL_DEPTS.includes(document.department)
    ? document.department
    : 'IT'; // 'IT' is the canonical fallback — never 'General'

  const ticket = new Ticket({
    ticketId,
    documentId:  document._id,
    requester:   requesterId,
    department:  ticketDept,
    priority:    'Medium', // placeholder â€” can be changed via PATCH /priority
    status:      'New',
    assignedTo:  null,
    sharedWith:  [],
    timeline,
  });

  try {
    return await ticket.save();
  } catch (error) {
    // The unique documentId index is the final guard for simultaneous requests.
    if (error?.code === 11000) {
      const concurrentTicket = await Ticket.findOne({ documentId: document._id });
      if (concurrentTicket) return concurrentTicket;
    }
    throw error;
  }
}

/**
 * Appends a single event to an existing ticket's timeline.
 * Preferred over direct $push calls in controllers to keep logic centralised.
 *
 * @param {string} ticketId      The Ticket's _id (ObjectId string)
 * @param {string} action        Human-readable event description
 * @param {string} [performedBy] Actor label (default: 'System')
 * @returns {Promise<Ticket>}
 */
async function appendTimeline(ticketId, action, performedBy = 'System') {
  return Ticket.findByIdAndUpdate(
    ticketId,
    {
      $push: {
        timeline: {
          action,
          performedBy,
          timestamp: new Date(),
        },
      },
    },
    { new: true }
  );
}

module.exports = {
  generateTicketId,
  createTicketForDocument,
  appendTimeline,
  documentStatusForTicketStatus,
  saveTicketAndSyncDocumentStatus,
};
