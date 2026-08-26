// context/AuthContext.jsx — Authentication context and provider
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount — read stored user data from localStorage
  useEffect(() => {
    const token    = localStorage.getItem('kmrl_token');
    const userData = localStorage.getItem('kmrl_user');
    if (token && userData) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(JSON.parse(userData));
      } catch {
        localStorage.removeItem('kmrl_token');
        localStorage.removeItem('kmrl_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    // Server returns: { success, token, data: { id, name, email, role, department } }
    const { data } = await api.post('/auth/login', { email, password });
    const { token } = data;
    const userData  = data.data;          // ← correct key (was data.user before)
    localStorage.setItem('kmrl_token', token);
    localStorage.setItem('kmrl_user',  JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('kmrl_token');
    localStorage.removeItem('kmrl_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
