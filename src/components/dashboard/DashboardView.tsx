import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Monitor,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Laptop,
  HardDrive,
  Cpu,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Users,
  Database,
  BarChart3,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Zap,
  PlusCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';
import { Ticket as TicketType, Computer as ComputerType } from '../../types';
import { NavigationTab } from '../layout/Sidebar';

interface DashboardViewProps {
  onSelectTicket: (ticket: TicketType) => void;
  onSelectComputer: (computer: ComputerType) => void;
  onOpenNewTicketModal: () => void;
  onOpenRegisterAssetModal?: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectTicket,
  onSelectComputer,
  onOpenNewTicketModal,
  onOpenRegisterAssetModal,
  onNavigateTab,
}) => {
  const { activeRole, userProfile, currentUser } = useAuth();
  const { tickets, computers, employees, companies, departments, seedDatabase, isSeeding } = useData();
  const { showToast } = useNotifications();

  const [widgetFilter, setWidgetFilter] = useState<'all' | 'helpdesk' | 'inventory'>('all');

  const now = new Date();
  const isEmployee = activeRole === 'employee';
  const isTechnician = activeRole === 'technician';
  const isITAdmin = activeRole === 'admin';
  const isSuperAdmin =
    isITAdmin &&
    (currentUser?.email === 'rahulprashad80@gmail.com' ||
      currentUser?.username === 'rahulprasad' ||
      (!currentUser?.companyId && currentUser?.username !== 'sameertupe'));

  // Role permissions for Quick Actions
  const canRegisterAsset = isITAdmin || isTechnician;
  const canExportInventory = isITAdmin; // IT Admins & Super Admins
  const canCreateTicket = true;

  // Inventory export dataset scoped by IT Admin authorization
  const authorizedInventoryScope = useMemo(() => {
    if (!canExportInventory) return [];
    if (isSuperAdmin) {
      return computers;
    }
    const targetCoId = currentUser?.companyId || (currentUser?.username === 'sameertupe' ? 'comp-agipl' : undefined);
    if (!targetCoId) return computers;
    return computers.filter((c) => c.companyId === targetCoId);
  }, [computers, canExportInventory, isSuperAdmin, currentUser]);

  const userCompanyName = useMemo(() => {
    if (isSuperAdmin) return 'Organization-Wide (All Companies)';
    if (currentUser?.companyId) {
      const found = companies.find((c) => c.id === currentUser.companyId);
      return found?.name || currentUser.companyName || 'AGIPL';
    }
    if (currentUser?.username === 'sameertupe') {
      return 'AGIPL';
    }
    return 'Assigned IT Team';
  }, [companies, currentUser, isSuperAdmin]);

  // Quick Action 1: Register New Asset
  const handleRegisterAsset = () => {
    if (!canRegisterAsset) {
      showToast({
        title: 'Access Denied',
        message: 'Employees do not have authorization to register hardware assets.',
        type: 'error',
      });
      return;
    }
    if (onOpenRegisterAssetModal) {
      onOpenRegisterAssetModal();
    } else {
      onNavigateTab('inventory');
    }
  };

  // Quick Action 2: Create New Ticket
  const handleCreateTicketAction = () => {
    if (!canCreateTicket) {
      showToast({
        title: 'Access Denied',
        message: 'You are not authorized to create tickets.',
        type: 'error',
      });
      return;
    }
    onOpenNewTicketModal();
  };

  // Quick Action 3: Export Inventory Report (Excel / CSV)
  const handleExportInventory = (format: 'xlsx' | 'csv' = 'xlsx') => {
    if (!canExportInventory) {
      showToast({
        title: 'Access Denied',
        message: 'You do not have authorization to export hardware inventory data.',
        type: 'error',
      });
      return;
    }

    if (authorizedInventoryScope.length === 0) {
      showToast({
        title: 'Export Failed',
        message: 'No computer assets found in your authorized inventory scope to export.',
        type: 'error',
      });
      return;
    }

    try {
      const headers = [
        'Asset Tag',
        'Serial Number',
        'Hostname',
        'Asset Type',
        'Brand',
        'Model',
        'Operating System',
        'CPU',
        'RAM',
        'Storage',
        'Other Specs',
        'Condition',
        'Status',
        'Assigned Employee',
        'Company',
        'Department',
        'Assigned Date',
        'Returned Date',
        'Location',
        'Vendor',
        'Purchase Date',
        'Purchase Cost',
        'Warranty Expiry',
        'Notes',
      ];

      const dataRows = authorizedInventoryScope.map((c) => {
        const co = companies.find((comp) => comp.id === c.companyId);
        const dept = departments.find((dp) => dp.id === c.departmentId);

        return [
          c.assetTag || '',
          c.serialNumber || '',
          c.hostname || '',
          c.type || '',
          c.brand || '',
          c.model || '',
          c.os || '',
          c.cpu || '',
          c.ram || '',
          c.storage || '',
          c.specs || '',
          c.condition || '',
          c.status || '',
          c.assignedEmployeeName || 'Unassigned',
          co?.name || '',
          dept?.name || '',
          c.assignedDate || '',
          c.returnedDate || '',
          c.location || '',
          c.vendor || '',
          c.purchaseDate || '',
          c.purchaseCost !== undefined && c.purchaseCost !== null ? String(c.purchaseCost) : '',
          c.warrantyExpiration || '',
          c.notes || '',
        ];
      });

      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'xlsx') {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        ws['!cols'] = headers.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Hardware_Inventory');
        XLSX.writeFile(wb, `IT_Computer_Inventory_${dateStr}.xlsx`);
      } else {
        const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
        const csvContent = [
          headers.map(escapeCsv).join(','),
          ...dataRows.map((row) => row.map(escapeCsv).join(',')),
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `IT_Computer_Inventory_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      showToast({
        title: 'Inventory Report Exported',
        message: `Successfully exported ${authorizedInventoryScope.length} computer asset records to ${format.toUpperCase()} format.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Export Failed',
        message: err?.message || 'Failed to export inventory records.',
        type: 'error',
      });
    }
  };

  // Role-filtered data for employee
  const relevantTickets = useMemo(() => {
    if (isEmployee) {
      return tickets.filter(
        (t) =>
          t.requesterEmail === userProfile?.email ||
          t.requesterId === userProfile?.id ||
          (userProfile?.displayName && t.requesterName.toLowerCase() === userProfile.displayName.toLowerCase())
      );
    }
    return tickets;
  }, [tickets, isEmployee, userProfile]);

  const currentEmpRecord = employees.find((e) => e.email === userProfile?.email);
  const relevantComputers = useMemo(() => {
    if (isEmployee) {
      return computers.filter(
        (c) =>
          c.assignedEmployeeId === currentEmpRecord?.id ||
          (userProfile?.displayName && c.assignedEmployeeName === userProfile.displayName)
      );
    }
    return computers;
  }, [computers, isEmployee, currentEmpRecord, userProfile]);

  // Overall Ticket counts
  const openCount = relevantTickets.filter((t) => t.status === 'open').length;
  const inProgressCount = relevantTickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = relevantTickets.filter(
    (t) => t.status === 'resolved' || t.status === 'closed'
  ).length;

  const urgentCount = relevantTickets.filter((t) => t.priority === 'urgent' || t.priority === 'critical').length;
  const highCount = relevantTickets.filter((t) => t.priority === 'high').length;

  // Overdue tickets
  const overdueTickets = useMemo(() => {
    return relevantTickets.filter((t) => {
      if (t.status === 'resolved' || t.status === 'closed') return false;
      if (t.dueDate) {
        return new Date(t.dueDate).getTime() < now.getTime();
      }
      return now.getTime() - new Date(t.createdAt).getTime() > 48 * 3600 * 1000;
    });
  }, [relevantTickets, now]);

  // Average resolution time (hours)
  const avgResolutionHours = useMemo(() => {
    const closed = relevantTickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
    if (closed.length === 0) return 0;
    const totalHrs = closed.reduce((acc, t) => {
      const end = new Date(t.resolvedAt || t.updatedAt).getTime();
      const start = new Date(t.createdAt).getTime();
      return acc + Math.max(0, (end - start) / (1000 * 3600));
    }, 0);
    return Math.round((totalHrs / closed.length) * 10) / 10;
  }, [relevantTickets]);

  // SLA rate
  const slaCompliance = useMemo(() => {
    if (relevantTickets.length === 0) return 100;
    return Math.max(0, Math.round(((relevantTickets.length - overdueTickets.length) / relevantTickets.length) * 100));
  }, [relevantTickets, overdueTickets]);

  // Hardware counts
  const inUseComputers = computers.filter((c) => c.status === 'in_use' || c.status === 'assigned').length;
  const availableComputers = computers.filter((c) => c.status === 'available').length;
  const maintenanceComputers = computers.filter((c) => c.status === 'maintenance' || c.status === 'under_repair').length;
  const retiredComputers = computers.filter((c) => c.status === 'retired').length;
  const lostComputers = computers.filter((c) => c.status === 'lost').length;

  // Warranty calculation
  const expiredWarranties = computers.filter((c) => {
    if (!c.warrantyExpiration) return false;
    return new Date(c.warrantyExpiration).getTime() < now.getTime();
  });

  const expiringSoonWarranties = computers.filter((c) => {
    if (!c.warrantyExpiration) return false;
    const exp = new Date(c.warrantyExpiration).getTime();
    const diff = (exp - now.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 60;
  });

  // Technician workload ranking
  const topTechs = useMemo(() => {
    const itStaff = employees.filter((e) => e.role === 'admin' || e.role === 'technician');
    return itStaff.map((tech) => {
      const assigned = tickets.filter((t) => t.assignedTechId === tech.id);
      const active = assigned.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
      const done = assigned.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
      return {
        id: tech.id,
        name: tech.fullName,
        active,
        done,
      };
    }).sort((a, b) => b.active - a.active).slice(0, 4);
  }, [employees, tickets]);

  // Most Common Categories
  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, count]) => ({
        cat,
        count,
        pct: tickets.length ? Math.round((count / tickets.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* Banner if dataset is fresh */}
      {tickets.length === 0 && computers.length === 0 && (
        <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-indigo-900">Database Ready</h4>
            <p className="text-xs text-indigo-700 mt-0.5">
              Populate realistic sample companies, hardware inventory, and support tickets with 1 click.
            </p>
          </div>
          <button
            type="button"
            onClick={() => seedDatabase(true)}
            disabled={isSeeding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSeeding ? 'Seeding Records...' : 'Seed Sample Data'}</span>
          </button>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 mb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
              <p className="text-xs text-slate-500">
                {isSuperAdmin
                  ? 'Organization-wide administrative controls and inventory operations'
                  : isITAdmin
                  ? `IT operations and asset management for ${userCompanyName}`
                  : isTechnician
                  ? 'Hardware intake and service desk resolution actions'
                  : 'Employee self-service support actions'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
              Role: <strong className="text-indigo-700 uppercase tracking-wide">{activeRole}</strong> • Scope: {isSuperAdmin ? 'All Entities' : userCompanyName}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Action 1: Register New Asset (Admins & Technicians only - Never exposed to Employees) */}
          {canRegisterAsset && (
            <button
              type="button"
              onClick={handleRegisterAsset}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/40 transition-all text-left flex items-start gap-3 shadow-2xs group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0 mt-0.5">
                <Laptop className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Register New Asset
                  </h4>
                  <PlusCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Add a workstation, laptop, or server to the hardware inventory
                </p>
              </div>
            </button>
          )}

          {/* Action 2: Create New Ticket (All authorized roles: Employees, Techs, Admins) */}
          <button
            type="button"
            onClick={handleCreateTicketAction}
            className="p-3.5 rounded-xl border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50/40 transition-all text-left flex items-start gap-3 shadow-2xs group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0 mt-0.5">
              <Ticket className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                  Create New Ticket
                </h4>
                <PlusCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Submit a technical incident, fault report, or service request
              </p>
            </div>
          </button>

          {/* Action 3: Export Inventory Report (IT Admin & Super Admin only - Never exposed to unauthorized users) */}
          {canExportInventory && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all flex items-start gap-3 shadow-2xs group">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0 mt-0.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Export Inventory Report
                  </h4>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                    {authorizedInventoryScope.length} assets
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug mb-2">
                  {isSuperAdmin
                    ? 'Export complete organization-wide hardware fleet report'
                    : `Export hardware inventory scoped to ${userCompanyName}`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportInventory('xlsx')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportInventory('csv')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Open Tickets */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {isEmployee ? 'My Active Inquiries' : 'Open Support Tickets'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{openCount + inProgressCount}</span>
            {urgentCount > 0 && (
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                {urgentCount} urgent
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {openCount} unassigned • {inProgressCount} in progress
          </p>
        </div>

        {/* Metric 2: SLA & Overdue */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">SLA Health & Overdue</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{slaCompliance}%</span>
            {overdueTickets.length > 0 && (
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                {overdueTickets.length} overdue
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Avg resolution time: {avgResolutionHours} hrs
          </p>
        </div>

        {/* Metric 3: Active Fleet */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {isEmployee ? 'My Assigned Hardware' : 'Hardware Fleet (Active)'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isEmployee ? relevantComputers.length : inUseComputers}
            </span>
            <span className="text-[11px] text-indigo-700 font-medium">In Production</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isEmployee ? 'Assigned to your profile' : `${computers.length} total registered inventory`}
          </p>
        </div>

        {/* Metric 4: Spares / Bench / Warranty */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {isEmployee ? 'Equipment Status' : 'Shelf Spares & Bench'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isEmployee ? (relevantComputers.length > 0 ? 'Optimal' : 'None') : availableComputers}
            </span>
            {!isEmployee && (
              <span className="text-[11px] text-cyan-700 font-medium">
                {availableComputers} ready to issue
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isEmployee ? 'Standard operational state' : `${maintenanceComputers} in repair • ${expiredWarranties.length} expired warranty`}
          </p>
        </div>
      </div>

      {/* Admin / Tech Intelligence Widgets */}
      {!isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Widget 1: Technician Workload */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Technician Workload
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5 cursor-pointer"
              >
                All reports <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {topTechs.map((tech) => (
                <div key={tech.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">{tech.name}</p>
                    <p className="text-[11px] text-slate-400">{tech.done} tickets resolved</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      tech.active > 3
                        ? 'bg-rose-100 text-rose-700'
                        : tech.active > 0
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {tech.active} active
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 2: Most Common Categories */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Common Ticket Categories
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('tickets')}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5 cursor-pointer"
              >
                Tickets <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {topCategories.map((item) => (
                <div key={item.cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 capitalize">{item.cat}</span>
                    <span className="text-slate-900 font-semibold">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Hardware Lifecycle & Warranty Warnings */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Asset Health & Warranty
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab('inventory')}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5 cursor-pointer"
                >
                  Inventory <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-rose-900">Expired OEM Warranty</p>
                    <p className="text-[10px] text-rose-700">Flagged for replacement or salvage</p>
                  </div>
                  <span className="text-sm font-bold text-rose-900">{expiredWarranties.length}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-900">Expiring in &le; 60 Days</p>
                    <p className="text-[10px] text-amber-700">Contract extension window</p>
                  </div>
                  <span className="text-sm font-bold text-amber-900">{expiringSoonWarranties.length}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Bench & Lost Equipment</p>
                    <p className="text-[10px] text-slate-500">{maintenanceComputers} repair, {lostComputers} lost</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{maintenanceComputers + lostComputers}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-2 flex gap-2">
              <button
                type="button"
                onClick={onOpenNewTicketModal}
                className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Reports
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table: Recent Support Tickets */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isEmployee ? 'My Recent Support Inquiries' : 'Recent Support Inquiries'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEmployee
                ? 'Support tickets you have reported to the IT service desk'
                : 'Latest helpdesk inquiries needing resolution'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('tickets')}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
          >
            View all tickets ({relevantTickets.length})
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {relevantTickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No support tickets on record.
            <div className="mt-3">
              <button
                type="button"
                onClick={onOpenNewTicketModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Submit New Ticket
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  {!isEmployee && <th className="py-3 px-4">Requester</th>}
                  {!isEmployee && <th className="py-3 px-4">Assigned Tech</th>}
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relevantTickets.slice(0, 6).map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-indigo-600">
                      {t.ticketNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block truncate max-w-xs sm:max-w-md">
                        {t.title}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">{t.category}</td>
                    <td className="py-3 px-4">
                      <Badge variant="priority" value={t.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="ticketStatus" value={t.status} />
                    </td>
                    {!isEmployee && (
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-medium text-slate-900">{t.requesterName}</span>
                      </td>
                    )}
                    {!isEmployee && (
                      <td className="py-3 px-4 text-slate-600">
                        {t.assignedTechName ? (
                          <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                            {t.assignedTechName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
