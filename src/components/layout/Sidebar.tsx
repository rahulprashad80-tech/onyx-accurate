import React from 'react';
import {
  LayoutDashboard,
  Ticket,
  Monitor,
  Building2,
  Network,
  Users,
  BarChart3,
  Settings,
  ShieldAlert,
  Server,
  Layers,
  Sparkles,
  History,
  Mail,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Badge } from '../common/Badge';

export type NavigationTab = 
  | 'dashboard' 
  | 'tickets' 
  | 'inventory' 
  | 'inventory_history'
  | 'locations'
  | 'companies' 
  | 'departments' 
  | 'employees' 
  | 'users'
  | 'reports' 
  | 'email_notifications'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { activeRole, userProfile } = useAuth();
  const { tickets, computers, isLiveSync, inventorySnapshots } = useData();

  // Compute live badges
  const openTicketsCount = tickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  ).length;

  const userTicketsCount = tickets.filter(
    (t) => t.requesterEmail === userProfile?.email && (t.status === 'open' || t.status === 'in_progress')
  ).length;

  const availableComputersCount = computers.filter(
    (c) => c.status === 'available'
  ).length;

  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'technician', 'employee'],
    },
    {
      id: 'tickets' as NavigationTab,
      label: 'Support Tickets',
      icon: Ticket,
      badge: activeRole === 'employee' ? userTicketsCount : openTicketsCount,
      badgeColor: 'bg-indigo-100 text-indigo-700',
      allowedRoles: ['admin', 'technician', 'employee'],
    },
    {
      id: 'inventory' as NavigationTab,
      label: 'Computer Inventory',
      icon: Monitor,
      badge: activeRole !== 'employee' && availableComputersCount > 0 ? availableComputersCount : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-700',
      allowedRoles: ['admin', 'technician', 'employee'],
    },
    {
      id: 'inventory_history' as NavigationTab,
      label: 'Rollback & History',
      icon: History,
      badge: activeRole === 'admin' && inventorySnapshots.length > 0 ? inventorySnapshots.length : undefined,
      badgeColor: 'bg-purple-100 text-purple-700',
      allowedRoles: ['admin'],
    },
    {
      id: 'companies' as NavigationTab,
      label: 'Companies',
      icon: Building2,
      allowedRoles: ['admin', 'technician'],
      adminOnlyBadge: false,
    },
    {
      id: 'departments' as NavigationTab,
      label: 'Departments',
      icon: Layers,
      allowedRoles: ['admin', 'technician'],
    },
    {
      id: 'locations' as NavigationTab,
      label: 'Locations',
      icon: MapPin,
      allowedRoles: ['admin', 'technician'],
    },
    {
      id: 'employees' as NavigationTab,
      label: 'Employees',
      icon: Users,
      allowedRoles: ['admin', 'technician'],
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Reports & Analytics',
      icon: BarChart3,
      allowedRoles: ['admin', 'technician'],
    },
    {
      id: 'users' as NavigationTab,
      label: 'User Accounts',
      icon: Users,
      allowedRoles: ['admin'],
    },
    {
      id: 'email_notifications' as NavigationTab,
      label: 'Email Notifications',
      icon: Mail,
      allowedRoles: ['admin'],
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Settings',
      icon: Settings,
      allowedRoles: ['admin', 'technician', 'employee'],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 border-r border-slate-200 bg-white transition-transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-80'
        } flex flex-col justify-between`}
      >
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                IT Helpdesk & Assets
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Internal IT Operations</p>
            </div>
          </div>

          {/* Current Role Banner */}
          <div className="mx-3 my-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Current Access
              </span>
              <Badge variant="role" value={activeRole} size="sm" />
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {activeRole === 'admin'
                ? 'Full system governance'
                : activeRole === 'technician'
                ? 'Tickets & inventory manager'
                : 'Self-service portal'}
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isAllowed = item.allowedRoles.includes(activeRole);
              const isActive = currentTab === item.id;

              if (!isAllowed) {
                return null;
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                        item.badgeColor || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div
              className={`w-2 h-2 rounded-full ${
                isLiveSync ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            ></div>
            <span className="text-[11px] font-medium text-slate-500">
              {isLiveSync ? 'Firestore Live Sync' : 'Offline Preview Mode'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
