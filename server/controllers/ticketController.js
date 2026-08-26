// controllers/ticketController.js — KMRL Ticket Management REST handlers
'use strict';

const mongoose           = require('mongoose');
const Ticket             = require('../models/Ticket');
const User               = require('../models/User');
const { appendTimeline, saveTicketAndSyncDocumentStatus } = require('../services/ticketService');
const { sendResolutionEmail } = require('../services/gmailService');
const { departmentFilter, canAccessDepartment, isOwnerDepartment, isAssignedOfficer, isRequester } = require('../middleware/departmentScope');

const VALID_DEPARTMENTS = ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDeptFilter(user, extra = {}) {
  return departmentFilter(user, extra);
}

function actorLabel(user) {
  return user?.name ?? user?.email ?? 'System';
}

// ─── GET /api/tickets ─────────────────────────────────────────────────────────
/**
 * List all tickets visible to the requesting user.
 * Supports: ?department=Finance&status=New&priority=High&page=1&limit=20&shared=true
 *
 * Each ticket returned includes a `_isShared` virtual that the frontend uses
 * to render the "Shared with me" indicator for collaborating departments.
 */
const getTickets = async (req, res, next) => {
  try {
    const {
      page       = 1,
      limit      = 20,
      department = '',
      status     = '',
      priority   = '',
    } = req.query;

    const filter = buildDeptFilter(req.user);
    if (req.user.role === 'Admin' && department) filter.department = department;
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;

    // ?assigned=false → only unassigned tickets (Admin only)
    if (req.user.role === 'Admin' && req.query.assigned === 'false') {
      filter.assignedTo = null;
    }
    // ?assigned=true → only assigned tickets (Admin only)
    if (req.user.role === 'Admin' && req.query.assigned === 'true') {
      filter.assignedTo = { $ne: null };
    }
    // ?mine=true → tickets assigned specifically to the requesting officer
    if (req.user.role === 'Department Officer' && req.query.mine === 'true') {
      filter.assignedTo = req.user.id;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('documentId', 'title originalFileName documentType fileSize createdAt source emailSender emailSubject')
        .populate('assignedTo',  'name email department')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(filter),
    ]);

    // Annotate each ticket so the frontend knows whether this user is the
    // owner or a collaborator (shared) for display purposes.
    const annotated = tickets.map((t) => {
      const obj = t.toObject();
      // _isShared = true  → the user's dept appears in sharedWith, not as owner
      obj._isShared = !isOwnerDepartment(req.user, t);
      return obj;
    });

    return res.status(200).json({
      success: true,
      data: annotated,
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

// ─── GET /api/tickets/:id ─────────────────────────────────────────────────────
const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });

    const ticket = await Ticket.findById(id)
      .populate('documentId', 'title originalFileName documentType summary extractedText department confidenceScore filePath createdAt uploadedBy source emailSender emailSubject emailReceivedAt emailMetadata emailMessageId')
      .populate('assignedTo',  'name email department')
      .populate('requester', 'name email department')
      .populate('resolvedBy',  'name email department')
      .populate('sharedWith.sharedBy', 'name email department');

    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    // ── Access Control ──
    // Allow: Admin, department officers who own/collaborate, or the original requester
    const hasAccess = 
      req.user.role === 'Admin' ||
      canAccessDepartment(req.user, ticket) ||
      isRequester(req.user, ticket);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — you can only access tickets belonging to your department or that you created.',
      });
    }

    const RoutingLog = require('../models/RoutingLog');
    const routingHistory = ticket.documentId?._id
      ? await RoutingLog.find({ documentId: ticket.documentId._id }).sort({ routedAt: -1 })
      : [];

    const ticketData = ticket.toObject();
    if (req.user.role !== 'Admin') delete ticketData.resolutionEmailError;

    // For requesters, hide internal-only information
    if (isRequester(req.user, ticket) && req.user.role !== 'Admin') {
      // Hide internal notes - these are for department use only
      delete ticketData.internalNotes;
      // Hide detailed sharing info - requesters just need to know status
      delete ticketData.sharedWith;
      // Hide assigned officer details - internal only
      ticketData.assignedTo = null;
    }

    // Tell the frontend whether this user is the owner or a collaborator
    ticketData._isShared = !isOwnerDepartment(req.user, ticket);

    return res.status(200).json({
      success: true,
      data: { ...ticketData, routingHistory },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/tickets/my ────────────────────────────────────────────────────────
/**
 * List all tickets created by the requesting user (requester).
 * Supports: ?status=New&page=1&limit=20
 *
 * This endpoint is for employees to see their own tickets.
 * Requires authentication - returns only tickets where requester == authenticated user.
 */
const getMyTickets = async (req, res, next) => {
  try {
    const {
      page       = 1,
      limit      = 20,
      status     = '',
    } = req.query;

    // Filter to only tickets created by the logged-in user
    const filter = { requester: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('documentId', 'title originalFileName documentType fileSize createdAt source emailSender emailSubject')
        .populate('assignedTo', 'name email department')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/tickets/:id/status ───────────────────────────────────────────
// Owner department and Admin only — collaborators cannot change status directly.
const updateStatus = async (req, res, next) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['New', 'Assigned', 'In Progress', 'Shared', 'Returned', 'Resolved', 'Closed'];
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });

    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    // Collaborating departments cannot change status
    if (!isAssignedOfficer(req.user, ticket))
      return res.status(403).json({ success: false, message: 'Forbidden — only the owner department can change ticket status.' });

    const previous = ticket.status;
    ticket.status  = status;
    ticket.timeline.push({
      action:      `Status changed from ${previous} to ${status}`,
      performedBy: actorLabel(req.user),
      timestamp:   new Date(),
    });

    await saveTicketAndSyncDocumentStatus(ticket);
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/tickets/:id/resolve ──────────────────────────────────────────
/**
 * CRITICAL RULE: Only the OWNER department (ticket.department) may resolve.
 * Collaborating departments (sharedWith) must NOT be able to resolve.
 * Resolution triggers Gmail API reply for email-originated tickets.
 */
const resolveTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resolutionMessage = String(req.body?.resolutionMessage || '').trim();

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });
    if (!resolutionMessage)
      return res.status(400).json({ success: false, message: 'A resolution message is required.' });
    if (resolutionMessage.length > 5000)
      return res.status(400).json({ success: false, message: 'Resolution message must not exceed 5000 characters.' });

    const ticket = await Ticket.findById(id).populate('documentId', 'source emailSender emailSubject emailMetadata emailMessageId');
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    // Gate 1: must have at least read-access to this ticket
    if (!canAccessDepartment(req.user, ticket))
      return res.status(403).json({ success: false, message: 'Forbidden.' });

    // Gate 2: only the OWNER department (or Admin) can resolve — NOT collaborators
    if (!isAssignedOfficer(req.user, ticket))
      return res.status(403).json({
        success: false,
        message: 'Forbidden — only the owner department can resolve this ticket. As a collaborating department, please add an internal note with your recommendation.',
      });

    if (ticket.status === 'Resolved')
      return res.status(409).json({ success: false, message: 'Ticket is already resolved.' });
    if (ticket.status === 'Closed')
      return res.status(409).json({ success: false, message: 'Closed tickets cannot be resolved.' });

    const resolver = await User.findById(req.user.id).select('name email department');
    ticket.status            = 'Resolved';
    ticket.resolutionMessage = resolutionMessage;
    ticket.resolvedBy        = resolver?._id || req.user.id;
    ticket.resolvedAt        = new Date();

    const isEmailTicket = ticket.documentId?.source === 'email';
    ticket.resolutionEmailStatus = isEmailTicket ? 'pending' : 'not_required';
    ticket.resolutionEmailError  = '';
    ticket.timeline.push({
      action:      'Ticket Resolved',
      performedBy: actorLabel(resolver || req.user),
      timestamp:   ticket.resolvedAt,
    });
    await saveTicketAndSyncDocumentStatus(ticket);

    if (isEmailTicket) {
      try {
        await sendResolutionEmail(ticket);
        ticket.resolutionEmailStatus  = 'sent';
        ticket.resolutionEmailSentAt  = new Date();
        ticket.timeline.push({
          action:      'Resolution email sent to original sender',
          performedBy: 'System',
          timestamp:   ticket.resolutionEmailSentAt,
        });
      } catch (emailErr) {
        ticket.resolutionEmailStatus = 'failed';
        ticket.resolutionEmailError  = emailErr.message.slice(0, 500);
        ticket.timeline.push({
          action:      'Resolution email failed to send',
          performedBy: 'System',
          timestamp:   new Date(),
        });
        console.error(`[EMAIL] Resolution email failed | ticket=${ticket.ticketId} | reason=${emailErr.message}`);
      }
      await ticket.save();
    }

    const populated  = await ticket.populate(['documentId', 'resolvedBy']);
    const ticketData = populated.toObject();
    if (req.user.role !== 'Admin') delete ticketData.resolutionEmailError;
    ticketData._isShared = false; // resolver is always the owner

    return res.status(200).json({
      success: true,
      data: ticketData,
      resolutionEmail: { status: ticket.resolutionEmailStatus },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/tickets/:id/resolution-email/retry (Admin only) ───────────────
const retryResolutionEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });

    const ticket = await Ticket.findById(id).populate('documentId', 'source emailSender emailSubject emailMetadata emailMessageId');
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    if (ticket.status !== 'Resolved')
      return res.status(409).json({ success: false, message: 'Only resolved tickets can send a resolution email.' });
    if (ticket.documentId?.source !== 'email')
      return res.status(400).json({ success: false, message: 'This ticket did not originate from email.' });
    if (ticket.resolutionEmailStatus === 'sent')
      return res.status(409).json({ success: false, message: 'A resolution email was already sent.' });
    if (ticket.resolutionEmailStatus !== 'failed')
      return res.status(409).json({ success: false, message: 'Only a failed resolution email can be retried.' });

    ticket.resolutionEmailStatus = 'pending';
    ticket.resolutionEmailError  = '';
    await ticket.save();

    try {
      await sendResolutionEmail(ticket);
      ticket.resolutionEmailStatus = 'sent';
      ticket.resolutionEmailSentAt = new Date();
      ticket.timeline.push({
        action:      'Resolution email retry sent to original sender',
        performedBy: 'System',
        timestamp:   ticket.resolutionEmailSentAt,
      });
      console.info(`[EMAIL] Resolution email retry | ticket=${ticket.ticketId} | status=sent`);
    } catch (emailErr) {
      ticket.resolutionEmailStatus = 'failed';
      ticket.resolutionEmailError  = emailErr.message.slice(0, 500);
      ticket.timeline.push({
        action:      'Resolution email retry failed',
        performedBy: 'System',
        timestamp:   new Date(),
      });
      console.error(`[EMAIL] Resolution email retry | ticket=${ticket.ticketId} | status=failed | reason=${emailErr.message}`);
    }

    await ticket.save();
    return res.status(200).json({
      success: true,
      data: ticket,
      resolutionEmail: { status: ticket.resolutionEmailStatus },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/tickets/:id/assign ───────────────────────────────────────────
/**
 * Assign, reassign, or unassign a ticket officer.
 *
 * Body:
 *   { userId: '<ObjectId>' }   → assign / reassign
 *   { userId: null }           → unassign
 *
 * Validation (server-enforced — never trust frontend):
 *   1. Requester is Admin (only Admins may assign).
 *   2. Ticket exists.
 *   3. If assigning: userId is a valid ObjectId.
 *   4. If assigning: target user exists in DB.
 *   5. If assigning: target user role === 'Department Officer'.
 *   6. If assigning: target user department === ticket owner department.
 *   7. If assigning: target user status === 'Active'.
 *
 * Timeline events (append-only):
 *   Assign:   "Ticket assigned to <name> (<dept>) by <actor>"
 *   Reassign: "Ticket reassigned from <old> to <new> by <actor>"
 *   Unassign: "Ticket unassigned by <actor>"
 */
const assignTicket = async (req, res, next) => {
  try {
    // Only Admin may assign officers
    if (req.user.role !== 'Admin')
      return res.status(403).json({ success: false, message: 'Forbidden — only Admin can assign officers to tickets.' });

    const { id }     = req.params;
    const { userId } = req.body;   // null/undefined → unassign

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });

    const ticket = await Ticket.findById(id).populate('assignedTo', 'name email department');
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    if (ticket.status === 'Closed')
      return res.status(409).json({ success: false, message: 'Cannot assign officers to a closed ticket.' });

    const ownerDept = ticket.ownerDepartment || ticket.department;
    const now       = new Date();
    const actor     = actorLabel(req.user);
    const prevOfficer = ticket.assignedTo
      ? `${ticket.assignedTo.name} (${ticket.assignedTo.department})`
      : null;

    // ── UNASSIGN branch ────────────────────────────────────────────────────
    if (!userId || userId === 'null') {
      if (!ticket.assignedTo)
        return res.status(409).json({ success: false, message: 'Ticket is already unassigned.' });

      ticket.assignedTo = null;
      // Revert status to New if it was only 'Assigned'
      if (ticket.status === 'Assigned') ticket.status = 'New';
      ticket.timeline.push({
        action:      `Ticket unassigned (was ${prevOfficer}) by ${actor}`,
        performedBy: actor,
        timestamp:   now,
      });
      await saveTicketAndSyncDocumentStatus(ticket);
      const populated = await ticket.populate('assignedTo', 'name email department');
      return res.status(200).json({ success: true, data: populated });
    }

    // ── ASSIGN / REASSIGN branch ───────────────────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ success: false, message: 'userId must be a valid ObjectId.' });

    // Fetch the target user — select all fields needed for validation
    const assignee = await User.findById(userId).select('name email role department status');
    if (!assignee)
      return res.status(404).json({ success: false, message: 'User not found.' });

    // Gate 1: must be a Department Officer
    if (assignee.role !== 'Department Officer')
      return res.status(422).json({
        success: false,
        message: `Cannot assign: ${assignee.name} is not a Department Officer.`,
      });

    // Gate 2: must belong to the ticket's owner department
    if (assignee.department !== ownerDept)
      return res.status(422).json({
        success: false,
        message: `Cannot assign: ${assignee.name} belongs to ${assignee.department}, not ${ownerDept}.`,
      });

    // Gate 3: must be active
    if (assignee.status !== 'Active')
      return res.status(422).json({
        success: false,
        message: `Cannot assign: ${assignee.name}'s account is inactive.`,
      });

    // Build timeline action text
    const timelineAction = prevOfficer
      ? `Ticket reassigned from ${prevOfficer} to ${assignee.name} (${assignee.department}) by ${actor}`
      : `Ticket assigned to ${assignee.name} (${assignee.department}) by ${actor}`;

    ticket.assignedTo = assignee._id;
    ticket.status     = 'Assigned';
    ticket.timeline.push({ action: timelineAction, performedBy: actor, timestamp: now });

    await saveTicketAndSyncDocumentStatus(ticket);
    const populated = await ticket.populate('assignedTo', 'name email department');
    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/tickets/:id/share ────────────────────────────────────────────
/**
 * Share a ticket with a collaborating department for assistance.
 *
 * Rules:
 * - Only the OWNER department (or Admin) can share.
 * - Ownership (ticket.department / ownerDepartment) never changes.
 * - Cannot share with own department.
 * - Duplicate shares are silently ignored (idempotent).
 * - Reason is required.
 * - Status → SHARED.
 *
 * Body: { department: 'Finance', reason: 'Need Finance review of clause 4.' }
 */
const shareTicket = async (req, res, next) => {
  try {
    const { id }                           = req.params;
    const { department: targetDept, reason } = req.body;

    if (!targetDept || !VALID_DEPARTMENTS.includes(targetDept))
      return res.status(400).json({ success: false, message: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}` });

    if (!reason || String(reason).trim().length < 5)
      return res.status(400).json({ success: false, message: 'A sharing reason of at least 5 characters is required.' });

    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    // Only the owner department (or Admin) can share
    if (!isAssignedOfficer(req.user, ticket))
      return res.status(403).json({
        success: false,
        message: 'Forbidden — only the owner department can share this ticket.',
      });

    // Cannot share with own/owner department
    const ownerDept = ticket.ownerDepartment || ticket.department;
    if (targetDept === ownerDept)
      return res.status(400).json({ success: false, message: 'Cannot share a ticket with its own department.' });

    // Prevent duplicate shares
    const alreadyShared = ticket.sharedWith.some((s) => s.department === targetDept);
    if (alreadyShared)
      return res.status(409).json({
        success: false,
        message: `Ticket is already shared with ${targetDept}.`,
      });

    if (ticket.status === 'Resolved' || ticket.status === 'Closed')
      return res.status(409).json({
        success: false,
        message: `Cannot share a ${ticket.status.toLowerCase()} ticket.`,
      });

    ticket.sharedWith.push({
      department: targetDept,
      sharedBy:   req.user.id,
      sharedAt:   new Date(),
      reason:     String(reason).trim(),
    });

    ticket.status = 'Shared';
    ticket.timeline.push({
      action:      `Ticket shared with ${targetDept} for assistance. Reason: ${String(reason).trim()}`,
      performedBy: actorLabel(req.user),
      timestamp:   new Date(),
    });

    await saveTicketAndSyncDocumentStatus(ticket);
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/tickets/:id/share/:department ────────────────────────────────
/**
 * Remove a department from the sharedWith list (unshare).
 * Only the owner department or Admin can unshare.
 */
const unshareTicket = async (req, res, next) => {
  try {
    const { id, department: targetDept } = req.params;

    if (!VALID_DEPARTMENTS.includes(targetDept))
      return res.status(400).json({ success: false, message: 'Invalid department.' });

    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    if (!isAssignedOfficer(req.user, ticket))
      return res.status(403).json({ success: false, message: 'Forbidden — only the owner department can unshare this ticket.' });

    const before = ticket.sharedWith.length;
    ticket.sharedWith = ticket.sharedWith.filter((s) => s.department !== targetDept);

    if (ticket.sharedWith.length === before)
      return res.status(404).json({ success: false, message: `Ticket was not shared with ${targetDept}.` });

    // If no more shares, revert status to In Progress
    if (ticket.sharedWith.length === 0 && ticket.status === 'Shared')
      ticket.status = 'In Progress';

    ticket.timeline.push({
      action:      `Sharing with ${targetDept} removed`,
      performedBy: actorLabel(req.user),
      timestamp:   new Date(),
    });

    await saveTicketAndSyncDocumentStatus(ticket);
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/tickets/:id/notes ──────────────────────────────────────────────
/**
 * Add an internal note to a ticket.
 *
 * Access:
 * - Owner department officers → can add notes
 * - Collaborating (sharedWith) department officers → can add notes
 * - Admin → can add notes
 *
 * Rules:
 * - Notes are NEVER sent to the original user.
 * - Notes are append-only.
 * - Each note adds a timeline event so the audit trail is complete.
 *
 * Body: { content: 'The payment terms in Section 4 need revision...' }
 */
const addInternalNote = async (req, res, next) => {
  try {
    const { id }    = req.params;
    const content   = String(req.body?.content || '').trim();

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });
    if (!content)
      return res.status(400).json({ success: false, message: 'Note content is required.' });
    if (content.length > 10000)
      return res.status(400).json({ success: false, message: 'Note must not exceed 10 000 characters.' });

    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    // Both owner department and collaborating (shared) departments can add notes
    if (!canAccessDepartment(req.user, ticket))
      return res.status(403).json({ success: false, message: 'Forbidden.' });

    // Resolved/Closed tickets can still receive notes (for audit purposes)
    const author = await User.findById(req.user.id).select('name email department');
    const authorName       = author?.name       ?? req.user.name       ?? req.user.email ?? 'Unknown';
    const authorDepartment = author?.department ?? req.user.department ?? '';

    ticket.internalNotes.push({
      content,
      authorName,
      authorDepartment,
      authorId:  req.user.id,
      createdAt: new Date(),
    });

    ticket.timeline.push({
      action:      `Internal note added by ${authorName} (${authorDepartment})`,
      performedBy: authorName,
      timestamp:   new Date(),
    });

    await ticket.save();

    // Return only the newly added note so the frontend can append it
    const newNote = ticket.internalNotes[ticket.internalNotes.length - 1];
    return res.status(201).json({ success: true, data: newNote });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/tickets/:id/priority ─────────────────────────────────────────
const updatePriority = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin')
      return res.status(403).json({ success: false, message: 'Forbidden — only Admin can change priority.' });

    const { id }       = req.params;
    const { priority } = req.body;

    const VALID = ['Critical', 'High', 'Medium', 'Low'];
    if (!priority || !VALID.includes(priority))
      return res.status(400).json({ success: false, message: `Invalid priority. Must be one of: ${VALID.join(', ')}` });

    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    const previous  = ticket.priority;
    ticket.priority = priority;
    ticket.timeline.push({
      action:      `Priority changed from ${previous} to ${priority}`,
      performedBy: actorLabel(req.user),
      timestamp:   new Date(),
    });

    await ticket.save();
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/tickets/:id/close ────────────────────────────────────────────
const closeTicket = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin')
      return res.status(403).json({ success: false, message: 'Forbidden — only Admin can close tickets.' });

    const { id } = req.params;
    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    if (ticket.status === 'Closed')
      return res.status(409).json({ success: false, message: 'Ticket is already closed.' });

    ticket.status = 'Closed';
    ticket.timeline.push({
      action:      'Ticket Closed',
      performedBy: actorLabel(req.user),
      timestamp:   new Date(),
    });

    await saveTicketAndSyncDocumentStatus(ticket);
    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/tickets/:id (Admin only) ────────────────────────────────────
/**
 * Delete a ticket permanently.
 * Only Admin users can delete tickets.
 * This is a hard delete and cannot be undone.
 */
const deleteTicket = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin')
      return res.status(403).json({ success: false, message: 'Forbidden — only Admin can delete tickets.' });

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });

    const ticket = await Ticket.findById(id);
    if (!ticket)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    // Store ticket ID for response before deletion
    const ticketId = ticket.ticketId;

    // Delete the ticket
    await Ticket.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Ticket ${ticketId} has been deleted permanently.`,
      data: { _id: id, ticketId },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/tickets/leave-request ──────────────────────────────────────────
/**
 * Create a new leave request ticket.
 * 
 * Body:
 *   leaveType: 'Annual' | 'Sick' | 'Personal' | 'Unpaid' | 'Other'
 *   startDate: ISO date string
 *   endDate: ISO date string
 *   reason: optional reason text
 *   attachmentId: optional document ID
 */
const createLeaveRequest = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason, attachmentId } = req.body;

    // Validation
    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: leaveType, startDate, endDate',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 (e.g., 2026-08-27).',
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date.',
      });
    }

    if (!['Annual', 'Sick', 'Personal', 'Unpaid', 'Other'].includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave type.',
      });
    }

    // Generate ticket ID
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const latestTicket = await Ticket.findOne().sort({ createdAt: -1 });
    const count = (latestTicket?.ticketId?.split('-').pop() ?? '0');
    const nextNum = String(Number(count) + 1).padStart(6, '0');
    const ticketId = `KMRL-${yearMonth}-${nextNum}`;

    // Create a placeholder document for the leave request
    const Document = require('../models/Document');
    const docTitle = `Leave Request: ${leaveType} Leave`;
    
    const newDoc = new Document({
      title: docTitle,
      originalFileName: `${docTitle}.txt`,
      filePath: null,
      documentType: 'TXT',
      uploadedBy: req.user.id,
      department: 'HR',
      summary: `${leaveType} leave request from ${req.user.name} for ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      status: 'Processed',
      source: 'manual',
    });

    const savedDoc = await newDoc.save();

    // Create ticket
    const newTicket = new Ticket({
      ticketId,
      documentId: savedDoc._id,
      requester: req.user.id,
      department: 'HR',
      ownerDepartment: 'HR',
      requestType: 'leave',
      status: 'New',
      priority: 'Medium',
      leaveRequestData: {
        leaveType,
        startDate: start,
        endDate: end,
        reason: reason || '',
        attachmentId: attachmentId || null,
      },
    });

    // Add timeline event
    appendTimeline(newTicket, `Leave request created: ${leaveType} leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, req.user.name);

    await newTicket.save();

    // Populate for response
    await newTicket.populate('documentId');
    await newTicket.populate('requester', 'name email department');

    return res.status(201).json({
      success: true,
      data: newTicket,
      message: 'Leave request submitted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/tickets/:id/resolve-leave ────────────────────────────────────
/**
 * Approve or reject a leave request (HR officers only).
 * 
 * Body:
 *   action: 'approve' | 'reject'
 *   resolutionMessage: approval/rejection message
 */
const resolveLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, resolutionMessage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });
    }

    // Only HR can approve/reject leave requests
    if (req.user.department !== 'HR' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — only HR can approve/reject leave requests.',
      });
    }

    const ticket = await Ticket.findById(id).populate('requester', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    if (ticket.requestType !== 'leave') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is for leave requests only.',
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject".',
      });
    }

    // Update ticket status
    ticket.status = action === 'approve' ? 'Resolved' : 'Rejected';
    ticket.resolutionMessage = resolutionMessage || '';
    ticket.resolvedBy = req.user.id;
    ticket.resolvedAt = new Date();

    // Add timeline event
    appendTimeline(
      ticket,
      `Leave request ${action === 'approve' ? 'approved' : 'rejected'}`,
      req.user.name
    );

    await ticket.save();
    await ticket.populate('requester', 'name email');

    // TODO: Send email to requester with approval/rejection

    return res.status(200).json({
      success: true,
      data: ticket,
      message: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTickets,
  getTicketById,
  getMyTickets,
  updateStatus,
  resolveTicket,
  retryResolutionEmail,
  assignTicket,
  shareTicket,
  unshareTicket,
  addInternalNote,
  updatePriority,
  closeTicket,
  deleteTicket,
  createLeaveRequest,
  resolveLeaveRequest,
};
