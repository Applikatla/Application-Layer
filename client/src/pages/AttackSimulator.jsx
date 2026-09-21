import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  RotateCcw, 
  ShieldAlert, 
  Key, 
  FolderSearch, 
  Zap, 
  Lock, 
  CheckCircle, 
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AttackSimulator = ({ onNavigateToSoc }) => {
  const { token, fetchProfile } = useAuth();

  const [consoleLogs, setConsoleLogs] = useState([
    { text: '[SIMULATOR] Attack workbench ready. Choose an attack vector to launch.', type: 'info' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeVector, setActiveVector] = useState(null);

  const addLog = (text, type = 'info') => {
    setConsoleLogs((prev) => [...prev, { text, type, time: new Date().toLocaleTimeString() }]);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Reset Environment
  const handleReset = async () => {
    setIsRunning(true);
    addLog('[ACTION] Resetting client risk state and incident records...', 'info');
    try {
      const res = await fetch('/api/simulation/reset', { method: 'POST' });
      const data = await res.json();
      addLog(`[SUCCESS] ${data.message}`, 'success');
      addLog('[STATE] Client classification reset to NORMAL (🟢 Score: 0)', 'success');
      if (fetchProfile) fetchProfile(token);
    } catch (err) {
      addLog(`[ERROR] Failed to reset: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Attack 1: Account Enumeration (IDOR Sweep 101 -> 105)
  const runEnumerationAttack = async () => {
    setIsRunning(true);
    setActiveVector('enumeration');
    addLog('------------------------------------------------------------', 'info');
    addLog('[ATTACK INITIATED] Account Enumeration / IDOR Sweep (101 -> 105)', 'warning');
    addLog('[EXPLANATION] Attacker probes incrementing customer account IDs to harvest data.', 'info');

    const accounts = ['101', '102', '103', '104', '105', '106'];

    for (const acc of accounts) {
      addLog(`[HTTP REQ] GET /api/accounts/${acc}...`, 'info');
      try {
        const res = await fetch(`/api/accounts/${acc}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Automated-Scanner-v2.1',
          },
        });
        const data = await res.json();

        if (res.status === 200) {
          addLog(`[HTTP RES] Status: 200 OK | Accessed: Account #${acc} (${data.holderName})`, 'success');
        } else if (res.status === 403) {
          addLog(`[BLOCKED 🔴] HTTP 403 Forbidden | Reason: ${data.message}`, 'error');
          addLog(`[SECURITY ENGINE] Attack neutralized! Score: ${data.riskScore}/100. Session terminated.`, 'error');
          break;
        } else {
          addLog(`[HTTP RES] Status: ${res.status} | ${data.message || data.error}`, 'warning');
        }
      } catch (err) {
        addLog(`[ERROR] Request failed: ${err.message}`, 'error');
      }
      await delay(250); // Fast scripted interval
    }

    if (fetchProfile) fetchProfile(token);
    setIsRunning(false);
  };

  // Attack 2: Credential Stuffing / Brute Force
  const runCredentialStuffing = async () => {
    setIsRunning(true);
    setActiveVector('stuffing');
    addLog('------------------------------------------------------------', 'info');
    addLog('[ATTACK INITIATED] Credential Stuffing / Distributed Password Spraying', 'warning');
    addLog('[EXPLANATION] Attacker fires rapid authentication requests using leaked credentials.', 'info');

    const targetUsers = [
      { u: 'alice', p: 'badpass123' },
      { u: 'bob', p: 'summer2024!' },
      { u: 'charlie', p: 'qwerty999' },
      { u: 'admin', p: '12345678' },
      { u: 'frank', p: 'password' },
    ];

    for (const target of targetUsers) {
      addLog(`[HTTP REQ] POST /api/auth/login | Target: "${target.u}"`, 'info');
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: target.u, password: target.p }),
        });
        const data = await res.json();

        if (res.status === 401) {
          addLog(`[HTTP RES] 401 Unauthorized | Telemetry recorded auth failure`, 'warning');
        } else if (res.status === 403) {
          addLog(`[BLOCKED 🔴] HTTP 403 Forbidden | Reason: ${data.message}`, 'error');
          addLog(`[SECURITY ENGINE] Credential stuffing detected! Score: ${data.riskScore}/100`, 'error');
          break;
        }
      } catch (err) {
        addLog(`[ERROR] ${err.message}`, 'error');
      }
      await delay(200);
    }

    if (fetchProfile) fetchProfile(token);
    setIsRunning(false);
  };

  // Attack 3: Privilege Escalation Probing
  const runPrivilegeProbing = async () => {
    setIsRunning(true);
    setActiveVector('privilege');
    addLog('------------------------------------------------------------', 'info');
    addLog('[ATTACK INITIATED] Privilege Escalation Probing (Admin Routes)', 'warning');
    addLog('[EXPLANATION] Authenticated customer attempts to query confidential admin endpoints.', 'info');

    const endpoints = [
      '/api/admin/system-config',
      '/api/admin/users',
      '/api/admin/audit-vault',
    ];

    for (const ep of endpoints) {
      addLog(`[HTTP REQ] GET ${ep}...`, 'info');
      try {
        const res = await fetch(ep, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.status === 403) {
          if (data.error === 'SECURITY_BLOCK') {
            addLog(`[BLOCKED 🔴] HTTP 403 Forbidden | Session terminated by Security Engine`, 'error');
            addLog(`[SECURITY ENGINE] Score: ${data.riskScore}/100. Attacker isolated.`, 'error');
            break;
          } else {
            addLog(`[HTTP RES] 403 Forbidden | Controller rejected unauthorized role`, 'warning');
          }
        }
      } catch (err) {
        addLog(`[ERROR] ${err.message}`, 'error');
      }
      await delay(250);
    }

    if (fetchProfile) fetchProfile(token);
    setIsRunning(false);
  };

  // Attack 4: Hyper-Velocity Bot Scraping
  const runVelocityScraping = async () => {
    setIsRunning(true);
    setActiveVector('scraping');
    addLog('------------------------------------------------------------', 'info');
    addLog('[ATTACK INITIATED] Hyper-Velocity Bot Scraping (Burst 20 Requests)', 'warning');

    for (let i = 1; i <= 20; i++) {
      try {
        const res = await fetch(`/api/accounts/101`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.status === 403) {
          addLog(`[BLOCKED 🔴] Request #${i} blocked! Velocity threshold exceeded.`, 'error');
          break;
        } else if (i % 5 === 0) {
          addLog(`[BURST] Sent ${i} requests in < 500ms...`, 'info');
        }
      } catch (err) {
        // ignore
      }
      await delay(30); // 30ms inhuman velocity
    }

    if (fetchProfile) fetchProfile(token);
    setIsRunning(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#202d4a] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Interactive Attack Simulator</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Execute real-world application-layer attacks and observe state changes (🟢 Allow $\to$ 🟡 Warn $\to$ 🔴 Block)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Client State (Score: 0)
          </button>
        </div>
      </div>

      {/* 4 Attack Vector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vector 1 */}
        <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <FolderSearch className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Account Enumeration (IDOR)</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Rapidly traverses <span className="font-mono text-cyan-300">101 $\to$ 102 $\to$ 103 $\to$ 104 $\to$ 105</span>. Detected by sequential state analysis.
            </p>
          </div>
          <button
            onClick={runEnumerationAttack}
            disabled={isRunning}
            className="w-full py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Launch 101 $\to$ 105 Sweep
          </button>
        </div>

        {/* Vector 2 */}
        <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Credential Stuffing</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Sends rapid failed authentication attempts across varied usernames. Detected by auth failure burst rate.
            </p>
          </div>
          <button
            onClick={runCredentialStuffing}
            disabled={isRunning}
            className="w-full py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Launch Password Spray
          </button>
        </div>

        {/* Vector 3 */}
        <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Privilege Escalation</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Customer token attempts to scan forbidden admin endpoints (<span className="font-mono text-purple-300">/api/admin/*</span>).
            </p>
          </div>
          <button
            onClick={runPrivilegeProbing}
            disabled={isRunning}
            className="w-full py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Launch Admin Probe
          </button>
        </div>

        {/* Vector 4 */}
        <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-5 flex flex-col justify-between hover:border-red-500/40 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Hyper-Velocity Bot</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Sends 20 queries with &lt; 50ms interval, violating human navigation velocity baselines.
            </p>
          </div>
          <button
            onClick={runVelocityScraping}
            disabled={isRunning}
            className="w-full py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Launch Burst Attack
          </button>
        </div>
      </div>

      {/* Terminal Output Console */}
      <div className="bg-[#0a0d14] border border-[#202d4a] rounded-2xl p-5 flex flex-col h-80 font-mono text-xs shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-slate-400 text-[11px] ml-2 font-bold">Simulator Output Console</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setConsoleLogs([])}
              className="text-[11px] text-slate-500 hover:text-slate-300"
            >
              Clear Console
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
          {consoleLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-slate-600 text-[10px] shrink-0">{log.time || '--:--:--'}</span>
              <span className={`leading-relaxed ${
                log.type === 'error'
                  ? 'text-red-400 font-bold'
                  : log.type === 'warning'
                  ? 'text-amber-300 font-semibold'
                  : log.type === 'success'
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}>
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Educational Architecture Explanation */}
      <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Why Perimeter WAFs Fail vs How ALAD Detects This</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
          <div className="bg-[#0a0d14] p-4 rounded-xl border border-red-500/20">
            <span className="text-red-400 font-bold block mb-2">❌ Traditional Network WAF</span>
            <p className="text-slate-400">
              Only analyzes raw HTTP packet signatures (e.g. searching for SQL syntax `SELECT *` or script tags <code className="text-slate-300 font-mono">{'<script>'}</code>). When an attacker requests <span className="font-mono text-slate-200">GET /api/accounts/101</span>, <span className="font-mono text-slate-200">GET /api/accounts/102</span>, every single request is syntactically pristine HTTP, so the WAF allows it 100% of the time.
            </p>
          </div>

          <div className="bg-[#0a0d14] p-4 rounded-xl border border-emerald-500/20">
            <span className="text-emerald-400 font-bold block mb-2">✅ Application-Layer Internal State Detection</span>
            <p className="text-slate-400">
              Observes the internal user state: logged-in identity, assigned ownership, sequential access velocity ($101 \to 102 \to 103$), and error status counts. Within 3-4 requests, it mathematically flags monotonic traversal, escalates the Risk Score past 75, terminates the JWT session, and protects user data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
