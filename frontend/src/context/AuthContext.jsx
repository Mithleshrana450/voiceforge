import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle Google OAuth callback params in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const plan = params.get('plan');
    const error = params.get('error');

    if (token && name && email) {
      const userData = { id: Date.now().toString(), name: decodeURIComponent(name), email: decodeURIComponent(email), plan: plan || 'free', token, createdAt: new Date().toISOString() };
      setUser(userData);
      localStorage.setItem('vf_user', JSON.stringify(userData));
      // Clean URL
      window.history.replaceState({}, '', '/');
      setLoading(false);
      return;
    }

    if (error) {
      console.warn('Auth error:', error);
      window.history.replaceState({}, '', '/');
    }

    // Load from localStorage
    const stored = localStorage.getItem('vf_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Verify token is still valid
        setUser(parsed);
      } catch (_) {
        localStorage.removeItem('vf_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    const u = { ...userData, token };
    setUser(u);
    localStorage.setItem('vf_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vf_user');
  };

  const updateUser = (updates) => {
    const u = { ...user, ...updates };
    setUser(u);
    localStorage.setItem('vf_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;