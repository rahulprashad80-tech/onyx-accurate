import React, { useState } from 'react';
import {
  Menu,
  Plus,
  LogIn,
  LogOut,
  User,
  Shield,
  Wrench,
  UserCheck,
  ChevronDown,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from './Sidebar';
import { UserRole, Ticket, Computer } from '../../types';
import { NotificationCenter } from '../common/NotificationCenter';

interface HeaderProps {
  currentTab: NavigationTab;
  onOpenSidebar: () => void;
  onOpenNewTicketModal: () => void;
  onOpenGlobalSearch?: () => void;
  onSelectTicket?: (ticket: Ticket) => void;
  onSelectComputer?: (computer: Computer) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenSidebar,
  onOpenNewTicketModal,
  onOpenGlobalSearch,
  onSelectTicket,
  onSelectComputer,
}) => {
  const { 
    currentUser, 
    userProfile, 
    activeRole, 
    switchPersona, 
    logout,
  } = useAuth();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const tabTitles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Operations Dashboard',
      subtitle: 'Real-time overview of IT helpdesk activity and hardware assets',
    },
    tickets: {
      title: 'Support Tickets',
      subtitle: 'Manage user issue requests, technician assignments, and SLA status',
    },
    inventory: {
      title: 'Computer Inventory',
      subtitle: 'Track hardware assets, specifications, warranties, and employee assignments',
    },
    inventory_history: {
      title: 'Inventory Rollback & Version History',
      subtitle: 'Audit trail, point-in-time recovery, schema upgrades, and snapshot differentials',
    },
    companies: {
      title: 'Corporate Entities',
      subtitle: 'Manage corporate organizations and enterprise subsidiaries',
    },
    departments: {
      title: 'Organizational Departments',
      subtitle: 'Department units mapped to companies and assigned hardware',
    },
    employees: {
      title: 'Employee Directory',
      subtitle: 'Staff profiles, hardware assignments, and contact details',
    },
    reports: {
      title: 'Reports & Asset Intelligence',
      subtitle: 'Audit metrics, warranty forecasts, and CSV data exports',
    },
    users: {
      title: 'User Management & Access Control',
      subtitle: 'Manage administrative roles, technicians, credentials, and password resets',
    },
    email_notifications: {
      title: 'Email Notifications & Alerts',
      subtitle: 'Configure administrator alert destinations, event routing, and transactional email verification',
    },
    settings: {
      title: 'System Settings & Access',
      subtitle: 'Role configurations, database state, and demo test personas',
    },
  };

  const currentInfo = tabTitles[currentTab] || {
    title: 'IT Helpdesk & Inventory',
    subtitle: 'Internal IT administration portal',
  };

  const handleRoleSelect = (role: UserRole) => {
    switchPersona(role);
    setRoleDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left side: Hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {currentInfo.title}
          </h2>
          <p className="hidden sm:block text-[11px] text-slate-500 font-normal">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center / Right: Global Search Quick Trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenGlobalSearch && (
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer w-48 md:w-64 justify-between"
          >
            <span className="inline-flex items-center gap-1.5 truncate">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Search IT records...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-400">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Mobile Search Icon */}
        {onOpenGlobalSearch && (
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="sm:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* In-App Notification Center */}
        <NotificationCenter
          onSelectTicket={onSelectTicket}
          onSelectComputer={onSelectComputer}
        />

        {/* Role Quick Switcher for Testing / RBAC Demo */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setRoleDropdownOpen(!roleDropdownOpen);
              setProfileDropdownOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            {activeRole === 'admin' && <Shield className="w-3.5 h-3.5 text-indigo-600" />}
            {activeRole === 'technician' && <Wrench className="w-3.5 h-3.5 text-sky-600" />}
            {activeRole === 'employee' && <User className="w-3.5 h-3.5 text-slate-600" />}
            <span className="hidden md:inline text-slate-500 text-[11px]">Role:</span>
            <span className="font-semibold capitalize text-slate-900">{activeRole}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                <p className="text-[11px] font-semibold text-slate-900">Switch Test Persona</p>
                <p className="text-[10px] text-slate-500">Test different role permissions in real-time</p>
              </div>

              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  activeRole === 'admin' ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <div className="text-left">
                    <p className="font-medium text-xs">Admin</p>
                    <p className="text-[10px] text-slate-500">Full control & settings</p>
                  </div>
                </div>
                {activeRole === 'admin' && <span className="text-xs text-indigo-600 font-bold">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('technician')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  activeRole === 'technician' ? 'bg-sky-50 text-sky-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-sky-600" />
                  <div className="text-left">
                    <p className="font-medium text-xs">IT Technician</p>
                    <p className="text-[10px] text-slate-500">Tickets & hardware inventory</p>
                  </div>
                </div>
                {activeRole === 'technician' && <span className="text-xs text-sky-600 font-bold">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('employee')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  activeRole === 'employee' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-600" />
                  <div className="text-left">
                    <p className="font-medium text-xs">Employee</p>
                    <p className="text-[10px] text-slate-500">Own tickets & assigned devices</p>
                  </div>
                </div>
                {activeRole === 'employee' && <span className="text-xs text-slate-600 font-bold">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onOpenNewTicketModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Ticket</span>
        </button>

        {/* Auth / Profile Button */}
        <div className="relative">
          {currentUser ? (
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setRoleDropdownOpen(false);
              }}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer"
            >
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile?.displayName || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center ring-1 ring-indigo-200">
                  {userProfile?.displayName?.slice(0, 2).toUpperCase() || 'RP'}
                </div>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {userProfile?.displayName || 'User'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{userProfile?.email}</p>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-indigo-600 mt-0.5">
                  Role: {activeRole}
                </p>
              </div>

              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
