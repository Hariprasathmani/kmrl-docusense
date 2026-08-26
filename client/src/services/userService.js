// services/userService.js — User Management API helpers
import api from './api';

export const userService = {
  /**
   * GET /api/users
   * @param {Object} params — { search, department, status, page, limit }
   */
  getAll: (params = {}) => api.get('/users', { params }),

  /**
   * GET /api/users/:id
   */
  getById: (id) => api.get(`/users/${id}`),

  /**
   * POST /api/users
   * Creates a new Department Officer.
   * @param {{ name, email, password, department, status }} data
   */
  create: (data) => api.post('/users', data),

  /**
   * PATCH /api/users/:id
   * Updates name, email, department, or status.
   * @param {string} id
   * @param {{ name?, email?, department?, status? }} data
   */
  update: (id, data) => api.patch(`/users/${id}`, data),

  /**
   * PATCH /api/users/:id/toggle-status
   * Sets status to 'Active' or 'Inactive'.
   * @param {string} id
   * @param {'Active'|'Inactive'} status
   */
  toggleStatus: (id, status) => api.patch(`/users/${id}/toggle-status`, { status }),

  /**
   * DELETE /api/users/:id
   * Soft-deletes (sets status = Inactive) the user.
   */
  remove: (id) => api.delete(`/users/${id}`),
};
