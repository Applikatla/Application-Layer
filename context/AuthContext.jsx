'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('alad_token');
    }
    setToken(null);
    setUser(null);
  };

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
      } else {
        // If token is invalid or expired, reset
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('alad_token');
      if (savedToken) {
        setToken(savedToken);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return { 
          success: false, 
          error: data.message || data.error || 'Authentication failed' 
        };
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('alad_token', data.token);
      }
      setToken(data.token);
      setUser(data.user);
      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const quickLogin = async (username, password) => {
    return await login(username, password);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, quickLogin, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
