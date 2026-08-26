// routes/ticketRoutes.js — Ticket Management endpoints
'use strict';

const express = require('express');
const router  = express.Router();

const {
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
} = require('../controllers/ticketController');

const { protect, authorize } = require('../middleware/auth');

// All ticket routes require authentication
router.use(protect);

// ── List & Detail ─────────────────────────────────────────────────────────────
router.get('/',    getTickets);
router.get('/my',  getMyTickets);
router.post('/leave-request', createLeaveRequest);

// ── Mutations (specific routes first) ──────────────────────────────────────────
// Specific routes with additional path segments (must come BEFORE /:id routes)
router.post( '/:id/resolution-email/retry', authorize('Admin'), retryResolutionEmail);
router.patch('/:id/resolve-leave', authorize('Admin', 'Department Officer'), resolveLeaveRequest);
router.patch('/:id/status',   updateStatus);
router.patch('/:id/resolve',  authorize('Admin', 'Department Officer'), resolveTicket);
router.patch('/:id/assign',   authorize('Admin'), assignTicket);
router.patch('/:id/share',    shareTicket);
router.delete('/:id/share/:department', unshareTicket);
router.post('/:id/notes', addInternalNote);
router.patch('/:id/priority', authorize('Admin'), updatePriority);
router.patch('/:id/close',    authorize('Admin'), closeTicket);
router.delete('/:id',         authorize('Admin'), deleteTicket);

// ── Detail (generic /:id route last) ───────────────────────────────────────────
router.get('/:id', getTicketById);

module.exports = router;
