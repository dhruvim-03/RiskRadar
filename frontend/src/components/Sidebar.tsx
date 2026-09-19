import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  Activity,
  Cpu,
  LogOut,
  Sun,
  Moon,
  ShieldAlert,
  Menu,
  X,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const Sidebar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-white shadow-sm'
        : 'text-muted hover:text-text hover:bg-slate-100 dark:hover:bg-slate-800/60'
    }`;

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight text-base">FraudGuard</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted hover:text-text hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-muted hover:text-text hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Persistent Sidebar (desktop) & Collapsible Drawer (mobile) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-surface border-r border-border flex flex-col justify-between z-50 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary text-white shadow-sm shadow-primary/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-base block text-text">FraudGuard</span>
                <span className="text-[11px] text-muted block -mt-0.5">Real-Time Risk Engine</span>
              </div>
            </div>
            {/* Desktop Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden md:flex p-2 rounded-lg text-muted hover:text-text hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation links */}
        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
            Analysis & Ops
          </div>
          <NavLink to="/dashboard" className={navLinkClass} onClick={closeMobile}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/transactions" className={navLinkClass} onClick={closeMobile}>
            <ReceiptText className="w-4 h-4" />
            <span>Transactions</span>
          </NavLink>
          <NavLink to="/drift" className={navLinkClass} onClick={closeMobile}>
            <Activity className="w-4 h-4" />
            <span>Drift Monitoring</span>
          </NavLink>

          {/* ADMIN ONLY SECTION - Never rendered for analysts */}
          {isAdmin && (
            <div className="pt-4 mt-3 border-t border-border">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                Administration
              </div>
              <NavLink to="/admin" className={navLinkClass} onClick={closeMobile}>
                <Cpu className="w-4 h-4" />
                <span>Model Management</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* User profile & logout footer */}
        <div className="p-3 border-t border-border bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="font-mono text-xs font-semibold text-text truncate block">
                  {user?.username || 'User'}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                    isAdmin
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {user?.role || 'ANALYST'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
