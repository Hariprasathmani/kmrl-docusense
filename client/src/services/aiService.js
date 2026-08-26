// services/aiService.js — AI feature API helpers
import api from './api';

export const aiService = {
  summarize: (docId)  => api.post(`/ai/summarize/${docId}`),
  classify:  (docId)  => api.post(`/ai/classify/${docId}`),
  extract:   (docId)  => api.post(`/ai/extract/${docId}`),
  query:     (prompt, documentIds) => api.post('/ai/query', { prompt, documentIds }),
};
