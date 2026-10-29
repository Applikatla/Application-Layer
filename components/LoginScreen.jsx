'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  User, 
  Key, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Server, 
  Database,
  CheckCircle2,
  Terminal,
  Activity,
  LogIn
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const LoginScreen = ({ onLoginSuccess }) => {
  const { user, login, logout, loading: authLoading } = useAuth();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        setSuccessMsg(`Welcome, ${result.user.name || result.user.username}! Authenticated successfully.`);
        if (onLoginSuccess) {
          setTimeout(() => {
            onLoginSuccess(result.user);
          }, 400);
        }
      } else {
        setError(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (presetUser, presetPass, autoSubmit = false) => {
    setUsername(presetUser);
    setPassword(presetPass);
    setError(null);
    setSuccessMsg(null);

    if (autoSubmit) {
      setIsSubmitting(true);
      login(presetUser, presetPass).then((result) => {
        setIsSubmitting(false);
        if (result.success) {
          setSuccessMsg(`Welcome, ${result.user.name || result.user.username}!`);
          if (onLoginSuccess) {
            setTimeout(() => onLoginSuccess(result.user), 300);
          }
        } else {
          setError(result.error || 'Quick login failed');
        }
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Header / Brand Card */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-xl shadow-cyan-500/20 ring-1 ring-white/20 mb-2">
            <Shield className="w-9 h-9 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            ALAD Security Portal
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Application-Layer Attack Detection system with zero-database in-memory state engine.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Server className="w-3 h-3 text-cyan-400" />
              In-Memory Auth
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Database className="w-3 h-3 text-emerald-400" />
              Zero Database Required
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              Stateful Threat IDS
            </span>
          </div>
        </div>

        {/* Logged In Info Banner if already authenticated */}
        {user && (
          <div className="bg-[#111726] border border-cyan-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold">
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-slate-400">Currently active session</p>
                <p className="text-sm font-semibold text-white">
                  {user.name || user.username} <span className="text-xs font-mono text-cyan-400">({user.role})</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLoginSuccess && onLoginSuccess(user)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-black hover:bg-cyan-400 transition"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Main Login Card */}
        <div className="bg-[#111726]/95 backdrop-blur-xl border border-[#202d4a] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <LogIn className="w-5 h-5 text-cyan-400" />
              Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your credentials below or select a one-click preset test user.
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs animate-shake">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Error</p>
                <p className="mt-0.5 text-red-300/90">{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Access Granted</p>
                <p className="mt-0.5 text-emerald-300/90">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Username
              </label>
              <div className="relative rounded-xl shadow-inner">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or alice"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0d14] border border-[#202d4a] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition font-sans"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Default Admin: admin123
                </span>
              </div>
              <div className="relative rounded-xl shadow-inner">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. admin123"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0a0d14] border border-[#202d4a] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In & Authenticate</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Test Presets */}
          <div className="pt-4 border-t border-[#202d4a] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Quick Test Auth (No Database Required)
              </span>
              <span className="text-[10px] text-slate-500">Click to fill & login</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Admin Preset Card */}
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123', true)}
                className="p-3 text-left rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">Admin</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200">
                      SOC
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">admin / admin123</p>
                </div>
                <div className="mt-2 text-[10px] text-purple-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-medium">
                  Login as Admin &rarr;
                </div>
              </button>

              {/* Alice Preset Card */}
              <button
                type="button"
                onClick={() => handleQuickFill('alice', 'password123', true)}
                className="p-3 text-left rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">Alice</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200">
                      #101
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">alice / password123</p>
                </div>
                <div className="mt-2 text-[10px] text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-medium">
                  Login as Alice &rarr;
                </div>
              </button>

              {/* Bob Preset Card */}
              <button
                type="button"
                onClick={() => handleQuickFill('bob', 'password123', true)}
                className="p-3 text-left rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300">Bob</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200">
                      #102
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">bob / password123</p>
                </div>
                <div className="mt-2 text-[10px] text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-medium">
                  Login as Bob &rarr;
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security IDS Notice */}
        <div className="p-4 rounded-xl bg-[#0d121f] border border-[#202d4a]/80 text-[11px] text-slate-400 flex items-start gap-3">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-300 font-medium">Internal State Telemetry Active:</span>{' '}
            Login attempts trigger velocity and credential stuffing analysis in the sliding window.
            Admin credentials grant privilege escalation to SOC incident unblocking and audit vault telemetry.
          </div>
        </div>

      </div>
    </div>
  );
};

