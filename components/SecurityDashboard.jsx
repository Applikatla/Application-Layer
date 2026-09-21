'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Users, 
  Radio, 
  RefreshCw, 
  Unlock, 
  CheckCircle2, 
  AlertOctagon
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

export const SecurityDashboard = () => {
  const { telemetry, incidents: socketIncidents } = useSocket();

  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, sessionsRes, incidentsRes] = await Promise.all([
        fetch('/api/security/stats'),
        fetch('/api/security/sessions'),
        fetch('/api/security/incidents'),
      ]);

      const [statsData, sessionsData, incidentsData] = await Promise.all([
        statsRes.json(),
        sessionsRes.json(),
        incidentsRes.json(),
      ]);

      setStats(statsData);
      setSessions(sessionsData);
      setIncidents(incidentsData);
    } catch (err) {
      console.error('Failed to load SOC dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Merge any live socket incidents that just arrived
  useEffect(() => {
    if (socketIncidents && socketIncidents.length > 0) {
      setIncidents((prev) => {
        const ids = new Set(prev.map((i) => i.incidentId));
        const newOnes = socketIncidents.filter((i) => !ids.has(i.incidentId));
        if (newOnes.length > 0) {
          return [...newOnes, ...prev];
        }
        return prev;
      });
    }
  }, [socketIncidents]);

  const handleUnblock = async (sessionOrIncident) => {
    try {
      const res = await fetch('/api/security/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: sessionOrIncident.key,
          ip: sessionOrIncident.ip || sessionOrIncident.attackerIp,
          incidentId: sessionOrIncident.incidentId,
        }),
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to unblock target:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (score >= 40) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
  };

  const getScoreBarColor = (score) => {
    if (score >= 75) return 'bg-red-500';
    if (score >= 40) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#202d4a] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Security Operations Center (SOC)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Application-Layer Anomaly Detection & Threat Mitigation Console
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111726] border border-[#202d4a] text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Monitored Sessions</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-white">
            {stats ? stats.activeSessionsCount : sessions.length}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Telemetry window: 60s</span>
        </div>

        <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-emerald-400 font-medium">🟢 Normal Users</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {stats ? stats.normalCount : sessions.filter((s) => s.classification === 'normal').length}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Risk Score 0 – 39 (Allowed)</span>
        </div>

        <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-400 font-medium">🟡 Suspicious Sessions</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-400">
            {stats ? stats.suspiciousCount : sessions.filter((s) => s.classification === 'suspicious').length}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Risk Score 40 – 74 (Challenged)</span>
        </div>

        <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-red-400 font-medium">🔴 Blocked Attackers</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-red-400">
            {stats ? stats.blockedCount : sessions.filter((s) => s.classification === 'blocked').length}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Risk Score 75 – 100 (Blocked)</span>
        </div>
      </div>

      {/* Main Grid: Threat Radar & Live Session Scoreboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Threat Radar (5 Cols) */}
        <div className="lg:col-span-5 bg-[#111726] border border-[#202d4a] rounded-2xl p-5 flex flex-col h-[520px]">
          <div className="flex items-center justify-between border-b border-[#202d4a] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white">Live Threat Radar Feed</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              Live Stream Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            {telemetry.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-40 animate-spin" />
                Listening for incoming application-layer activity...
              </div>
            ) : (
              telemetry.map((event, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border transition-all ${
                    event.classification === 'blocked'
                      ? 'bg-red-500/10 border-red-500/40 text-red-300'
                      : event.classification === 'suspicious'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-[#0a0d14] border-[#202d4a] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] ${
                        event.classification === 'blocked'
                          ? 'bg-red-500 text-black'
                          : event.classification === 'suspicious'
                          ? 'bg-amber-400 text-black'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {event.classification}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      <span className="text-cyan-400 font-bold">{event.method}</span> {event.endpoint}
                    </span>
                    <span className={`font-bold ${event.statusCode >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {event.statusCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/80">
                    <span>IP: {event.ip} ({event.username || 'anon'})</span>
                    <span className="font-bold">Risk: {event.riskScore} / 100</span>
                  </div>

                  {event.threats && event.threats.length > 0 && (
                    <div className="mt-1 text-[10px] text-red-400 font-sans font-semibold">
                      ⚠️ {event.threats.join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Sessions & Risk Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111726] border border-[#202d4a] rounded-2xl p-5 flex flex-col h-[520px]">
          <div className="flex items-center justify-between border-b border-[#202d4a] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Active Sessions & Dynamic Risk Matrix</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Sliding Window: 60s</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs">
                No active user sessions recorded in the sliding window.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#202d4a] text-slate-400 text-[11px]">
                    <th className="pb-2">Session / IP</th>
                    <th className="pb-2">User</th>
                    <th className="pb-2">Risk Score</th>
                    <th className="pb-2">State</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sessions.map((sess, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-3 text-slate-300">{sess.ip}</td>
                      <td className="py-3 text-slate-200 capitalize">{sess.username || 'anonymous'}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#0a0d14] h-2 rounded-full overflow-hidden border border-slate-700">
                            <div
                              className={`h-full ${getScoreBarColor(sess.currentRiskScore)}`}
                              style={{ width: `${sess.currentRiskScore}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px]">{sess.currentRiskScore}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getScoreColor(
                            sess.currentRiskScore
                          )}`}
                        >
                          {sess.classification}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {sess.classification === 'blocked' ? (
                          <button
                            onClick={() => handleUnblock(sess)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-[10px] font-sans font-semibold transition-all inline-flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            Unblock
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">Monitoring</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Forensic Incidents Section */}
      <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-400" />
            <div>
              <h2 className="text-base font-bold text-white">Forensic Incident Registry</h2>
              <p className="text-xs text-slate-400">Chronological ledger of application-layer attacks detected and blocked</p>
            </div>
          </div>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
            No active security incidents recorded. System running normally.
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.incidentId}
                className="bg-[#0a0d14] border border-red-500/30 rounded-xl p-4 transition-all hover:border-red-500/50"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-500 text-black font-bold font-mono text-[10px]">
                      {incident.incidentId}
                    </span>
                    <span className="text-sm font-bold text-white">{incident.attackType}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">{new Date(incident.timestamp).toLocaleString()}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        incident.status === 'active_blocked'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {incident.status === 'active_blocked' ? 'Active Block' : 'Resolved'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono mb-3">
                  <div>
                    <span className="text-slate-500 block">Attacker IP / Target</span>
                    <span className="text-slate-300 font-bold">
                      {incident.attackerIp} ({incident.username})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Peak Risk Score</span>
                    <span className="text-red-400 font-bold">{incident.riskScore} / 100</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Trigger Decision</span>
                    <span className="text-slate-300">{incident.triggerReason}</span>
                  </div>
                </div>

                {/* Evidence sequence */}
                {incident.forensicDetails?.threats?.[0]?.evidence?.sequence && (
                  <div className="bg-[#111726] border border-[#202d4a] rounded-lg p-2.5 text-xs font-mono mb-3">
                    <span className="text-amber-400 text-[11px] font-bold block mb-1">
                      Identified Sequential Traversal Path:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap text-slate-300">
                      {incident.forensicDetails.threats[0].evidence.sequence.map((acc, i, arr) => (
                        <React.Fragment key={i}>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            Account #{acc}
                          </span>
                          {i < arr.length - 1 && <span className="text-slate-500">&rarr;</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {incident.status === 'active_blocked' && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleUnblock(incident)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Resolve Incident & Unblock Client
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
