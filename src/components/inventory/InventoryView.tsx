import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Computer,
  ComputerType,
  ComputerCondition,
  ComputerStatus,
  Ticket,
} from '../../types';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { ComputerModal } from './ComputerModal';
import { ComputerDetailModal } from './ComputerDetailModal';
import { ImportInventoryModal } from './ImportInventoryModal';
import { ComputerCard } from './ComputerCard';
import { ComputerStatusIndicator } from './ComputerStatusIndicator';
import { InventoryAdminBar } from './InventoryAdminBar';
import { UpgradeSchemaModal } from './UpgradeSchemaModal';
import { QRCodeScannerModal } from './QRCodeScannerModal';
import { AssetTagQRModal } from './AssetTagQRModal';
import {
  Search,
  Plus,
  QrCode,
  Monitor,
  Laptop,
  Printer,
  Server,
  Network,
  Cpu,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Archive,
  UserCheck,
  UserMinus,
  Edit,
  Trash2,
  Eye,
  Filter,
  X,
  ShieldCheck,
  Building2,
  RefreshCw,
  HardDrive,
  FileSpreadsheet,
  LayoutGrid,
  List,
  History,
  Sparkles,
} from 'lucide-react';

interface InventoryViewProps {
  onSelectTicket?: (ticket: Ticket) => void;
  onOpenCreateTicketWithAsset?: (asset: Computer) => void;
  onNavigateToHistory?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onSelectTicket,
  onOpenCreateTicketWithAsset,
  onNavigateToHistory,
}) => {
  const { activeRole, userProfile } = useAuth();
  const {
    computers,
    employees,
    companies,
    departments,
    assignComputer,
    unassignComputer,
    retireComputer,
    deleteComputer,
  } = useData();

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [warrantyFilter, setWarrantyFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal states
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [computerToEdit, setComputerToEdit] = useState<Computer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [computerForQRModal, setComputerForQRModal] = useState<Computer | null>(null);

  // Selection state for Administrative Bulk Management
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Quick Action Dialog states
  const [computerForAssign, setComputerForAssign] = useState<Computer | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);

  const [computerForUnassign, setComputerForUnassign] = useState<Computer | null>(null);
  const [unassignCondition, setUnassignCondition] = useState<ComputerCondition>('good');
  const [unassignNotes, setUnassignNotes] = useState('');

  const [computerForRetire, setComputerForRetire] = useState<Computer | null>(null);
  const [retireReason, setRetireReason] = useState('End of life hardware lifecycle expiration');

  const [computerForDelete, setComputerForDelete] = useState<Computer | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isEmployee = activeRole === 'employee';
  const canManage = activeRole === 'admin' || activeRole === 'technician';
  const isAdmin = activeRole === 'admin';

  // Employee sees only their own assigned assets
  const userVisibleComputers = useMemo(() => {
    if (isEmployee) {
      const currentEmp = employees.find((e) => e.email === userProfile?.email);
      return computers.filter(
        (c) =>
          c.assignedEmployeeId === currentEmp?.id ||
          (userProfile?.displayName && c.assignedEmployeeName === userProfile.displayName)
      );
    }
    return computers;
  }, [computers, isEmployee, employees, userProfile]);

  // Warranty status helper
  const getWarrantyStatus = (c: Computer) => {
    if (!c.warrantyExpiration) return 'none';
    const expDate = new Date(c.warrantyExpiration).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((expDate - now) / (1000 * 3600 * 24));
    if (diffDays < 0) return 'expired';
    if (diffDays <= 30) return 'expiring_30';
    if (diffDays <= 60) return 'expiring_60';
    if (diffDays <= 90) return 'expiring_90';
    return 'active';
  };

  // Metrics Dashboard Totals
  const metrics = useMemo(() => {
    const list = userVisibleComputers;
    const total = list.length;
    const available = list.filter((c) => c.status === 'available').length;
    const assigned = list.filter((c) => c.status === 'assigned' || c.status === 'in_use').length;
    const underRepair = list.filter((c) => c.status === 'under_repair' || c.status === 'maintenance').length;
    const retired = list.filter((c) => c.status === 'retired').length;
    const lost = list.filter((c) => c.status === 'lost').length;

    // Warranty alerts
    let expired = 0;
    let exp30 = 0;
    let exp60 = 0;
    let exp90 = 0;

    list.forEach((c) => {
      const wStatus = getWarrantyStatus(c);
      if (wStatus === 'expired') expired++;
      else if (wStatus === 'expiring_30') exp30++;
      else if (wStatus === 'expiring_60') exp60++;
      else if (wStatus === 'expiring_90') exp90++;
    });

    return {
      total,
      available,
      assigned,
      underRepair,
      retired,
      lost,
      expired,
      exp30,
      exp60,
      exp90,
      totalExpiringSoon: exp30 + exp60 + exp90,
    };
  }, [userVisibleComputers]);

  // Filtering
  const filteredComputers = useMemo(() => {
    return userVisibleComputers.filter((c) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'assigned') {
          if (c.status !== 'assigned' && c.status !== 'in_use') return false;
        } else if (statusFilter === 'under_repair') {
          if (c.status !== 'under_repair' && c.status !== 'maintenance') return false;
        } else if (c.status !== statusFilter) {
          return false;
        }
      }

      // Asset Type filter
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;

      // Condition filter
      if (conditionFilter !== 'all' && c.condition !== conditionFilter) return false;

      // Company filter
      if (companyFilter !== 'all' && c.companyId !== companyFilter) return false;

      // Department filter
      if (departmentFilter !== 'all') {
        const selectedDept = departments.find((d) => d.id === departmentFilter);
        const deptName = selectedDept ? selectedDept.name.toLowerCase() : departmentFilter.toLowerCase();
        const compDept = departments.find((d) => d.id === c.departmentId);
        if (c.departmentId !== departmentFilter && (!compDept || compDept.name.toLowerCase() !== deptName)) {
          return false;
        }
      }

      // Warranty filter
      if (warrantyFilter !== 'all') {
        const wStatus = getWarrantyStatus(c);
        if (warrantyFilter === 'expired' && wStatus !== 'expired') return false;
        if (warrantyFilter === 'expiring_30' && wStatus !== 'expiring_30') return false;
        if (warrantyFilter === 'expiring_60' && wStatus !== 'expiring_60' && wStatus !== 'expiring_30') return false;
        if (warrantyFilter === 'expiring_90' && !['expiring_30', 'expiring_60', 'expiring_90'].includes(wStatus)) return false;
        if (warrantyFilter === 'active' && wStatus !== 'active') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const comp = companies.find((co) => co.id === c.companyId);
        const dept = departments.find((dp) => dp.id === c.departmentId);

        const matchTag = c.assetTag.toLowerCase().includes(query);
        const matchSerial = (c.serialNumber || '').toLowerCase().includes(query);
        const matchHostname = (c.hostname || '').toLowerCase().includes(query);
        const matchModel = `${c.brand} ${c.model}`.toLowerCase().includes(query);
        const matchUser = (c.assignedEmployeeName || '').toLowerCase().includes(query);
        const matchCompany = (comp?.name || '').toLowerCase().includes(query);
        const matchDept = (dept?.name || '').toLowerCase().includes(query);
        const matchStatus = c.status.toLowerCase().includes(query);
        const matchLocation = (c.location || '').toLowerCase().includes(query);

        if (
          !matchTag &&
          !matchSerial &&
          !matchHostname &&
          !matchModel &&
          !matchUser &&
          !matchCompany &&
          !matchDept &&
          !matchStatus &&
          !matchLocation
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    userVisibleComputers,
    statusFilter,
    typeFilter,
    conditionFilter,
    warrantyFilter,
    companyFilter,
    departmentFilter,
    searchTerm,
    companies,
    departments,
  ]);

  // Selection handlers for bulk administration
  const handleToggleSelectOne = (id: string, selected: boolean) => {
    setSelectedAssetIds((prev) =>
      selected ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedAssetIds.length === filteredComputers.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredComputers.map((c) => c.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedAssetIds([]);
  };

  const isAllFilteredSelected =
    filteredComputers.length > 0 && selectedAssetIds.length === filteredComputers.length;

  // Export to CSV
  const exportToCsv = () => {
    if (filteredComputers.length === 0) return;

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

    const escapeCsv = (val?: string | null) => {
      if (!val) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = filteredComputers.map((c) => {
      const comp = companies.find((co) => co.id === c.companyId);
      const dept = departments.find((dp) => dp.id === c.departmentId);

      return [
        escapeCsv(c.assetTag),
        escapeCsv(c.serialNumber),
        escapeCsv(c.hostname || ''),
        escapeCsv(c.type),
        escapeCsv(c.brand),
        escapeCsv(c.model),
        escapeCsv(c.os || ''),
        escapeCsv(c.cpu || ''),
        escapeCsv(c.ram || ''),
        escapeCsv(c.storage || ''),
        escapeCsv(c.specs || ''),
        escapeCsv(c.condition),
        escapeCsv(c.status),
        escapeCsv(c.assignedEmployeeName || 'Unassigned'),
        escapeCsv(comp?.name || ''),
        escapeCsv(dept?.name || ''),
        escapeCsv(c.assignedDate || ''),
        escapeCsv(c.returnedDate || ''),
        escapeCsv(c.location || ''),
        escapeCsv(c.vendor || ''),
        escapeCsv(c.purchaseDate || ''),
        escapeCsv(c.purchaseCost || ''),
        escapeCsv(c.warrantyExpiration || ''),
        escapeCsv(c.notes || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `it-computer-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Action execution
  const openAssignDialog = (comp: Computer) => {
    setComputerForAssign(comp);
    const normU = (comp.assetUserName || '').trim().toLowerCase();
    const normN = (comp.assignedEmployeeName || '').trim().toLowerCase();
    const matched = employees.find(
      (e) => (normU && e.username && e.username.trim().toLowerCase() === normU) ||
             (normN && e.fullName && e.fullName.trim().toLowerCase() === normN)
    );
    setAssigneeId(matched ? matched.id : (comp.assignedEmployeeId || ''));
  };

  const executeAssign = async () => {
    if (!computerForAssign || !assigneeId) return;
    const emp = employees.find((e) => e.id === assigneeId);
    if (!emp) return;

    try {
      setIsActionLoading(true);
      await assignComputer(
        computerForAssign.id,
        emp.id,
        emp.fullName,
        emp.companyId,
        emp.departmentId,
        assignDate,
        { name: userProfile?.displayName || 'IT Admin', role: activeRole }
      );
      setComputerForAssign(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const executeUnassign = async () => {
    if (!computerForUnassign) return;
    try {
      setIsActionLoading(true);
      await unassignComputer(
        computerForUnassign.id,
        new Date().toISOString().split('T')[0],
        unassignCondition,
        unassignNotes,
        { name: userProfile?.displayName || 'IT Admin', role: activeRole }
      );
      setComputerForUnassign(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const executeRetire = async () => {
    if (!computerForRetire) return;
    try {
      setIsActionLoading(true);
      await retireComputer(computerForRetire.id, retireReason, {
        name: userProfile?.displayName || 'IT Admin',
        role: activeRole,
      });
      setComputerForRetire(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!computerForDelete) return;
    try {
      setIsActionLoading(true);
      await deleteComputer(computerForDelete.id);
      setComputerForDelete(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setConditionFilter('all');
    setWarrantyFilter('all');
    setCompanyFilter('all');
    setDepartmentFilter('all');
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    conditionFilter !== 'all' ||
    warrantyFilter !== 'all' ||
    companyFilter !== 'all' ||
    departmentFilter !== 'all';

  return (
    <div className="space-y-5">
      {/* Employee Role Notice */}
      {isEmployee && (
        <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
          <span>
            You are logged in as an <strong>Employee</strong>. You can view hardware specifications and warranty status for your assigned IT assets.
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Assigned Assets Only
          </span>
        </div>
      )}

      {/* Administrator Control Bar (Bulk operations, Clear, Upgrade, Selection tracking) */}
      {isAdmin && (
        <InventoryAdminBar
          selectedAssetIds={selectedAssetIds}
          totalFilteredCount={filteredComputers.length}
          filteredAssets={filteredComputers}
          onSelectAllFiltered={handleSelectAllFiltered}
          onClearSelection={handleClearSelection}
          isAllFilteredSelected={isAllFilteredSelected}
          onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        />
      )}

      {/* 1. Inventory Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {/* Available Assets */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'available'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Available (In Stock)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.available}</p>
          <p className="text-[11px] text-slate-400 mt-1">Ready for deployment</p>
        </div>

        {/* Assigned Assets */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'assigned' ? 'all' : 'assigned')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'assigned'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Assigned Assets</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.assigned}</p>
          <p className="text-[11px] text-slate-400 mt-1">In employee custody</p>
        </div>

        {/* Under Repair Assets */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'under_repair' ? 'all' : 'under_repair')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'under_repair'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Under Repair</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.underRepair}</p>
          <p className="text-[11px] text-slate-400 mt-1">Service / RMA bench</p>
        </div>

        {/* Retired Assets */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'retired' ? 'all' : 'retired')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'retired'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Retired Assets</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.retired}</p>
          <p className="text-[11px] text-slate-400 mt-1">Decommissioned / E-waste</p>
        </div>

        {/* Total Pool */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs col-span-2 sm:col-span-4 lg:col-span-1 ${
            statusFilter === 'all'
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Total IT Assets</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-1">Hardware catalog items</p>
        </div>
      </div>

      {/* 2. Warranty Alert Notification Bar (Warns admins about expired & expiring warranties) */}
      {(metrics.expired > 0 || metrics.totalExpiringSoon > 0) && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 via-rose-50/70 to-amber-50 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start md:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 md:mt-0" />
            <div>
              <span className="font-bold text-slate-900">Warranty Attention Required: </span>
              <span className="text-slate-700">
                Found{' '}
                {metrics.expired > 0 && (
                  <strong className="text-rose-700">{metrics.expired} expired warranties</strong>
                )}
                {metrics.expired > 0 && metrics.totalExpiringSoon > 0 && ' and '}
                {metrics.totalExpiringSoon > 0 && (
                  <strong className="text-amber-800">
                    {metrics.totalExpiringSoon} expiring within 90 days
                  </strong>
                )}
                . Prompt review recommended for vendor renewal and hardware refresh cycles.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {metrics.expired > 0 && (
              <button
                type="button"
                onClick={() => setWarrantyFilter(warrantyFilter === 'expired' ? 'all' : 'expired')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  warrantyFilter === 'expired'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                }`}
              >
                Expired ({metrics.expired})
              </button>
            )}
            {metrics.exp30 > 0 && (
              <button
                type="button"
                onClick={() => setWarrantyFilter(warrantyFilter === 'expiring_30' ? 'all' : 'expiring_30')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  warrantyFilter === 'expiring_30'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                }`}
              >
                ≤ 30 Days ({metrics.exp30})
              </button>
            )}
            {metrics.exp60 > 0 && (
              <button
                type="button"
                onClick={() => setWarrantyFilter(warrantyFilter === 'expiring_60' ? 'all' : 'expiring_60')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  warrantyFilter === 'expiring_60'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                ≤ 60 Days ({metrics.exp60})
              </button>
            )}
            {metrics.exp90 > 0 && (
              <button
                type="button"
                onClick={() => setWarrantyFilter(warrantyFilter === 'expiring_90' ? 'all' : 'expiring_90')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  warrantyFilter === 'expiring_90'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                ≤ 90 Days ({metrics.exp90})
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Filter and Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input & QR Tag Scanner Button */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Asset Tag, Serial, Hostname, Employee, Company, Department, or Status..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors cursor-pointer shrink-0"
              title="Scan physical QR code or barcode on computer tag using camera"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-300" />
              <span>Scan Tag</span>
            </button>
          </div>

          {/* Action Buttons: Add Asset, Import Inventory, Rollback History, & CSV Export */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Import Inventory */}
            {canManage && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
                title="Import hardware inventory from Excel (.xlsx, .xls) or CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Inventory</span>
              </button>
            )}

            {/* Rollback & Version History (Admin) */}
            {isAdmin && onNavigateToHistory && (
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-2xs cursor-pointer transition-colors"
                title="View snapshots, compare diffs, and perform inventory rollback"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Rollback & History</span>
              </button>
            )}

            {/* Upgrade Schema (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-2xs cursor-pointer transition-colors"
                title="Safe hardware inventory schema normalization and upgrade"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Upgrade Schema</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-2 cursor-pointer transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Cards View (Visual Status Indicators)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-indigo-50 text-indigo-600 font-bold'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Data Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* CSV Export */}
            <button
              type="button"
              onClick={exportToCsv}
              disabled={filteredComputers.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-2xs transition-colors"
              title="Export filtered assets as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV ({filteredComputers.length})</span>
            </button>

            {/* Add Asset */}
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setComputerToEdit(null);
                  setIsEditModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Asset</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-criteria Filter Selects */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            Filters:
          </span>

          {/* Asset Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Asset Types</option>
            <option value="laptop">Laptops</option>
            <option value="desktop">Desktops</option>
            <option value="monitor">Monitors</option>
            <option value="printer">Printers</option>
            <option value="server">Servers</option>
            <option value="network_device">Network Devices</option>
            <option value="workstation">Workstations</option>
            <option value="other">Other Peripherals</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="under_repair">Under Repair</option>
            <option value="retired">Retired</option>
            <option value="lost">Lost</option>
          </select>

          {/* Condition */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Conditions</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="damaged">Damaged</option>
          </select>

          {/* Warranty Status */}
          <select
            value={warrantyFilter}
            onChange={(e) => setWarrantyFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Warranties</option>
            <option value="active">Active Warranty</option>
            <option value="expiring_30">Expiring in ≤ 30 Days</option>
            <option value="expiring_60">Expiring in ≤ 60 Days</option>
            <option value="expiring_90">Expiring in ≤ 90 Days</option>
            <option value="expired">Expired Warranty</option>
          </select>

          {/* Company */}
          <select
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setDepartmentFilter('all');
            }}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Companies</option>
            {companies.map((co) => (
              <option key={co.id} value={co.id}>
                {co.name}
              </option>
            ))}
          </select>

          {/* Department */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Departments</option>
            {(companyFilter === 'all'
              ? departments
              : departments.filter((dp) => dp.companyId === companyFilter)
            ).map((dp) => (
              <option key={dp.id} value={dp.id}>
                {dp.name} {companyFilter === 'all' ? `(${companies.find((c) => c.id === dp.companyId)?.name || ''})` : ''}
              </option>
            ))}
          </select>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-medium hover:text-rose-800 ml-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Inventory Data Content (Cards View or Data Table) */}
      {filteredComputers.length > 0 ? (
        viewMode === 'cards' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredComputers.map((comp) => {
                const companyObj = companies.find((c) => c.id === comp.companyId);
                const deptObj = departments.find((d) => d.id === comp.departmentId);
                return (
                  <ComputerCard
                    key={comp.id}
                    computer={comp}
                    company={companyObj}
                    department={deptObj}
                    onSelectComputer={(c) => setSelectedComputer(c)}
                    onOpenQR={(c) => setComputerForQRModal(c)}
                    onAssign={(c) => openAssignDialog(c)}
                    onUnassign={(c) => {
                      setComputerForUnassign(c);
                      setUnassignCondition(c.condition || 'good');
                      setUnassignNotes('');
                    }}
                    onEdit={(c) => {
                      setComputerToEdit(c);
                      setIsEditModalOpen(true);
                    }}
                    onRetire={(c) => {
                      setComputerForRetire(c);
                      setRetireReason('End of life hardware lifecycle expiration');
                    }}
                    onDelete={(c) => setComputerForDelete(c)}
                    onCreateTicket={
                      onOpenCreateTicketWithAsset
                        ? (c) => onOpenCreateTicketWithAsset(c)
                        : undefined
                    }
                    canManage={canManage}
                    isAdmin={isAdmin}
                    isEmployee={isEmployee}
                    isSelected={selectedAssetIds.includes(comp.id)}
                    onToggleSelect={
                      canManage
                        ? (sel) => handleToggleSelectOne(comp.id, sel)
                        : undefined
                    }
                  />
                );
              })}
            </div>

            <div className="px-4 py-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between shadow-2xs">
              <span>
                Showing <strong>{filteredComputers.length}</strong> of <strong>{userVisibleComputers.length}</strong> assets
                {selectedAssetIds.length > 0 && (
                  <strong className="text-indigo-600 ml-2 font-semibold">
                    ({selectedAssetIds.length} selected)
                  </strong>
                )}
              </span>
              <span className="text-[11px] text-slate-400">
                Visual status indicators: In Stock, Assigned, Under Repair, Retired, Lost
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    {canManage && (
                      <th className="px-3 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={handleSelectAllFiltered}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Select / Deselect all matching assets"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">Asset Tag / Hostname</th>
                    <th className="px-4 py-3">Hardware Details</th>
                    <th className="px-4 py-3">Status & Condition</th>
                    <th className="px-4 py-3">Assigned Custodian</th>
                    <th className="px-4 py-3">Location & Org</th>
                    <th className="px-4 py-3">Warranty Expiration</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredComputers.map((comp) => {
                    const companyObj = companies.find((c) => c.id === comp.companyId);
                    const deptObj = departments.find((d) => d.id === comp.departmentId);
                    const wStatus = getWarrantyStatus(comp);
                    const isSelected = selectedAssetIds.includes(comp.id);

                    return (
                      <tr
                        key={comp.id}
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        {canManage && (
                          <td className="px-3 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectOne(comp.id, e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                        )}
                        {/* Asset Tag & Hostname */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedComputer(comp)}
                              className="font-mono font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded ring-1 ring-indigo-200 cursor-pointer text-left transition-colors"
                            >
                              {comp.assetTag}
                            </button>
                          </div>
                          {comp.hostname && (
                            <p className="font-mono text-[11px] text-slate-500 mt-1">
                              {comp.hostname}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            S/N: {comp.serialNumber || 'N/A'}
                          </p>
                        </td>

                        {/* Hardware Details */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {comp.brand} {comp.model}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                            {comp.type.replace('_', ' ')}
                            {comp.cpu ? ` • ${comp.cpu}` : ''}
                            {comp.ram ? ` • ${comp.ram}` : ''}
                          </p>
                          {comp.os && <p className="text-[10px] text-slate-400 mt-0.5">{comp.os}</p>}
                        </td>

                        {/* Status & Condition */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <ComputerStatusIndicator status={comp.status} size="sm" showIcon={true} />
                            <Badge variant="computerCondition" value={comp.condition} size="sm" />
                          </div>
                        </td>

                        {/* Assigned Custodian */}
                        <td className="px-4 py-3.5">
                          {comp.assignedEmployeeName || comp.assetUserName ? (
                            <div>
                              <p className="font-medium text-slate-800">
                                {comp.assignedEmployeeName || comp.assetUserName}
                              </p>
                              {comp.assetUserName && (
                                <p className="text-[10px] text-slate-500 font-mono">
                                  @{comp.assetUserName}
                                </p>
                              )}
                              {comp.assignmentStatus === 'pending' || (!comp.assignedEmployeeId && comp.status !== 'assigned') ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 mt-0.5 border border-amber-200">
                                  Assignment Pending
                                </span>
                              ) : (
                                <p className="text-[11px] text-slate-400">
                                  Assigned: {comp.assignedDate || 'In use'}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-medium">In Stock (Pool)</span>
                          )}
                        </td>

                        {/* Location & Org */}
                        <td className="px-4 py-3.5">
                          <p className="text-slate-700 font-medium">{comp.location || 'IT Lab'}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {companyObj?.code || 'ACME'} {deptObj ? `• ${deptObj.name}` : ''}
                          </p>
                        </td>

                        {/* Warranty Expiration */}
                        <td className="px-4 py-3.5">
                          {comp.warrantyExpiration ? (
                            <div>
                              <span
                                className={`inline-flex items-center text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                                  wStatus === 'expired'
                                    ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-200'
                                    : wStatus === 'expiring_30'
                                    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                    : wStatus === 'expiring_60' || wStatus === 'expiring_90'
                                    ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                                }`}
                              >
                                {comp.warrantyExpiration}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
                                {wStatus === 'expired'
                                  ? 'Expired'
                                  : wStatus.startsWith('expiring')
                                  ? 'Expiring soon'
                                  : 'Active'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No date recorded</span>
                          )}
                        </td>

                        {/* Row Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* View details */}
                            <button
                              type="button"
                              onClick={() => setSelectedComputer(comp)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="View Asset Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* View / Print QR Tag */}
                            <button
                              type="button"
                              onClick={() => setComputerForQRModal(comp)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="View / Print Physical QR Sticker"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            {canManage && (
                              <>
                                {/* Quick Assign / Unassign */}
                                {comp.status === 'assigned' || comp.assignedEmployeeId ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setComputerForUnassign(comp);
                                      setUnassignCondition(comp.condition || 'good');
                                      setUnassignNotes('');
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                                    title="Unassign Device"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openAssignDialog(comp)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                    title="Assign to Employee"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setComputerToEdit(comp);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Edit Specifications"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                {/* Retire */}
                                {comp.status !== 'retired' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setComputerForRetire(comp);
                                      setRetireReason('End of life hardware lifecycle expiration');
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    title="Retire Asset"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Delete */}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setComputerForDelete(comp)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Delete Asset"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>
                Showing <strong>{filteredComputers.length}</strong> of <strong>{userVisibleComputers.length}</strong> assets
              </span>
              <span className="text-[11px] text-slate-400">
                CSV Export and multi-criteria filters enabled
              </span>
            </div>
          </div>
        )
      ) : (
        <EmptyState
          icon={Monitor}
          title={computers.length === 0 ? "No inventory assets yet" : "No hardware assets found"}
          description={
            hasActiveFilters
              ? 'No assets matched the current search or filter combinations. Try adjusting or clearing your filters.'
              : computers.length === 0
              ? 'Get started by clicking "Import Inventory" to upload an Excel spreadsheet or "Add Asset" to register your first hardware record.'
              : 'The computer asset inventory database is currently empty.'
          }
          actionLabel={hasActiveFilters ? 'Clear All Filters' : canManage ? 'Import Inventory' : undefined}
          onAction={hasActiveFilters ? clearAllFilters : canManage ? () => setIsImportModalOpen(true) : undefined}
        />
      )}

      {/* 5. Modals */}

      {/* Import Inventory Modal */}
      {isImportModalOpen && (
        <ImportInventoryModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* Add / Edit Hardware Modal */}
      {isEditModalOpen && (
        <ComputerModal
          computer={computerToEdit}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setComputerToEdit(null);
          }}
        />
      )}

      {/* Asset Detail Modal */}
      {selectedComputer && (
        <ComputerDetailModal
          computer={selectedComputer}
          isOpen={!!selectedComputer}
          onClose={() => setSelectedComputer(null)}
          onEdit={(comp) => {
            setSelectedComputer(null);
            setComputerToEdit(comp);
            setIsEditModalOpen(true);
          }}
          onOpenTicketForAsset={(comp) => {
            if (onOpenCreateTicketWithAsset) {
              onOpenCreateTicketWithAsset(comp);
            }
          }}
          onSelectTicket={onSelectTicket}
        />
      )}

      {/* Quick Assign Confirmation Modal */}
      {computerForAssign && (
        <Modal
          isOpen={!!computerForAssign}
          onClose={() => setComputerForAssign(null)}
          title={`Assign Asset: ${computerForAssign.assetTag}`}
          subtitle="Assign this computer to an active company employee"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white"
                required
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} {emp.username ? `(@${emp.username})` : ''} • {emp.jobTitle || emp.role || 'Employee'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Date</label>
              <input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setComputerForAssign(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assigneeId || isActionLoading}
                onClick={executeAssign}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Unassign Confirmation Modal */}
      {computerForUnassign && (
        <Modal
          isOpen={!!computerForUnassign}
          onClose={() => setComputerForUnassign(null)}
          title={`Unassign Asset: ${computerForUnassign.assetTag}`}
          subtitle={`Return ${computerForUnassign.brand} ${computerForUnassign.model} to available inventory`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Condition Upon Return</label>
              <select
                value={unassignCondition}
                onChange={(e) => setUnassignCondition(e.target.value as ComputerCondition)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                <option value="new">New / Freshly Imaged</option>
                <option value="good">Good (Normal wear, fully functional)</option>
                <option value="fair">Fair (Cosmetic scratches, functional)</option>
                <option value="damaged">Damaged (Requires repair bench service)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Notes</label>
              <textarea
                rows={2}
                value={unassignNotes}
                onChange={(e) => setUnassignNotes(e.target.value)}
                placeholder="Reason for return or hardware diagnostic comments..."
                className="w-full text-xs rounded-lg border border-slate-300 p-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setComputerForUnassign(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={executeUnassign}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Retire Confirmation Modal */}
      {computerForRetire && (
        <Modal
          isOpen={!!computerForRetire}
          onClose={() => setComputerForRetire(null)}
          title={`Retire Hardware Asset: ${computerForRetire.assetTag}`}
          subtitle="Decommission device permanently from active IT inventory"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Confirm Asset Retirement</p>
                <p className="mt-0.5 opacity-90">
                  Retiring <strong>{computerForRetire.assetTag}</strong> will mark it as retired, clear assigned users, and log the action in the permanent audit history.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Retirement Reason & Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={retireReason}
                onChange={(e) => setRetireReason(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setComputerForRetire(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!retireReason.trim() || isActionLoading}
                onClick={executeRetire}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-900 cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Retiring...' : 'Confirm Retirement'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {computerForDelete && (
        <Modal
          isOpen={!!computerForDelete}
          onClose={() => setComputerForDelete(null)}
          title={`Delete Hardware Asset: ${computerForDelete.assetTag}`}
          subtitle="Permanently remove asset record from the system"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Permanent Deletion Warning</p>
                <p className="mt-0.5 opacity-90">
                  Permanently delete asset <strong>{computerForDelete.assetTag}</strong> ({computerForDelete.brand} {computerForDelete.model})? All attached documents and specifications will be removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setComputerForDelete(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={executeDelete}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Safe Schema Upgrade Modal */}
      {isUpgradeModalOpen && (
        <UpgradeSchemaModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
        />
      )}

      {/* QR Code Camera Scanner Modal */}
      {isScannerOpen && (
        <QRCodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          computers={computers}
          canManage={canManage}
          onSelectComputer={(comp) => {
            setSelectedComputer(comp);
          }}
          onSearchAndClose={(term) => {
            setSearchTerm(term);
            setIsScannerOpen(false);
          }}
          onOpenCreateWithTag={(tag) => {
            setComputerToEdit({
              id: '',
              assetTag: tag,
              brand: '',
              model: '',
              type: 'laptop',
              serialNumber: '',
              status: 'available',
              condition: 'new',
              purchaseDate: new Date().toISOString().split('T')[0],
              companyId: companies[0]?.id || '',
              departmentId: departments[0]?.id || '',
            } as Computer);
            setIsEditModalOpen(true);
          }}
          onOpenCreateTicketWithAsset={onOpenCreateTicketWithAsset}
        />
      )}

      {/* Printable Physical Asset Tag QR Sticker Modal */}
      {computerForQRModal && (
        <AssetTagQRModal
          isOpen={!!computerForQRModal}
          computer={computerForQRModal}
          onClose={() => setComputerForQRModal(null)}
          onTestInScanner={() => {
            setIsScannerOpen(true);
          }}
        />
      )}
    </div>
  );
};
