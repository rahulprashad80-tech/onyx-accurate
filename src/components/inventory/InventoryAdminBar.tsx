import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { Computer } from '../../types';
import { Modal } from '../common/Modal';
import {
  ShieldAlert,
  Trash2,
  Archive,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  Building2,
  Layers,
  X,
  Loader2,
  Lock,
} from 'lucide-react';

interface InventoryAdminBarProps {
  selectedAssetIds: string[];
  totalFilteredCount: number;
  filteredAssets: Computer[];
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  isAllFilteredSelected: boolean;
  onOpenUpgradeModal: () => void;
}

export const InventoryAdminBar: React.FC<InventoryAdminBarProps> = ({
  selectedAssetIds,
  totalFilteredCount,
  filteredAssets,
  onSelectAllFiltered,
  onClearSelection,
  isAllFilteredSelected,
  onOpenUpgradeModal,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();
  const {
    companies,
    bulkArchiveAssets,
    bulkDeleteAssets,
    clearAllInventory,
    bulkUpdateAssets,
  } = useData();
  const { showToast } = useNotifications();

  // Dialog states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);

  // Form states
  const [confirmationInput, setConfirmationInput] = useState('');
  const [operationReason, setOperationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Bulk update fields
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkCondition, setBulkCondition] = useState<string>('');
  const [bulkLocation, setBulkLocation] = useState<string>('');

  // Clear scope
  const [clearScopeCompanyId, setClearScopeCompanyId] = useState<string>('all');

  const isAdmin = activeRole === 'admin';
  const isSuperAdmin =
    currentUser?.email === 'rahulprashad80@gmail.com' ||
    currentUser?.username === 'rahulprasad' ||
    (!currentUser?.companyId && currentUser?.username !== 'sameertupe');

  const userCompanyId = currentUser?.companyId || 'comp-agipl';
  const userCompany = companies.find((c) => c.id === userCompanyId);

  // If user is employee or technician, inventory administration controls are blocked
  if (!isAdmin) {
    return null;
  }

  // Handle Bulk Archive
  const handleExecuteArchive = async () => {
    if (selectedAssetIds.length === 0) return;
    try {
      setIsProcessing(true);
      setErrorNotice(null);

      const archivedCount = await bulkArchiveAssets(
        selectedAssetIds,
        operationReason || 'Bulk administrative archive'
      );

      showToast({
        title: 'Assets Archived',
        message: `Successfully archived ${archivedCount} hardware assets. Pre-archive backup snapshot created.`,
        type: 'success',
      });
      setIsArchiveModalOpen(false);
      onClearSelection();
    } catch (err: any) {
      console.error('Archive error:', err);
      setErrorNotice(err?.message || 'Failed to archive selected assets.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Bulk Delete
  const handleExecuteDelete = async () => {
    if (confirmationInput.trim().toUpperCase() !== 'DELETE') {
      setErrorNotice('You must type "DELETE" to confirm permanent deletion.');
      return;
    }
    try {
      setIsProcessing(true);
      setErrorNotice(null);

      const deletedCount = await bulkDeleteAssets(
        selectedAssetIds,
        confirmationInput,
        operationReason || 'Bulk administrative deletion'
      );

      showToast({
        title: 'Assets Permanently Deleted',
        message: `Deleted ${deletedCount} hardware assets. Recoverable pre-deletion snapshot created.`,
        type: 'success',
      });
      setIsDeleteModalOpen(false);
      setConfirmationInput('');
      onClearSelection();
    } catch (err: any) {
      console.error('Bulk deletion error:', err);
      setErrorNotice(err?.message || 'Deletion failed. Pre-deletion backup verification check aborted.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Clear All Inventory
  const handleExecuteClear = async () => {
    if (confirmationInput.trim().toUpperCase() !== 'DELETE') {
      setErrorNotice('You must type "DELETE" to confirm clearing inventory.');
      return;
    }
    try {
      setIsProcessing(true);
      setErrorNotice(null);

      const targetCompany = isSuperAdmin
        ? clearScopeCompanyId === 'all'
          ? undefined
          : clearScopeCompanyId
        : userCompanyId;

      const clearedCount = await clearAllInventory(
        confirmationInput,
        operationReason || 'Inventory administration reset',
        targetCompany
      );

      showToast({
        title: 'Hardware Inventory Cleared',
        message: `Cleared ${clearedCount} hardware records. Complete recoverable snapshot created. Ticket history preserved.`,
        type: 'success',
      });
      setIsClearModalOpen(false);
      setConfirmationInput('');
      onClearSelection();
    } catch (err: any) {
      console.error('Clear inventory error:', err);
      setErrorNotice(err?.message || 'Clear operation failed. Pre-clear backup verification check aborted.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Bulk Update
  const handleExecuteBulkUpdate = async () => {
    if (selectedAssetIds.length === 0) return;
    const updates: Record<string, any> = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkCondition) updates.condition = bulkCondition;
    if (bulkLocation.trim()) updates.location = bulkLocation.trim();

    if (Object.keys(updates).length === 0) {
      setErrorNotice('Please select at least one attribute to update.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorNotice(null);

      const updatedCount = await bulkUpdateAssets(
        selectedAssetIds,
        updates,
        operationReason || 'Bulk attribute update'
      );

      showToast({
        title: 'Assets Updated',
        message: `Updated ${updatedCount} assets. Safety snapshot created.`,
        type: 'success',
      });
      setIsBulkUpdateModalOpen(false);
      onClearSelection();
    } catch (err: any) {
      console.error('Bulk update error:', err);
      setErrorNotice(err?.message || 'Failed to update selected assets.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Inventory Administration & Selection Action Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-md border border-slate-800 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Scope & Selection Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Inventory Administration
              </span>
            </div>

            {/* Scope Badge */}
            {isSuperAdmin ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-900/60 text-purple-200 border border-purple-700/60">
                Super Admin Scope: All Companies
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-900/60 text-blue-200 border border-blue-700/60 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                IT Admin Scope: {userCompany?.name || 'AGIPL'}
              </span>
            )}

            {/* Selection Counter */}
            {selectedAssetIds.length > 0 ? (
              <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/80 px-2.5 py-1 rounded-lg text-xs">
                <span className="font-bold text-indigo-300">
                  {selectedAssetIds.length} {selectedAssetIds.length === 1 ? 'asset' : 'assets'} selected
                </span>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-slate-400 hover:text-white cursor-pointer ml-1"
                  title="Deselect all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400">
                {totalFilteredCount} {totalFilteredCount === 1 ? 'asset matches' : 'assets match'} current filters
              </span>
            )}
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Select All Matching Filter */}
            {totalFilteredCount > 0 && (
              <button
                type="button"
                onClick={onSelectAllFiltered}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
              >
                {isAllFilteredSelected
                  ? 'Deselect Filtered'
                  : `Select All Filtered (${totalFilteredCount})`}
              </button>
            )}

            {/* Actions on Selected */}
            {selectedAssetIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setErrorNotice(null);
                    setOperationReason('');
                    setIsBulkUpdateModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs cursor-pointer transition-colors"
                >
                  Bulk Edit ({selectedAssetIds.length})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorNotice(null);
                    setOperationReason('');
                    setIsArchiveModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-600/90 hover:bg-amber-600 text-white shadow-2xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive ({selectedAssetIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorNotice(null);
                    setConfirmationInput('');
                    setOperationReason('');
                    setIsDeleteModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-2xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedAssetIds.length})</span>
                </button>
              </>
            )}

            {/* Clear All Inventory Button (Super Admin or Scoped IT Admin) */}
            <button
              type="button"
              onClick={() => {
                setErrorNotice(null);
                setConfirmationInput('');
                setOperationReason('');
                setClearScopeCompanyId(isSuperAdmin ? 'all' : userCompanyId);
                setIsClearModalOpen(true);
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 shadow-2xs cursor-pointer transition-colors flex items-center gap-1"
              title="Clear hardware inventory with automatic safety snapshot"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Hardware Inventory</span>
            </button>

            {/* Schema Upgrade Button */}
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors flex items-center gap-1"
              title="Migrate and normalize inventory schema safely"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Upgrade Schema</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Modal: Bulk Delete Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isProcessing && setIsDeleteModalOpen(false)}
        title="Confirm Permanent Deletion of Selected Assets"
        subtitle="This action permanently removes hardware inventory records"
        maxWidth="lg"
      >
        <div className="space-y-4 py-1 text-xs">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                You are about to permanently delete {selectedAssetIds.length} asset records.
              </p>
              <p className="mt-1 text-slate-700">
                A recoverable backup snapshot will automatically be created in Firestore before deletion. If snapshot creation fails, the operation will be aborted immediately.
              </p>
              <p className="mt-1 text-slate-700">
                <strong>Safety guarantee:</strong> Helpdesk tickets, attachments, employee accounts, and user records are strictly preserved.
              </p>
            </div>
          </div>

          {errorNotice && (
            <div className="p-3 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 font-medium">
              {errorNotice}
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Reason for Deletion (recorded in audit log):
            </label>
            <input
              type="text"
              value={operationReason}
              onChange={(e) => setOperationReason(e.target.value)}
              placeholder="e.g. Asset decommission, end-of-life hardware cycle purge"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Type <strong className="font-mono text-rose-700">DELETE</strong> to confirm permanent deletion:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3 py-2 font-mono uppercase rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteDelete}
              disabled={isProcessing || confirmationInput.trim().toUpperCase() !== 'DELETE'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Delete {selectedAssetIds.length} Assets</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal: Clear Hardware Inventory Confirmation */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => !isProcessing && setIsClearModalOpen(false)}
        title="Clear Hardware Inventory Records"
        subtitle="Safely clear hardware catalog records with full automatic recovery snapshot"
        maxWidth="lg"
      >
        <div className="space-y-4 py-1 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Comprehensive Inventory Clearing</p>
              <p className="mt-1 text-slate-700">
                An exact snapshot of all inventory assets being cleared will be taken in Firestore. You can restore this entire inventory or recover individual deleted assets at any time from the Rollback page.
              </p>
              <p className="mt-1 text-slate-700">
                <strong>Employees, tickets, and user accounts will NOT be deleted.</strong>
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Clearing Scope (Super Administrator):
              </label>
              <select
                value={clearScopeCompanyId}
                onChange={(e) => setClearScopeCompanyId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              >
                <option value="all">Organization-Wide: Clear All Companies</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>
                    Company Only: {co.name} ({co.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
              IT Admin Scope: Only hardware assets belonging to <strong>{userCompany?.name || 'AGIPL'}</strong> will be cleared.
            </div>
          )}

          {errorNotice && (
            <div className="p-3 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 font-medium">
              {errorNotice}
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Reason for Clearing (recorded in audit log):
            </label>
            <input
              type="text"
              value={operationReason}
              onChange={(e) => setOperationReason(e.target.value)}
              placeholder="e.g. Annual hardware inventory reset, migration testing reset"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Type <strong className="font-mono text-rose-700">DELETE</strong> to authorize clearing:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3 py-2 font-mono uppercase rounded-lg border border-slate-300 text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsClearModalOpen(false)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteClear}
              disabled={isProcessing || confirmationInput.trim().toUpperCase() !== 'DELETE'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Clear Hardware Inventory</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal: Bulk Archive */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => !isProcessing && setIsArchiveModalOpen(false)}
        title="Archive Selected Assets"
        subtitle="Mark selected hardware assets as retired and archived"
        maxWidth="md"
      >
        <div className="space-y-4 py-1 text-xs">
          <p className="text-slate-600">
            You are about to archive <strong>{selectedAssetIds.length}</strong> assets. Their status will be set to retired and an automatic snapshot will be taken before updating.
          </p>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Archive Reason:
            </label>
            <input
              type="text"
              value={operationReason}
              onChange={(e) => setOperationReason(e.target.value)}
              placeholder="e.g. Replaced with newer hardware generation"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsArchiveModalOpen(false)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteArchive}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Archive ({selectedAssetIds.length})</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. Modal: Bulk Edit Attributes */}
      <Modal
        isOpen={isBulkUpdateModalOpen}
        onClose={() => !isProcessing && setIsBulkUpdateModalOpen(false)}
        title="Bulk Update Selected Assets"
        subtitle={`Apply common updates across ${selectedAssetIds.length} selected assets`}
        maxWidth="md"
      >
        <div className="space-y-4 py-1 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Update Status:</label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            >
              <option value="">Leave unchanged</option>
              <option value="available">Available (In Stock)</option>
              <option value="under_repair">Under Repair / RMA</option>
              <option value="retired">Retired</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Update Condition:</label>
            <select
              value={bulkCondition}
              onChange={(e) => setBulkCondition(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            >
              <option value="">Leave unchanged</option>
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Update Location:</label>
            <input
              type="text"
              value={bulkLocation}
              onChange={(e) => setBulkLocation(e.target.value)}
              placeholder="e.g. Pune Tech Center, Floor 4"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Update Reason:</label>
            <input
              type="text"
              value={operationReason}
              onChange={(e) => setOperationReason(e.target.value)}
              placeholder="e.g. Office relocation update"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkUpdateModalOpen(false)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteBulkUpdate}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Apply Updates ({selectedAssetIds.length})</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
