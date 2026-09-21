'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Send, 
  Search, 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle,
  Lock,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

export const BankingApp = ({ onNavigateToSimulator, onNavigateToSoc }) => {
  const { user, token, fetchProfile } = useAuth();
  const { userStates } = useSocket();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transferTarget, setTransferTarget] = useState('102');
  const [transferAmount, setTransferAmount] = useState('150');
  const [transferStatus, setTransferStatus] = useState(null);

  // Inspector / IDOR probe testing
  const [probeAccountId, setProbeAccountId] = useState('102');
  const [probedAccountData, setProbedAccountData] = useState(null);
  const [probeError, setProbeError] = useState(null);

  // User live risk status
  const userKey = user ? `user:${user.id || user._id}` : null;
  const liveState = userKey && userStates[userKey] ? userStates[userKey] : null;
  const classification = liveState ? liveState.classification : (user?.status || 'normal');
  const riskScore = liveState ? liveState.currentRiskScore : (user?.riskScore || 0);

  const fetchMyAccount = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const accNum = user?.accountNumber || '101';
      const res = await fetch(`/api/accounts/${accNum}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAccount(data);
      } else if (data.classification === 'blocked') {
        if (fetchProfile) fetchProfile(token);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAccount();
  }, [user, token]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferStatus({ type: 'loading', message: 'Processing internal ledger transfer...' });
    try {
      const res = await fetch('/api/accounts/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromAccount: account?.accountNumber || '101',
          toAccount: transferTarget,
          amount: parseFloat(transferAmount),
          description: `Online Transfer to #${transferTarget}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTransferStatus({ type: 'success', message: data.message });
        fetchMyAccount();
      } else {
        setTransferStatus({ type: 'error', message: data.message || data.error });
      }
    } catch (err) {
      setTransferStatus({ type: 'error', message: err.message });
    }
  };

  const handleProbeAccount = async (targetId) => {
    const idToProbe = targetId || probeAccountId;
    setProbeError(null);
    setProbedAccountData(null);
    try {
      const res = await fetch(`/api/accounts/${idToProbe}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProbedAccountData(data);
      } else {
        setProbeError(data);
        if (data.classification === 'blocked') {
          if (fetchProfile) fetchProfile(token);
        }
      }
    } catch (err) {
      setProbeError({ error: err.message });
    }
  };

  // If user is BLOCKED by the security engine, render security lockout screen!
  if (classification === 'blocked') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-[#161f33] border-2 border-red-500/50 rounded-2xl p-8 shadow-2xl shadow-red-900/30 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-5 animate-pulse">
            <ShieldAlert className="w-9 h-9 stroke-[2.5]" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            ACCESS DENIED: SESSION TERMINATED
          </h2>
          <p className="text-sm text-red-300 font-mono mb-6">
            HTTP 403 FORBIDDEN — APPLICATION-LAYER THREAT DETECTED
          </p>

          <div className="bg-[#0d1322] border border-red-500/30 rounded-xl p-5 max-w-xl mx-auto text-left mb-6 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
              <span className="text-slate-400">Security Engine Decision:</span>
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">🔴 BLOCKED</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <p><span className="text-slate-500">Risk Score:</span> <span className="text-red-400 font-bold">{riskScore} / 100</span></p>
              <p><span className="text-slate-500">Active Identity:</span> {user?.username} (Account #{user?.accountNumber})</p>
              <p><span className="text-slate-500">Trigger Reason:</span> Application state analysis identified sequential object traversal (Account Enumeration / IDOR).</p>
              <p><span className="text-slate-500">Enforcement Action:</span> Session JWT blacklisted. IP throttled. SOC incident logged.</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6 max-w-lg mx-auto">
            Traditional perimeter firewalls permitted these requests because the HTTP syntax was valid. However, our internal application state monitor identified malicious sequential navigation.
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={onNavigateToSoc}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-semibold text-xs hover:bg-cyan-400 flex items-center gap-2 transition-all"
            >
              Inspect Incident in SOC Dashboard
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={async () => {
                await fetch('/api/simulation/reset', { method: 'POST' });
                if (fetchProfile) fetchProfile(token);
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs hover:bg-slate-700 flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Session & Unblock
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Suspicious Banner if user is in Yellow state */}
      {classification === 'suspicious' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">Security Warning: Behavioral Anomaly Detected</p>
              <p className="text-xs text-amber-200/80">
                Current Risk Score: <span className="font-mono font-bold">{riskScore} / 100</span>. Responses are delayed by 350ms. Further suspicious queries will trigger an automated session block.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToSoc}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all"
          >
            View SOC Radar
          </button>
        </div>
      )}

      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111726] border border-[#202d4a] rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-cyan-400">Apex Secure Banking Portal</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">Target Monitored Application</span>
          </div>
          <h1 className="text-xl font-bold text-white">
            Welcome back, {user ? user.name : 'Customer'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Primary Account: <span className="font-mono text-cyan-300">#{account?.accountNumber || user?.accountNumber || '101'}</span> ({account?.accountType || 'Savings'})
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#0a0d14] p-3 rounded-xl border border-[#202d4a]">
          <div>
            <span className="text-[11px] text-slate-400 block">Available Balance</span>
            <span className="text-2xl font-bold font-mono text-white">
              ${account ? account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '12,450.00'}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <span className="text-[11px] text-slate-400 block">Application Security Posture</span>
            <span className={`text-xs font-bold capitalize ${
              classification === 'normal' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {classification === 'normal' ? '🟢 Normal Behavior' : '🟡 Under Observation'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Transfer & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Transfer Card */}
          <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Instant Ledger Transfer</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Zero Fee Intra-Bank</span>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5">Destination Account Number</label>
                  <select
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-[#202d4a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="102">Account #102 (Bob Johnson)</option>
                    <option value="103">Account #103 (Charlie Davis)</option>
                    <option value="104">Account #104 (Diana Prince)</option>
                    <option value="105">Account #105 (Eve Miller)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5">Transfer Amount (USD)</label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-[#202d4a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    placeholder="100.00"
                    min="1"
                  />
                </div>
              </div>

              {transferStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  transferStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/10 text-red-300 border border-red-500/30'
                }`}>
                  {transferStatus.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  {transferStatus.message}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-semibold text-xs hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20"
              >
                Execute Secure Transfer
              </button>
            </form>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Account Ledger History
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#202d4a] text-slate-400">
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {account?.recentTransactions?.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-3 text-slate-200 flex items-center gap-2">
                        {tx.type === 'credit' ? (
                          <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded-md bg-red-500/10 text-red-400">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span>{tx.description}</span>
                      </td>
                      <td className="py-3 text-slate-400 text-[11px]">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className={`py-3 text-right font-bold ${
                        tx.type === 'credit' ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Account Lookup / IDOR Attack Trigger Demonstration */}
        <div className="space-y-6">
          <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Account Inspector Tool</h2>
            </div>
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
              Use this tool to test <span className="text-amber-300 font-medium">Account Enumeration (101 &rarr; 105)</span> directly within the application. Clicking accounts sequentially triggers the internal state detection engine!
            </p>

            <div className="space-y-2 mb-4">
              <span className="text-[11px] text-slate-400 block font-mono">Quick Probe Buttons:</span>
              <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
                {['101', '102', '103', '104', '105'].map((accNum) => (
                  <button
                    key={accNum}
                    onClick={() => {
                      setProbeAccountId(accNum);
                      handleProbeAccount(accNum);
                    }}
                    className={`py-1.5 rounded-lg border text-center transition-all ${
                      accNum === account?.accountNumber
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-[#0a0d14] border-[#202d4a] text-slate-300 hover:border-amber-500/40 hover:text-amber-300'
                    }`}
                  >
                    #{accNum}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={probeAccountId}
                onChange={(e) => setProbeAccountId(e.target.value)}
                placeholder="Account # (e.g. 103)"
                className="w-full bg-[#0a0d14] border border-[#202d4a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                onClick={() => handleProbeAccount()}
                className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              >
                Inspect #
              </button>
            </div>

            {/* Probed Details Card */}
            {probedAccountData && (
              <div className="bg-[#0a0d14] border border-[#202d4a] rounded-xl p-3 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-1.5 mb-1.5">
                  <span>Queried Account:</span>
                  <span className="text-cyan-300 font-bold">#{probedAccountData.accountNumber}</span>
                </div>
                <p className="text-slate-300"><span className="text-slate-500">Holder:</span> {probedAccountData.holderName}</p>
                <p className="text-slate-300"><span className="text-slate-500">Balance:</span> ${probedAccountData.balance.toFixed(2)}</p>
                <p className="text-slate-300"><span className="text-slate-500">Type:</span> {probedAccountData.accountType}</p>
              </div>
            )}

            {probeError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs font-mono text-red-300">
                <p className="font-bold">{probeError.error}</p>
                <p className="text-[11px] text-red-300/80">{probeError.message}</p>
              </div>
            )}
          </div>

          {/* Test Admin Route (Privilege Escalation) */}
          <div className="bg-[#111726] border border-[#202d4a] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Privileged Vault</h2>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Restricted to SOC administrators. Normal users attempting access will trigger Privilege Escalation detection.
            </p>
            <button
              onClick={async () => {
                const res = await fetch('/api/admin/system-config', {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok && data.classification === 'blocked') {
                  if (fetchProfile) fetchProfile(token);
                } else {
                  alert(res.ok ? 'Admin access granted' : `Probing Flagged: ${data.message}`);
                }
              }}
              className="w-full py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-xs font-semibold transition-all"
            >
              Test Access to /api/admin/system-config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
