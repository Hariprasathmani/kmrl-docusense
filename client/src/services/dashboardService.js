// services/dashboardService.js — Dashboard API helpers
import api from './api';

export const dashboardService = {
  /** GET /api/dashboard/stats — All authenticated users */
  getStats:     () => api.get('/dashboard/stats'),

  /** GET /api/dashboard/analytics — Admin only */
  getAnalytics: () => api.get('/dashboard/analytics'),
};
