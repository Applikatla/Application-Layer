import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { BankingApp } from './pages/BankingApp';
import { SecurityDashboard } from './pages/SecurityDashboard';
import { AttackSimulator } from './pages/AttackSimulator';

export function AppContent() {
  const [currentTab, setCurrentTab] = useState('banking');

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1">
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
            Node.js • Express • MongoDB • Socket.io • React • Tailwind
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
