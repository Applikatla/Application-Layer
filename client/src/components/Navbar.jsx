import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Activity, Terminal, Lock, User, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const Navbar = ({ currentTab, setCurrentTab }) => {
  const { user, quickLogin, logout } = useAuth();
  const { connected, userStates } = useSocket();

  // Find user's live risk state from SocketContext or user record
  const userKey = user ? `user:${user.id || user._id}` : null;
  const liveState = userKey && userStates[userKey] ? userStates[userKey] : null;
  const classification = liveState ? liveState.classification : (user?.status || 'normal');
  const riskScore = liveState ? liveState.currentRiskScore : (user?.riskScore || 0);

  const getStatusBadge = () => {
    if (classification === 'blocked') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          🔴 ATTACKER BLOCKED ({riskScore})
        </span>
      );
    }
    if (classification === 'suspicious') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          🟡 SUSPICIOUS ({riskScore})
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        🟢 NORMAL ({riskScore})
      </span>
    );
  };

  return (
    <header className="border-b border-[#202d4a] bg-[#111726]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide text-white">ALAD System</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Internal State IDS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Application-Layer Threat Detection Engine</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-[#0a0d14]/70 p-1 rounded-xl border border-[#202d4a]">
            <button
              onClick={() => setCurrentTab('banking')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'banking'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Demo Banking App
            </button>

            <button
              onClick={() => setCurrentTab('soc')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'soc'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              SOC Dashboard
            </button>

            <button
              onClick={() => setCurrentTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'simulator'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Attack Simulator
            </button>
          </nav>

          {/* Right Controls: User Switcher & Status */}
          <div className="flex items-center gap-3">
            {getStatusBadge()}

            {/* Quick Persona Switcher */}
            <div className="flex items-center gap-1.5 bg-[#0a0d14] px-2 py-1 rounded-lg border border-[#202d4a] text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-medium capitalize">{user ? user.username : 'Guest'}</span>
              <div className="h-3 w-px bg-slate-700 mx-1" />
              <button
                onClick={() => quickLogin('alice', 'password123')}
                title="Switch to Alice (#101 Customer)"
                className="px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-800 text-cyan-400"
              >
                Alice
              </button>
              <button
                onClick={() => quickLogin('bob', 'password123')}
                title="Switch to Bob (#102 Customer)"
                className="px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-800 text-cyan-400"
              >
                Bob
              </button>
              <button
                onClick={() => quickLogin('admin', 'admin123')}
                title="Switch to SOC Admin"
                className="px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-800 text-purple-400"
              >
                Admin
              </button>
            </div>

            {/* WebSocket status indicator */}
            <div
              title={connected ? 'Connected to Real-Time SOC Stream' : 'WebSocket Disconnected'}
              className="flex items-center gap-1 text-[11px] text-slate-400"
            >
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
