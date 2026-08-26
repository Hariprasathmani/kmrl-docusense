// services/ticketService.js — Ticket API helpers
import api from './api';

export const ticketService = {
  /** GET /api/tickets — list with optional filters */
  getAll: (params) => api.get('/tickets', { params }),

  /** GET /api/tickets/my — list requester's own tickets */
  getMyTickets: (params) => api.get('/tickets/my', { params }),

  /** GET /api/tickets/:id — full ticket detail */
  getById: (id) => api.get(`/tickets/${id}`),

  /** PATCH /api/tickets/:id/status — change lifecycle status */
  updateStatus: (id, status) => api.patch(`/tickets/${id}/status`, { status }),

  /** PATCH /api/tickets/:id/resolve — owner dept only */
  resolve: (id, resolutionMessage) => api.patch(`/tickets/${id}/resolve`, { resolutionMessage }),

  /** POST /api/tickets/:id/resolution-email/retry — Admin only */
  retryResolutionEmail: (id) => api.post(`/tickets/${id}/resolution-email/retry`),

  /**
   * PATCH /api/tickets/:id/assign — Admin only
   * userId: ObjectId string → assign/reassign
   * userId: null            → unassign
   */
  assign: (id, userId) => api.patch(`/tickets/${id}/assign`, { userId: userId ?? null }),

  /**
   * PATCH /api/tickets/:id/share
   * Share with a collaborating department for assistance.
   * Body: { department: 'Finance', reason: '...' }
   */
  share: (id, department, reason) =>
    api.patch(`/tickets/${id}/share`, { department, reason }),

  /**
   * DELETE /api/tickets/:id/share/:department
   * Remove a department from the sharedWith list.
   */
  unshare: (id, department) =>
    api.delete(`/tickets/${id}/share/${department}`),

  /**
   * POST /api/tickets/:id/notes
   * Add an internal note (owner + collaborating depts).
   * Body: { content: '...' }
   */
  addNote: (id, content) => api.post(`/tickets/${id}/notes`, { content }),

  /** PATCH /api/tickets/:id/priority — Admin only */
  updatePriority: (id, priority) => api.patch(`/tickets/${id}/priority`, { priority }),

  /** PATCH /api/tickets/:id/close — Admin only */
  close: (id) => api.patch(`/tickets/${id}/close`),

  /** DELETE /api/tickets/:id — Admin only. Permanently delete a ticket. */
  delete: (id) => api.delete(`/tickets/${id}`),

  /** POST /api/tickets/leave-request — Create a new leave request */
  createLeaveRequest: (leaveType, startDate, endDate, reason, attachmentId) =>
    api.post('/tickets/leave-request', {
      leaveType,
      startDate,
      endDate,
      reason,
      attachmentId,
    }),

  /** PATCH /api/tickets/:id/resolve-leave — Approve or reject a leave request (HR only) */
  resolveLeaveRequest: (id, action, resolutionMessage) =>
    api.patch(`/tickets/${id}/resolve-leave`, {
      action, // 'approve' | 'reject'
      resolutionMessage,
    }),
};

/**
 * GET /api/users/officers/:department
 * Returns active Department Officers for one dept — used by assignment dropdown.
 * Admin only.
 */
export const getOfficersByDepartment = (department) =>
  api.get(`/users/officers/${department}`);
