import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Flame, ClipboardList, ShieldAlert, LogOut, Lock, Key } from 'lucide-react';
import ChecklistTab from './components/ChecklistTab.tsx';
import BlastDesignTab from './components/BlastDesignTab.tsx';
import IncidentLogsTab from './components/IncidentLogsTab.tsx';
import { loginUser, logoutUser } from './api/client.ts';

export default function App() {
  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('supervisor');
  const [password, setPassword] = useState('supervisor123');
  const [role, setRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'checklist' | 'design' | 'incidents'>('checklist');

  // Key state change notifier for lists
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
      setRole(localStorage.getItem('user_role') || '');
      setFullName(localStorage.getItem('user_fullname') || '');
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const data = await loginUser({ username, password });
      setIsLoggedIn(true);
      setRole(data.role);
      setFullName(data.full_name);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Try supervisor/supervisor123 or officer/officer123.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    setRole('');
    setFullName('');
    setActiveTab('checklist');
  };

  const triggerDataRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Render Login Modal if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-mining-dark flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-mining-card border border-mining-border p-8 rounded-3xl shadow-2xl flex flex-col gap-6">
          <div className="text-center flex flex-col items-center">
            <div className="h-12 w-12 bg-mining-accent/10 border border-mining-accent rounded-2xl flex items-center justify-center text-mining-accent mb-4">
              <Shield size={24} className="animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">Mining Intelligence Platform</h1>
            <p className="text-xs text-gray-400 mt-1">Capstone Program — AI-Powered Enterprise Authentication</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-mining-dark border border-mining-border rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                  placeholder="e.g. supervisor or officer"
                />
                <Key size={14} className="absolute left-3 top-3 text-gray-500" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-mining-dark border border-mining-border rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-mining-accent"
                  placeholder="e.g. supervisor123 or officer123"
                />
                <Lock size={14} className="absolute left-3 top-3 text-gray-500" />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-950/20 border border-red-800 text-red-400 p-3 rounded-lg text-xs">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full btn-neon-yellow py-2.5 rounded-xl font-bold mt-2"
            >
              {loggingIn ? 'AUTHENTICATING...' : 'SECURE SIGN IN'}
            </button>

          </form>

          <div className="border-t border-mining-border pt-4 text-center">
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider mb-2">Default Seeded Credentials</span>
            <div className="flex justify-around text-[11px] text-gray-400">
              <div>
                <strong>Supervisor:</strong><br/>
                <span className="font-mono text-mining-gold">supervisor</span> / <span className="font-mono">supervisor123</span>
              </div>
              <div className="border-l border-mining-border h-8" />
              <div>
                <strong>Blasting Officer:</strong><br/>
                <span className="font-mono text-mining-gold">officer</span> / <span className="font-mono">officer123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mining-dark flex flex-col font-sans">
      {/* Header */}
      <header className="bg-mining-card/80 backdrop-blur-md border-b border-mining-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-mining-accent text-base sm:text-xl font-black">▲</span>
            <div>
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-tight tracking-wider uppercase">
                Mining Intelligence Platform
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            {/* User Session Info */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-white font-bold">{fullName}</span>
              <span className="text-[9px] text-mining-gold font-mono uppercase tracking-widest">{role} Session</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1 sm:p-1.5 bg-mining-dark hover:bg-red-950/20 border border-gray-500 rounded-xl text-gray-300 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={13} className="sm:hidden" />
              <LogOut size={15} className="hidden sm:block" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <nav className="border-b border-mining-border bg-mining-dark/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              activeTab === 'checklist'
                ? 'bg-mining-accent/15 border-mining-accent text-mining-gold shadow-sm shadow-mining-accent/10'
                : 'bg-mining-card border-mining-border text-gray-400 hover:text-white'
            }`}
          >
            <ClipboardList size={13} />
            <span className="hidden sm:inline">Blast Safety Checklist (Module 1)</span>
            <span className="sm:hidden">Checklist</span>
          </button>
          <button
            onClick={() => setActiveTab('design')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              activeTab === 'design'
                ? 'bg-mining-accent/15 border-mining-accent text-mining-gold shadow-sm shadow-mining-accent/10'
                : 'bg-mining-card border-mining-border text-gray-400 hover:text-white'
            }`}
          >
            <Flame size={13} />
            <span className="hidden sm:inline">Blast Design Optimisation (Module 2)</span>
            <span className="sm:hidden">Design Opt</span>
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              activeTab === 'incidents'
                ? 'bg-mining-accent/15 border-mining-accent text-mining-gold shadow-sm shadow-mining-accent/10'
                : 'bg-mining-card border-mining-border text-gray-400 hover:text-white'
            }`}
          >
            <ShieldAlert size={13} />
            <span className="hidden sm:inline">Incident Registers &amp; Audits</span>
            <span className="sm:hidden">Incidents</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'checklist' && (
          <ChecklistTab onSubmissionSuccess={triggerDataRefresh} />
        )}
        {activeTab === 'design' && (
          <BlastDesignTab />
        )}
        {activeTab === 'incidents' && (
          <IncidentLogsTab key={refreshTrigger} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-mining-border bg-mining-card/40 py-4 text-center text-[10px] text-gray-500 font-mono">
        © 2026 Mining Intelligence Platform. All rights reserved. Secured Audit Hashing Enabled.
      </footer>
    </div>
  );
}
