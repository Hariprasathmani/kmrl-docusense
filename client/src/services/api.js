// services/api.js â€” Axios instance with auth interceptors
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30_000,
});

// Request interceptor — attach token if present + disable cache
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kmrl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Disable caching for GET requests to ensure fresh data on auto-refresh
  if (config.method === 'get') {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kmrl_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
