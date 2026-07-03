import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // 1. Try checking admin session
      const adminRes = await api.get('/api/auth/me');
      if (adminRes.data && adminRes.data.success) {
        setAdmin(adminRes.data.admin);
        setUser(null);
        setLoading(false);
        return;
      }
    } catch (err) {
      // Not admin
    }

    try {
      // 2. Try checking standard user session
      const userRes = await api.get('/api/users/me');
      if (userRes.data && userRes.data.success) {
        setUser(userRes.data.user);
        setAdmin(null);
        setLoading(false);
        return;
      }
    } catch (err) {
      // Not user
    }

    // Reset both if checks failed
    setAdmin(null);
    setUser(null);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      if (response.data && response.data.success) {
        setAdmin(response.data.admin);
        setUser(null);
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials' };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed.';
      return { success: false, message: msg };
    }
  };

  const loginUser = async (email, password) => {
    try {
      const response = await api.post('/api/users/login', { email, password });
      if (response.data && response.data.success) {
        setUser(response.data.user);
        setAdmin(null);
        return { success: true };
      }
      return { success: false, message: 'Invalid email or password' };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed.';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      if (admin) {
        await api.post('/api/auth/logout');
      } else {
        await api.post('/api/users/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAdmin(null);
      setUser(null);
    }
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ admin, user, loading, login, loginUser, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
