// services/documentService.js — Document API helpers
import api from './api';

export const documentService = {
  getAll:     (params) => api.get('/documents', { params }),
  getById:    (id)     => api.get(`/documents/${id}`),
  upload:     (formData, config = {}) =>
    api.post('/documents/upload', formData, config),
  update:     (id, data) => api.patch(`/documents/${id}`, data),
  remove:     (id)       => api.delete(`/documents/${id}`),
  download:   (id)       => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  share:      (id, data) => api.post(`/documents/${id}/share`, data),
  unshare:    (id, dept) => api.delete(`/documents/${id}/share/${dept}`),
};
