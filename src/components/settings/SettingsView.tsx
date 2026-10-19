import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Badge } from '../common/Badge';
import { EmailNotificationsSettings } from './EmailNotificationsSettings';
import {
  Settings,
  Shield,
  Wrench,
  User,
  Database,
  Users,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Building2,
  Monitor,
  Ticket,
  ArrowRight,
  Mail,
  Bell,
} from 'lucide-react';

interface SettingsViewProps {
  onNavigateTab?: (tab: string) => void;
  defaultSubTab?: 'profile' | 'email' | 'rbac' | 'database';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateTab, defaultSubTab = 'profile' }) => {
  const { 
    currentUser, 
    userProfile, 
    activeRole, 
    switchPersona, 
    logout 
  } = useAuth();

  const { 
    companies, 
    departments, 
    employees, 
    computers, 
    tickets, 
    isLiveSync 
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'email' | 'rbac' | 'database'>(defaultSubTab);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('profile')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile & Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('email')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'email'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email Notifications</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeSubTab === 'email' ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-700'
          }`}>
            Admin
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('rbac')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'rbac'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>RBAC Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('database')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeSubTab === 'database'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>System Records</span>
        </button>
      </div>

      {/* Tab: Email Notifications */}
      {activeSubTab === 'email' && (
        <EmailNotificationsSettings />
      )}

      {/* Tab: Profile & Identity */}
      {activeSubTab === 'profile' && (
        <>
          {/* Quick banner to jump to Email Notifications for admins */}
          {activeRole === 'admin' && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-sky-50/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Admin Email Notifications</h4>
                  <p className="text-[11px] text-slate-500">Configure automated ticket alert routing and test SMTP delivery.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('email')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors shrink-0"
              >
                <span>Open Email Settings</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
      {/* Current User & Auth State */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">User Authentication & Profile</h3>
            <p className="text-xs text-slate-500">Secure authenticated session and identity details</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Full Name</span>
            <span className="font-semibold text-slate-900">{currentUser?.fullName || userProfile?.displayName || 'System User'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Username</span>
            <span className="font-mono text-slate-800">@{currentUser?.username || 'user'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Email Address</span>
            <span className="font-mono text-slate-800">{currentUser?.email || userProfile?.email || 'Not available'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Effective Permissions Level</span>
            <Badge variant="role" value={activeRole} size="sm" />
          </div>
        </div>
      </div>

      {/* User Management Quick Navigation for Admins */}
      {activeRole === 'admin' && (
        <div className="p-5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/30 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">User Accounts & Administration</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Manage user onboarding, permissions, account deactivation, and mandatory password resets.
              </p>
            </div>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors shrink-0"
            >
              <span>Manage Users</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

        </>
      )}

      {/* Tab: Role-Based Access Control Simulation */}
      {activeSubTab === 'rbac' && (
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-slate-500">
              Switch persona view below to verify permissions and feature access for different roles
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Admin */}
            <div
              onClick={() => switchPersona('admin')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                activeRole === 'admin'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <Badge variant="role" value="admin" size="sm" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Administrator</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Full unconstrained access to hardware inventory, corporate companies & departments, user accounts, and reports.
              </p>
              {activeRole === 'admin' && (
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Currently Active
                </span>
              )}
            </div>

            {/* Technician */}
            <div
              onClick={() => switchPersona('technician')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                activeRole === 'technician'
                  ? 'border-sky-600 bg-sky-50/40 ring-1 ring-sky-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <Badge variant="role" value="technician" size="sm" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">IT Technician</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Manage tickets, assign hardware inventory, view corporate departments & staff directory.
              </p>
              {activeRole === 'technician' && (
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Currently Active
                </span>
              )}
            </div>

            {/* Employee */}
            <div
              onClick={() => switchPersona('employee')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                activeRole === 'employee'
                  ? 'border-slate-600 bg-slate-100 ring-1 ring-slate-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <Badge variant="role" value="employee" size="sm" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Employee</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Strict self-service: Create and view <em>only</em> own support tickets and assigned equipment.
              </p>
              {activeRole === 'employee' && (
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Currently Active
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: System Database */}
      {activeSubTab === 'database' && (
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database & Records Overview</h3>
              <p className="text-xs text-slate-500">
                Live synchronized operational records in real-time cloud storage
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Database Connected</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Companies</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{companies.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Departments</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{departments.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Staff Records</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{employees.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Computers</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{computers.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Tickets</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{tickets.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
