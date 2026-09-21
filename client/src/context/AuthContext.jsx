import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('alad_token') || null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentToken) => {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      } else if (data.classification === 'blocked') {
        setUser((prev) => ({ ...prev, status: 'blocked', riskScore: data.riskScore || 100 }));
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      // Default auto-login as Alice for instant seamless demo experience
      quickLogin('alice', 'password123');
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || data.error };
      }
      localStorage.setItem('alad_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const quickLogin = async (username, password) => {
    setLoading(true);
    await login(username, password);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('alad_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, quickLogin, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
