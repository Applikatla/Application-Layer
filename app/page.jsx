'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { Navbar } from '@/components/Navbar';
import { BankingApp } from '@/components/BankingApp';
import { SecurityDashboard } from '@/components/SecurityDashboard';
import { AttackSimulator } from '@/components/AttackSimulator';
import { LoginScreen } from '@/components/LoginScreen';
import { Shield } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('login');

  // When user signs in, intelligently route to the most relevant view
  useEffect(() => {
    if (user && currentTab === 'login') {
      if (user.role === 'admin') {
        setCurrentTab('soc');
      } else {
        setCurrentTab('banking');
      }
    } else if (!user && !loading) {
      setCurrentTab('login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col items-center justify-center font-sans space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 animate-pulse">
          <Shield className="w-6 h-6 text-black stroke-[2.5]" />
        </div>
        <p className="text-sm font-medium text-slate-400 animate-pulse">
          Initializing ALAD Security Context...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1">
        {currentTab === 'login' && (
          <LoginScreen
            onLoginSuccess={(loggedInUser) => {
              if (loggedInUser.role === 'admin') {
                setCurrentTab('soc');
              } else {
                setCurrentTab('banking');
              }
            }}
          />
        )}

        {currentTab === 'banking' && (
          <BankingApp
            onNavigateToSimulator={() => setCurrentTab('simulator')}
            onNavigateToSoc={() => setCurrentTab('soc')}
          />
        )}

        {currentTab === 'soc' && <SecurityDashboard />}

        {currentTab === 'simulator' && (
          <AttackSimulator onNavigateToSoc={() => setCurrentTab('soc')} />
        )}
      </main>

      <footer className="border-t border-[#202d4a] py-6 text-center text-xs text-slate-500 bg-[#0d121f]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ALAD: Application-Layer Attack Detection from Internal Application State</span>
          <span className="font-mono text-[11px] text-slate-400">
            Next.js 14 • React • In-Memory Auth • Zero Database Required
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
