// models/Ticket.js — KMRL Enterprise Ticket schema
'use strict';

const mongoose = require('mongoose');

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Leave request specific data.
 * Only populated when this ticket represents a leave request.
 */
const leaveRequestDataSchema = new mongoose.Schema(
  {
    leaveType: {
      type: String,
      enum: ['Annual', 'Sick', 'Personal', 'Unpaid', 'Other'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    attachmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
  },
  { _id: false }
);

/**
 * An internal note added by the owner department or a collaborating department.
 * Internal notes are NEVER sent to the original user.
 * Append-only — notes are never edited or deleted.
 */
const internalNoteSchema = new mongoose.Schema(
  {
    // The text of the note
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    // Name of the officer who wrote the note (denormalised for display)
    authorName: {
      type: String,
      required: true,
    },
    // Department of the officer who wrote the note
    authorDepartment: {
      type: String,
      enum: ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'],
      required: true,
    },
    // ObjectId reference to the User who wrote the note
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * A single audit event in the ticket's timeline.
 * Immutable — events are only appended, never modified.
 */
const timelineEventSchema = new mongoose.Schema(
  {
    // Human-readable description of the action (e.g., "Routed to Finance")
    action: {
      type: String,
      required: true,
    },
    // Who performed the action: a user name/email or "System"
    performedBy: {
      type: String,
      default: 'System',
    },
    // When the event occurred
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // sub-document, no separate _id needed
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const ticketSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────────
    // Human-readable ID: KMRL-YYYY-000001
    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ── Links ──────────────────────────────────────────────────────────────
    // The document that spawned this ticket
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },

    // The employee/user who created this ticket (the requester)
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Classification ─────────────────────────────────────────────────────
    department: {
      type: String,
      enum: ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'],
      required: true,
    },

    // ownerDepartment is set on creation and NEVER changes.
    // `department` may be aliased elsewhere, but this field permanently records
    // which department owns and is responsible for the ticket.
    // For existing tickets it is back-filled from `department` at read time
    // via the virtual below.
    ownerDepartment: {
      type: String,
      enum: ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'],
      default: null,
    },

    // Ticket type: null (document submission) or 'leave' (leave request)
    requestType: {
      type: String,
      enum: [null, 'leave'],
      default: null,
    },

    // Leave request specific data - only populated if requestType === 'leave'
    leaveRequestData: {
      type: leaveRequestDataSchema,
      default: null,
    },

    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },

    status: {
      type: String,
      enum: ['New', 'Assigned', 'In Progress', 'Shared', 'Returned', 'Resolved', 'Closed'],
      default: 'New',
    },
    // Resolution data is optional so tickets created before this feature remain valid.
    resolutionMessage: {
      type: String,
      trim: true,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Email tickets only. Manual tickets remain not_required and never send mail.
    resolutionEmailStatus: {
      type: String,
      enum: ['not_required', 'pending', 'sent', 'failed'],
      default: 'not_required',
    },
    resolutionEmailSentAt: { type: Date, default: null },
    resolutionEmailError: { type: String, default: '' },

    // ── Assignment ─────────────────────────────────────────────────────────
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Sharing ────────────────────────────────────────────────────────────
    sharedWith: [
      {
        department: {
          type: String,
          enum: ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'],
          required: true,
        },
        sharedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],

    // ── Audit trail ────────────────────────────────────────────────────────
    // Append-only. Each status change, assignment, or system event adds an entry.
    timeline: [timelineEventSchema],

    // ── Internal Notes ─────────────────────────────────────────────────────
    // Visible only to owner department, collaborating departments, and Admin.
    // NEVER sent to the original user.
    // Append-only — notes are never edited or deleted.
    internalNotes: [internalNoteSchema],
  },
  {
    // Automatically manages createdAt and updatedAt
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
ticketSchema.index({ requester: 1 });
ticketSchema.index({ department: 1, status: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ documentId: 1 }, { unique: true });
ticketSchema.index({ 'sharedWith.department': 1 });

// ─── Hooks ────────────────────────────────────────────────────────────────────
// Ensure ownerDepartment is always set from department on first save.
ticketSchema.pre('save', function (next) {
  if (!this.ownerDepartment && this.department) {
    this.ownerDepartment = this.department;
  }
  next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
