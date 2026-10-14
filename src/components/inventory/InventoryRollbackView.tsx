import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { InventorySnapshot, InventoryAuditLog, AuditLog, Computer } from '../../types';
import { Modal } from '../common/Modal';
import {
  RotateCcw,
  History,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Database,
  ArrowRight,
  FileSpreadsheet,
  Trash2,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Layers,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertCircle,
  Loader2,
  Building2,
  Sparkles,
} from 'lucide-react';

interface InventoryRollbackViewProps {
  onBackToInventory?: () => void;
  onSelectComputer?: (comp: Computer) => void;
}

export const InventoryRollbackView: React.FC<InventoryRollbackViewProps> = ({
  onBackToInventory,
  onSelectComputer,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();
  const {
    computers,
    companies,
    departments,
    inventorySnapshots,
    inventoryAuditLogs,
    auditLogs,
    createInventorySnapshot,
    rollbackSelectedAssets,
    restoreFullInventorySnapshot,
    restoreDeletedAssets,
    deleteInventorySnapshot,
  } = useData();
  const { showToast } = useNotifications();

  const isAdmin = activeRole === 'admin';
  const isSuperAdmin =
    currentUser?.email === 'rahulprashad80@gmail.com' ||
    currentUser?.username === 'rahulprasad' ||
    (!currentUser?.companyId && currentUser?.username !== 'sameertupe');

  const userCompanyId = currentUser?.companyId || 'comp-agipl';
  const userCompany = companies.find((c) => c.id === userCompanyId);

  // Active sub-tab: 'snapshots' | 'audit_logs'
  const [activeTab, setActiveTab] = useState<'snapshots' | 'audit_logs'>('snapshots');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [operationTypeFilter, setOperationTypeFilter] = useState<string>('all');
  const [actionLogFilter, setActionLogFilter] = useState<string>('all');

  // Selected snapshot for inspection / restore modal
  const [inspectedSnapshot, setInspectedSnapshot] = useState<InventorySnapshot | null>(null);
  const [snapshotViewMode, setSnapshotViewMode] = useState<'all' | 'diff' | 'deleted'>('all');

  // Selected asset IDs within inspected snapshot for selective rollback
  const [selectedAssetIdsToRollback, setSelectedAssetIdsToRollback] = useState<string[]>([]);

  // Modals
  const [isFullRestoreModalOpen, setIsFullRestoreModalOpen] = useState(false);
  const [fullRestoreSnapshot, setFullRestoreSnapshot] = useState<InventorySnapshot | null>(null);
  const [fullRestorePreview, setFullRestorePreview] = useState<{
    restoredCount: number;
    updatedCount: number;
    removedCount: number;
  } | null>(null);
  const [isCalculatingPreview, setIsCalculatingPreview] = useState(false);

  // Manual snapshot creation modal
  const [isManualSnapshotModalOpen, setIsManualSnapshotModalOpen] = useState(false);
  const [manualSnapshotName, setManualSnapshotName] = useState('');
  const [manualSnapshotReason, setManualSnapshotReason] = useState('');
  const [manualSnapshotScope, setManualSnapshotScope] = useState<string>('all');

  // Operation processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Inspected audit log modal
  const [inspectedAuditLog, setInspectedAuditLog] = useState<any | null>(null);

  // Filtered Snapshots
  const filteredSnapshots = useMemo(() => {
    return inventorySnapshots.filter((snap) => {
      // Role scoping: IT Admin can only see org snapshots or their company snapshots
      if (!isSuperAdmin && snap.scopeCompanyId && snap.scopeCompanyId !== userCompanyId) {
        return false;
      }

      if (operationTypeFilter !== 'all' && snap.operationType !== operationTypeFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = snap.name.toLowerCase().includes(query);
        const matchesDesc = (snap.description || '').toLowerCase().includes(query);
        const matchesActor = (snap.createdByName || '').toLowerCase().includes(query);
        const matchesId = snap.id.toLowerCase().includes(query);
        const matchesScope = (snap.scopeCompanyName || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesActor && !matchesId && !matchesScope) {
          return false;
        }
      }

      return true;
    });
  }, [inventorySnapshots, isSuperAdmin, userCompanyId, operationTypeFilter, searchTerm]);

  // Combined Audit Logs from Firestore 'auditLogs' collection + local inventory logs
  const combinedAuditLogs = useMemo(() => {
    const map = new Map<string, any>();

    (auditLogs || []).forEach((log) => {
      map.set(log.id, {
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        actingUserId: log.actingUserId || 'usr-admin',
        actorName: log.actingUserName || 'Administrator',
        actorEmail: log.actingUserEmail || '',
        actorRole: log.actingUserRole || 'admin',
        scope: log.scope || 'Organization-Wide',
        affectedCount: log.affectedAssetCount ?? 0,
        details: log.details || '',
        snapshotId: log.snapshotId,
        status: log.status || 'success',
        metadata: log.metadata,
        isFromAuditLogsCollection: true,
      });
    });

    (inventoryAuditLogs || []).forEach((log) => {
      if (!map.has(log.id)) {
        map.set(log.id, {
          ...log,
          actingUserId: (log as any).actingUserId || 'usr-admin',
          isFromAuditLogsCollection: false,
        });
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  }, [auditLogs, inventoryAuditLogs]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return combinedAuditLogs.filter((log) => {
      if (actionLogFilter !== 'all' && log.action !== actionLogFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(query);
        const matchesActor = (log.actorName || '').toLowerCase().includes(query);
        const matchesUserId = (log.actingUserId || '').toLowerCase().includes(query);
        const matchesDetails = (log.details || '').toLowerCase().includes(query);
        const matchesScope = (log.scope || '').toLowerCase().includes(query);
        const matchesSnap = (log.snapshotId || '').toLowerCase().includes(query);
        if (!matchesAction && !matchesActor && !matchesUserId && !matchesDetails && !matchesScope && !matchesSnap) {
          return false;
        }
      }

      return true;
    });
  }, [combinedAuditLogs, actionLogFilter, searchTerm]);

  // Differences calculation for inspected snapshot vs active inventory
  const snapshotDiffData = useMemo(() => {
    if (!inspectedSnapshot) return null;

    const currentMap = new Map(computers.map((c) => [c.id, c]));
    const snapAssets = inspectedSnapshot.assets || [];
    const snapMap = new Map(snapAssets.map((c) => [c.id, c]));

    const modifiedAssets: {
      asset: Computer;
      currentAsset: Computer;
      changedFields: { field: string; snapVal: any; currVal: any }[];
    }[] = [];

    const deletedFromCurrent: Computer[] = []; // In snapshot, but deleted/missing from current active
    const identicalAssets: Computer[] = [];

    snapAssets.forEach((snapAsset) => {
      const current = currentMap.get(snapAsset.id);
      if (!current) {
        deletedFromCurrent.push(snapAsset);
      } else {
        const changes: { field: string; snapVal: any; currVal: any }[] = [];
        const checkFields: (keyof Computer)[] = [
          'status',
          'condition',
          'assignedEmployeeName',
          'departmentId',
          'location',
          'ipAddress',
          'serialNumber',
          'model',
          'brand',
          'ram',
          'storage',
          'os',
          'isArchived',
        ];

        checkFields.forEach((field) => {
          if (snapAsset[field] !== current[field]) {
            changes.push({
              field,
              snapVal: snapAsset[field],
              currVal: current[field],
            });
          }
        });

        if (changes.length > 0) {
          modifiedAssets.push({
            asset: snapAsset,
            currentAsset: current,
            changedFields: changes,
          });
        } else {
          identicalAssets.push(snapAsset);
        }
      }
    });

    // Added to current after snapshot
    const addedAfterSnapshot: Computer[] = [];
    const targetScopeCompany = inspectedSnapshot.scopeCompanyId;
    const activeInScope = targetScopeCompany
      ? computers.filter((c) => c.companyId === targetScopeCompany)
      : computers;

    activeInScope.forEach((curr) => {
      if (!snapMap.has(curr.id)) {
        addedAfterSnapshot.push(curr);
      }
    });

    return {
      snapAssets,
      modifiedAssets,
      deletedFromCurrent,
      identicalAssets,
      addedAfterSnapshot,
    };
  }, [inspectedSnapshot, computers]);

  // Action: Create Manual Backup Snapshot
  const handleCreateManualSnapshot = async () => {
    if (!manualSnapshotName.trim()) {
      setProcessError('Please provide a name for the snapshot.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessError(null);

      const targetCompany = isSuperAdmin
        ? manualSnapshotScope === 'all'
          ? undefined
          : manualSnapshotScope
        : userCompanyId;

      const companyObj = companies.find((c) => c.id === targetCompany);

      const snapId = await createInventorySnapshot({
        name: manualSnapshotName.trim(),
        description: manualSnapshotReason.trim() || 'Manual administrator snapshot backup',
        operationType: 'manual_backup',
        scopeCompanyId: targetCompany,
        scopeCompanyName: companyObj?.name,
        reason: manualSnapshotReason.trim() || 'Administrator on-demand backup',
      });

      showToast({
        title: 'Inventory Snapshot Created',
        message: `Snapshot ID ${snapId} captured successfully. Checksum verified.`,
        type: 'success',
      });

      setIsManualSnapshotModalOpen(false);
      setManualSnapshotName('');
      setManualSnapshotReason('');
    } catch (err: any) {
      console.error('Failed to create manual snapshot:', err);
      setProcessError(err?.message || 'Database error creating snapshot.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Rollback Selected Assets
  const handleExecuteSelectedRollback = async () => {
    if (!inspectedSnapshot || selectedAssetIdsToRollback.length === 0) return;

    try {
      setIsProcessing(true);
      setProcessError(null);

      const res = await rollbackSelectedAssets(
        inspectedSnapshot.id,
        selectedAssetIdsToRollback,
        `Selective rollback of ${selectedAssetIdsToRollback.length} assets from snapshot ${inspectedSnapshot.name}`
      );

      showToast({
        title: 'Assets Restored',
        message: `Successfully rolled back ${res.restoredCount} assets to historical version. Pre-rollback snapshot recorded.`,
        type: 'success',
      });

      setSelectedAssetIdsToRollback([]);
    } catch (err: any) {
      console.error('Selective rollback error:', err);
      setProcessError(err?.message || 'Failed to rollback selected assets.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Recover Deleted Assets from Snapshot
  const handleExecuteRecoverDeleted = async (assetIdsToRecover?: string[]) => {
    if (!inspectedSnapshot || !snapshotDiffData) return;

    const ids =
      assetIdsToRecover && assetIdsToRecover.length > 0
        ? assetIdsToRecover
        : snapshotDiffData.deletedFromCurrent.map((a) => a.id);

    if (ids.length === 0) {
      showToast({
        title: 'No Deleted Assets',
        message: 'All assets in this snapshot currently exist in the active catalog.',
        type: 'info',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProcessError(null);

      const res = await restoreDeletedAssets(inspectedSnapshot.id, ids);

      showToast({
        title: 'Deleted Assets Recovered',
        message: `Recovered ${res.recoveredCount} hardware records with original asset IDs and history intact.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Recover deleted assets error:', err);
      setProcessError(err?.message || 'Failed to recover deleted assets.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Open Full Restore Preview Modal
  const handleOpenFullRestore = async (snap: InventorySnapshot) => {
    setFullRestoreSnapshot(snap);
    setIsFullRestoreModalOpen(true);
    setProcessError(null);
    try {
      setIsCalculatingPreview(true);
      const preview = await restoreFullInventorySnapshot(snap.id, true);
      setFullRestorePreview(preview);
    } catch (err: any) {
      console.error('Preview error:', err);
      setProcessError(err?.message || 'Failed to compute restore preview.');
    } finally {
      setIsCalculatingPreview(false);
    }
  };

  // Action: Commit Full Restore
  const handleCommitFullRestore = async () => {
    if (!fullRestoreSnapshot) return;

    try {
      setIsProcessing(true);
      setProcessError(null);

      const res = await restoreFullInventorySnapshot(fullRestoreSnapshot.id, false);

      showToast({
        title: 'Full Inventory Restored',
        message: `Inventory restored to snapshot "${fullRestoreSnapshot.name}". Restored ${res.restoredCount}, updated ${res.updatedCount}, archived ${res.removedCount}.`,
        type: 'success',
      });

      setIsFullRestoreModalOpen(false);
      setFullRestoreSnapshot(null);
      setFullRestorePreview(null);
    } catch (err: any) {
      console.error('Full restore error:', err);
      setProcessError(err?.message || 'Failed to restore full inventory.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format Helper
  const getOpBadge = (op: string) => {
    switch (op) {
      case 'pre_import':
        return { label: 'Excel Import Backup', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'pre_bulk_update':
        return { label: 'Bulk Update Backup', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'pre_bulk_delete':
        return { label: 'Pre-Delete Backup', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'pre_clear':
        return { label: 'Pre-Clear Backup', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'pre_upgrade':
        return { label: 'Schema Upgrade Backup', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'pre_rollback':
        return { label: 'Pre-Rollback State', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'manual_backup':
      default:
        return { label: 'Manual Snapshot', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Administrative Access Required</h2>
        <p className="text-xs text-slate-600 mt-2">
          Only authorized IT Administrators and Super Administrators can access the Hardware Inventory Version History and Rollback system.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Hardware Inventory Rollback & Version History
              </h1>
              <p className="text-xs text-slate-500">
                Automatic safety snapshots, granular point-in-time recovery, schema upgrades, and audit logs
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onBackToInventory && (
            <button
              type="button"
              onClick={onBackToInventory}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs transition-colors"
            >
              Back to Inventory
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setProcessError(null);
              setManualSnapshotName(`Manual Backup - ${new Date().toLocaleDateString()}`);
              setManualSnapshotReason('');
              setManualSnapshotScope(isSuperAdmin ? 'all' : userCompanyId);
              setIsManualSnapshotModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Create Snapshot Backup</span>
          </button>
        </div>
      </div>

      {/* Scope Banner & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Total Backups</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{inventorySnapshots.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Immutable recovery snapshots</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Current Active Assets</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{computers.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Production hardware records</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Audit Trail Entries</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{inventoryAuditLogs.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Tracked administrative actions</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Admin Permission Scope</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 truncate">
            {isSuperAdmin ? 'All Entities (Super Admin)' : userCompany?.name || 'AGIPL Team'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {isSuperAdmin ? 'Full organization-wide recovery' : 'Limited to authorized IT Team'}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('snapshots')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'snapshots'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Version Snapshots ({filteredSnapshots.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit_logs')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'audit_logs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Administrative Audit Log ({filteredAuditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Snapshots List & Inspection */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search snapshots by name, administrator, reason, or snapshot ID..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={operationTypeFilter}
                onChange={(e) => setOperationTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Operations</option>
                <option value="pre_import">Excel Import</option>
                <option value="pre_bulk_update">Bulk Update</option>
                <option value="pre_bulk_delete">Bulk Delete</option>
                <option value="pre_clear">Clear Inventory</option>
                <option value="pre_upgrade">Schema Upgrade</option>
                <option value="pre_rollback">Pre-Rollback State</option>
                <option value="manual_backup">Manual Backup</option>
              </select>
            </div>
          </div>

          {/* Snapshots Table */}
          {filteredSnapshots.length === 0 ? (
            <div className="bg-white rounded-xl p-10 border border-slate-200 text-center shadow-2xs">
              <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Inventory Snapshots Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Snapshots are automatically created before bulk deletes, Excel imports, and updates. You can also create an on-demand snapshot now.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <th className="py-3 px-4">Snapshot Name / Reason</th>
                      <th className="py-3 px-4">Operation Trigger</th>
                      <th className="py-3 px-4">Assets Count</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Administrator</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4 text-right">Recovery Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSnapshots.map((snap) => {
                      const badge = getOpBadge(snap.operationType);
                      const isInspected = inspectedSnapshot?.id === snap.id;

                      return (
                        <tr
                          key={snap.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isInspected ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          {/* Name / Reason */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{snap.name}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {snap.description || 'Pre-operation safeguard snapshot'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              ID: {snap.id}
                              {snap.checksum ? ` • ${snap.checksum}` : ''}
                            </div>
                          </td>

                          {/* Trigger */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </td>

                          {/* Assets Count */}
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {snap.assetsCount || snap.affectedCount || 0} assets
                          </td>

                          {/* Scope */}
                          <td className="py-3 px-4">
                            <span className="text-[11px] text-slate-600">
                              {snap.scopeCompanyName ||
                                (snap.scopeCompanyId ? 'Company Scoped' : 'Organization-Wide')}
                            </span>
                          </td>

                          {/* Actor */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{snap.createdByName || 'Administrator'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">{snap.createdByEmail}</div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-slate-600">
                            <div>{new Date(snap.timestamp).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(snap.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View / Diff */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isInspected) {
                                    setInspectedSnapshot(null);
                                  } else {
                                    setInspectedSnapshot(snap);
                                    setSelectedAssetIdsToRollback([]);
                                    setSnapshotViewMode('diff');
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                  isInspected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                                }`}
                                title="Inspect snapshot details and comparison against active inventory"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{isInspected ? 'Close Diff' : 'View Diff'}</span>
                              </button>

                              {/* Restore Full */}
                              <button
                                type="button"
                                onClick={() => handleOpenFullRestore(snap)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer transition-colors"
                                title="Preview and restore active inventory to this historical point"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore Full</span>
                              </button>

                              {/* Delete Snapshot */}
                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      window.confirm(
                                        `Are you sure you want to delete historical snapshot "${snap.name}"?`
                                      )
                                    ) {
                                      await deleteInventorySnapshot(snap.id);
                                      if (inspectedSnapshot?.id === snap.id) {
                                        setInspectedSnapshot(null);
                                      }
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                                  title="Delete historical snapshot (Super Admin only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inspected Snapshot Inspector / Diff Panel */}
          {inspectedSnapshot && snapshotDiffData && (
            <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-md p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                      Active Snapshot Inspection
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{inspectedSnapshot.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Captured on {new Date(inspectedSnapshot.timestamp).toLocaleString()} by{' '}
                    {inspectedSnapshot.createdByName} • Checksum:{' '}
                    <span className="font-mono">{inspectedSnapshot.checksum || 'N/A'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setSnapshotViewMode('diff')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                        snapshotViewMode === 'diff'
                          ? 'bg-white shadow-2xs text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Changes vs Active ({snapshotDiffData.modifiedAssets.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnapshotViewMode('deleted')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                        snapshotViewMode === 'deleted'
                          ? 'bg-white shadow-2xs text-rose-600 font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Deleted / Missing ({snapshotDiffData.deletedFromCurrent.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnapshotViewMode('all')}
                      className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                        snapshotViewMode === 'all'
                          ? 'bg-white shadow-2xs text-slate-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Snapshot Assets ({snapshotDiffData.snapAssets.length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectedSnapshot(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Toolbar for Selective Rollback / Deleted Recovery */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Selective Rollback:</span>
                  <span className="text-slate-500">
                    {selectedAssetIdsToRollback.length} of {inspectedSnapshot.assetsCount} assets selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedAssetIdsToRollback.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAssetIdsToRollback([])}
                      className="text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}

                  {snapshotDiffData.deletedFromCurrent.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleExecuteRecoverDeleted()}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer shadow-2xs flex items-center gap-1 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        Recover All {snapshotDiffData.deletedFromCurrent.length} Deleted Assets
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExecuteSelectedRollback}
                    disabled={selectedAssetIdsToRollback.length === 0 || isProcessing}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>
                      Rollback Selected ({selectedAssetIdsToRollback.length})
                    </span>
                  </button>
                </div>
              </div>

              {processError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{processError}</span>
                </div>
              )}

              {/* Diff View Content */}
              {snapshotViewMode === 'diff' && (
                <div className="space-y-3">
                  {snapshotDiffData.modifiedAssets.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                      <p className="font-semibold text-slate-800">No Attribute Modifications Found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        All surviving records in this snapshot match the active catalog.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span>
                          Found {snapshotDiffData.modifiedAssets.length} assets with attribute modifications:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const modIds = snapshotDiffData.modifiedAssets.map((m) => m.asset.id);
                            setSelectedAssetIdsToRollback(modIds);
                          }}
                          className="text-indigo-600 font-medium hover:underline cursor-pointer"
                        >
                          Select All Modified Assets
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                        {snapshotDiffData.modifiedAssets.map(({ asset, currentAsset, changedFields }) => {
                          const isSelected = selectedAssetIdsToRollback.includes(asset.id);

                          return (
                            <div
                              key={asset.id}
                              className={`p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                isSelected ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAssetIdsToRollback((prev) => [...prev, asset.id]);
                                    } else {
                                      setSelectedAssetIdsToRollback((prev) =>
                                        prev.filter((id) => id !== asset.id)
                                      );
                                    }
                                  }}
                                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />

                                <div>
                                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                                    <span>{asset.assetTag}</span>
                                    <span className="text-[11px] font-normal text-slate-500">
                                      ({asset.manufacturer || asset.brand} {asset.model})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Serial: {asset.serialNumber || 'N/A'} • Assigned to:{' '}
                                    {asset.assignedEmployeeName || 'Unassigned'}
                                  </div>

                                  {/* Changed attributes breakdown */}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {changedFields.map(({ field, snapVal, currVal }) => (
                                      <div
                                        key={field}
                                        className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] text-amber-900"
                                      >
                                        <span className="font-semibold capitalize">{field}: </span>
                                        <span className="line-through text-slate-400 mr-1">
                                          {String(currVal || 'empty')}
                                        </span>
                                        <ArrowRight className="w-3 h-3 inline text-amber-600" />
                                        <span className="font-bold text-emerald-700 ml-1">
                                          {String(snapVal || 'empty')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAssetIdsToRollback([asset.id]);
                                    handleExecuteSelectedRollback();
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                                >
                                  Rollback This Asset Only
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Deleted / Missing in Active */}
              {snapshotViewMode === 'deleted' && (
                <div className="space-y-3">
                  {snapshotDiffData.deletedFromCurrent.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                      <p className="font-semibold text-slate-800">No Deleted Assets In Snapshot</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        None of the records from this snapshot have been removed from current active inventory.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span>
                          {snapshotDiffData.deletedFromCurrent.length} assets exist in this snapshot but are missing from active inventory:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const delIds = snapshotDiffData.deletedFromCurrent.map((d) => d.id);
                            setSelectedAssetIdsToRollback(delIds);
                          }}
                          className="text-indigo-600 font-medium hover:underline cursor-pointer"
                        >
                          Select All Missing
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                        {snapshotDiffData.deletedFromCurrent.map((asset) => {
                          const isSelected = selectedAssetIdsToRollback.includes(asset.id);

                          return (
                            <div
                              key={asset.id}
                              className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isSelected ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAssetIdsToRollback((prev) => [...prev, asset.id]);
                                    } else {
                                      setSelectedAssetIdsToRollback((prev) =>
                                        prev.filter((id) => id !== asset.id)
                                      );
                                    }
                                  }}
                                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />

                                <div>
                                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                                    <span className="text-rose-700">{asset.assetTag}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                      Deleted from Active
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {asset.manufacturer || asset.brand} {asset.model} • SN:{' '}
                                    {asset.serialNumber || 'N/A'} • Status: {asset.status}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleExecuteRecoverDeleted([asset.id])}
                                className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer self-start sm:self-auto"
                              >
                                Recover This Record
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* All Snapshot Assets */}
              {snapshotViewMode === 'all' && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 px-1">
                    Showing all {snapshotDiffData.snapAssets.length} assets recorded in snapshot "{inspectedSnapshot.name}":
                  </div>

                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {snapshotDiffData.snapAssets.map((asset) => {
                      const isSelected = selectedAssetIdsToRollback.includes(asset.id);

                      return (
                        <div
                          key={asset.id}
                          className={`p-2.5 text-xs flex items-center justify-between gap-2 ${
                            isSelected ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssetIdsToRollback((prev) => [...prev, asset.id]);
                                } else {
                                  setSelectedAssetIdsToRollback((prev) =>
                                    prev.filter((id) => id !== asset.id)
                                  );
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-semibold text-slate-900">{asset.assetTag}</span>{' '}
                              <span className="text-slate-500">
                                ({asset.manufacturer || asset.brand} {asset.model})
                              </span>
                              <div className="text-[10px] text-slate-400">
                                SN: {asset.serialNumber} • Status: {asset.status} • Assigned:{' '}
                                {asset.assignedEmployeeName || 'None'}
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono">
                            {asset.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Inventory Audit Trail */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search audit trail by actor, action, scope, or details..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={actionLogFilter}
                onChange={(e) => setActionLogFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Audit Actions</option>
                <option value="create_snapshot">Snapshot Created</option>
                <option value="bulk_delete">Bulk Delete</option>
                <option value="clear_inventory">Clear Inventory</option>
                <option value="bulk_archive">Bulk Archive</option>
                <option value="bulk_update">Bulk Update</option>
                <option value="rollback_selected">Selected Rollback</option>
                <option value="restore_full_snapshot">Full Restore</option>
                <option value="restore_deleted_assets">Deleted Recovery</option>
                <option value="upgrade_schema">Schema Upgrade</option>
                <option value="import_excel">Excel Import</option>
              </select>
            </div>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="bg-white rounded-xl p-10 border border-slate-200 text-center shadow-2xs">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Audit Trail Records</h3>
              <p className="text-xs text-slate-500 mt-1">
                All administrative modifications, imports, and rollback operations will be logged here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Acting User (ID & Name)</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Affected Assets</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.map((log) => (
                      <tr 
                        key={log.id} 
                        onClick={() => setInspectedAuditLog(log)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 capitalize inline-block">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          {log.snapshotId && (
                            <div className="text-[10px] font-mono text-indigo-600 truncate max-w-[150px]">
                              Snapshot: {log.snapshotId}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{log.actorName}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded font-semibold">
                              {log.actingUserId || 'usr-admin'}
                            </span>
                            {log.actorEmail && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                {log.actorEmail}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-[11px] text-slate-600 font-medium">
                            {log.scope}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 text-sm">
                            {log.affectedCount}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-1">assets</span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          <div className="line-clamp-2 text-[11px]">{log.details}</div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.isFromAuditLogsCollection ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Database className="w-2.5 h-2.5" />
                              <span>auditLogs</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span>inventory_log</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{log.status.toUpperCase()}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedAuditLog(log);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Inspect Audit Log Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Full Inventory Restoration Preview & Confirmation */}
      {isFullRestoreModalOpen && fullRestoreSnapshot && (
        <Modal
          isOpen={isFullRestoreModalOpen}
          onClose={() => {
            if (!isProcessing) {
              setIsFullRestoreModalOpen(false);
              setFullRestoreSnapshot(null);
              setFullRestorePreview(null);
            }
          }}
          title="Restore Full Hardware Inventory"
          subtitle={`Previewing restoration changes to snapshot "${fullRestoreSnapshot.name}"`}
          maxWidth="2xl"
        >
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Full Inventory Restoration Safeguard</p>
                <p className="mt-0.5">
                  An automatic safety backup of your active inventory will be created before any changes are applied.
                  Employee accounts, helpdesk tickets, and ticket history will remain completely intact.
                </p>
              </div>
            </div>

            {/* Preview Metrics */}
            {isCalculatingPreview ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-500">Calculating restoration diff...</span>
              </div>
            ) : fullRestorePreview ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-lg font-bold text-emerald-800">
                    +{fullRestorePreview.restoredCount}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700">Missing Assets Restored</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Recreated in catalog</div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <div className="text-lg font-bold text-blue-800">
                    ~{fullRestorePreview.updatedCount}
                  </div>
                  <div className="text-[11px] font-semibold text-blue-700">Altered Assets Reverted</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Reset to snapshot values</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 text-center">
                  <div className="text-lg font-bold text-slate-800">
                    -{fullRestorePreview.removedCount}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700">Newer Assets Archived</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Safely retired / set aside</div>
                </div>
              </div>
            ) : null}

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Snapshot:</span>
                <span className="font-semibold text-slate-900">{fullRestoreSnapshot.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Snapshot Timestamp:</span>
                <span className="font-mono text-slate-700">
                  {new Date(fullRestoreSnapshot.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded Assets:</span>
                <span className="font-semibold text-slate-900">
                  {fullRestoreSnapshot.assetsCount} items
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Scope:</span>
                <span className="font-semibold text-slate-900">
                  {fullRestoreSnapshot.scopeCompanyName || 'Organization-Wide'}
                </span>
              </div>
            </div>

            {processError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{processError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsFullRestoreModalOpen(false);
                  setFullRestoreSnapshot(null);
                  setFullRestorePreview(null);
                }}
                disabled={isProcessing}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCommitFullRestore}
                disabled={isProcessing || isCalculatingPreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>Confirm & Apply Full Restore</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Manual Snapshot Creation */}
      {isManualSnapshotModalOpen && (
        <Modal
          isOpen={isManualSnapshotModalOpen}
          onClose={() => {
            if (!isProcessing) {
              setIsManualSnapshotModalOpen(false);
            }
          }}
          title="Create On-Demand Inventory Snapshot"
          subtitle="Generate an immutable point-in-time backup with checksum verification"
          maxWidth="lg"
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Snapshot Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={manualSnapshotName}
                onChange={(e) => setManualSnapshotName(e.target.value)}
                placeholder="e.g. Q3 Hardware Audit Baseline"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Description
              </label>
              <textarea
                value={manualSnapshotReason}
                onChange={(e) => setManualSnapshotReason(e.target.value)}
                rows={2}
                placeholder="Explain the purpose of this manual snapshot..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            {isSuperAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Snapshot Scope
                </label>
                <select
                  value={manualSnapshotScope}
                  onChange={(e) => setManualSnapshotScope(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="all">Organization-Wide (All Companies)</option>
                  {companies.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.name} ({co.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {processError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{processError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsManualSnapshotModalOpen(false)}
                disabled={isProcessing}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateManualSnapshot}
                disabled={isProcessing || !manualSnapshotName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Create & Verify Snapshot</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Audit Log Details & Metadata Inspection */}
      {inspectedAuditLog && (
        <Modal
          isOpen={!!inspectedAuditLog}
          onClose={() => setInspectedAuditLog(null)}
          title="Administrative Audit Log Details"
          subtitle={`Collection: ${inspectedAuditLog.isFromAuditLogsCollection ? 'Firestore /auditLogs' : 'Firestore /inventory_audit_logs'} • ID: ${inspectedAuditLog.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4 py-1 text-xs">
            {/* Header Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Action Type</span>
                <p className="text-sm font-bold text-slate-900 capitalize">
                  {inspectedAuditLog.action.replace(/_/g, ' ')}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Timestamp</span>
                <p className="font-mono text-slate-700 font-medium">
                  {new Date(inspectedAuditLog.timestamp).toLocaleString()}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Affected Assets</span>
                <p className="text-base font-bold text-slate-900">
                  {inspectedAuditLog.affectedCount ?? inspectedAuditLog.affectedAssetCount ?? 0}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Execution Status</span>
                <div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      inspectedAuditLog.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{(inspectedAuditLog.status || 'success').toUpperCase()}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Actor and Scope grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Acting Administrator</span>
                <p className="font-bold text-slate-900">{inspectedAuditLog.actorName || 'Administrator'}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    User ID: {inspectedAuditLog.actingUserId || 'usr-admin'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 capitalize">
                    Role: {inspectedAuditLog.actorRole || 'admin'}
                  </span>
                </div>
                {inspectedAuditLog.actorEmail && (
                  <p className="text-[11px] text-slate-500 pt-0.5">{inspectedAuditLog.actorEmail}</p>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Administrative Scope & Target</span>
                <p className="font-semibold text-slate-800">{inspectedAuditLog.scope || 'Organization-Wide'}</p>
                {inspectedAuditLog.snapshotId && (
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 block">Safeguard Snapshot ID:</span>
                    <span className="font-mono text-[11px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded inline-block">
                      {inspectedAuditLog.snapshotId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description & Details */}
            <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Operation Description</span>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {inspectedAuditLog.details || 'No additional details recorded for this action.'}
              </p>
            </div>

            {/* Metadata JSON inspection if available */}
            {inspectedAuditLog.metadata && Object.keys(inspectedAuditLog.metadata).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Extended Action Metadata</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(inspectedAuditLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectedAuditLog(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
