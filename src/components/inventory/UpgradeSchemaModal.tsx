import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { SchemaUpgradePreview } from '../../types';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowRight,
  Layers,
  FileCode,
  Loader2,
  Check,
} from 'lucide-react';

interface UpgradeSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeSchemaModal: React.FC<UpgradeSchemaModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, activeRole } = useAuth();
  const { computers, upgradeInventorySchema } = useData();
  const { showToast } = useNotifications();

  const [step, setStep] = useState<'preview' | 'executing' | 'complete'>('preview');
  const [targetVersion] = useState<number>(2);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [upgradeResult, setUpgradeResult] = useState<{
    upgradedCount: number;
    preview: SchemaUpgradePreview;
  } | null>(null);

  const isAdmin = activeRole === 'admin';

  // Compute preview metrics
  const totalAssets = computers.length;
  const currentVersion = computers[0]?.schemaVersion || 1;

  const addedFields = [
    { key: 'schemaVersion', label: 'Schema Version Number', category: 'Metadata' },
    { key: 'assetNumber', label: 'Asset Number (Standardized)', category: 'Core' },
    { key: 'procurementType', label: 'Procurement Type (NH / SH)', category: 'Lifecycle' },
    { key: 'manufacturer', label: 'Manufacturer (Standardized from Brand)', category: 'Hardware' },
    { key: 'processor', label: 'Processor (Standardized from CPU)', category: 'Hardware' },
    { key: 'windowsVersion', label: 'WINDOWS VERSION (Standardized)', category: 'Software' },
    { key: 'warrantyEnd', label: 'Warranty End (Standardized)', category: 'Warranty' },
    { key: 'customFields', label: 'Preserved Custom Attributes Map', category: 'Preservation' },
    { key: 'isArchived', label: 'Lifecycle Archive Flag', category: 'Lifecycle' },
  ];

  const handleStartUpgrade = async () => {
    if (!isAdmin) {
      setErrorMsg('Unauthorized: Only administrators can upgrade the inventory schema.');
      return;
    }

    try {
      setIsUpgrading(true);
      setErrorMsg(null);
      setStep('executing');

      const result = await upgradeInventorySchema(targetVersion);

      if (!result.success) {
        throw new Error('Schema migration returned failure.');
      }

      setUpgradeResult(result);
      setStep('complete');

      showToast({
        title: 'Inventory Schema Upgraded',
        message: `Successfully migrated ${result.upgradedCount} assets to schema v${targetVersion}. Automatic backup snapshot created.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Schema upgrade error:', err);
      setErrorMsg(err?.message || 'Schema migration failed. The database state was preserved.');
      setStep('preview');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Safe Hardware Inventory Schema Upgrade"
      subtitle="Migrate inventory fields, normalize database structure, and preserve custom data"
      maxWidth="3xl"
    >
      <div className="space-y-5 py-1">
        {/* Step Indicator */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'preview' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {step === 'complete' ? <Check className="w-3.5 h-3.5" /> : '1'}
            </span>
            <span>Schema Preview & Mapping</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'executing'
                  ? 'bg-indigo-600 text-white'
                  : step === 'complete'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-600'
              }`}
            >
              {step === 'complete' ? <Check className="w-3.5 h-3.5" /> : '2'}
            </span>
            <span>Automatic Backup & Migration</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'complete' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
              }`}
            >
              3
            </span>
            <span>Verification & Results</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Migration Notice</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Step 1: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Version Transition Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                  Target Migration Plan
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  Schema v{currentVersion} → Schema v{targetVersion} Enterprise Upgrade
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pre-upgrade snapshot is created automatically. Existing asset IDs, tickets, and employee links remain untouched.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
                <Database className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">{totalAssets} Assets</span>
              </div>
            </div>

            {/* Safeguard Guarantee */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Automatic Backup</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Creates a recoverable snapshot in Firestore prior to any modifications.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Zero Data Loss</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Maps aliases and preserves any unknown or extra Excel attributes in `customFields`.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Scoped Safety</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Helpdesk tickets, employee records, and user accounts are never touched.
                </p>
              </div>
            </div>

            {/* Standardized Field Mapping Details */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                  Field Mappings & Standardized Schema Attributes ({addedFields.length})
                </h5>
                <span className="text-[11px] text-slate-500">28 Enterprise Specifications</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {addedFields.map((f) => (
                  <div key={f.key} className="px-4 py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{f.key}</span>
                      <span className="text-slate-500 ml-2">({f.label})</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 uppercase">
                      {f.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartUpgrade}
                disabled={isUpgrading || totalAssets === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade Inventory Schema ({totalAssets} Assets)</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Executing */}
        {step === 'executing' && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <h4 className="text-sm font-bold text-slate-900">Applying Safe Schema Migration...</h4>
            <p className="text-xs text-slate-500 max-w-md">
              1. Creating pre-migration snapshot in Firestore<br />
              2. Normalizing aliases across {totalAssets} assets<br />
              3. Preserving unknown custom fields without data loss<br />
              4. Updating schema version to v{targetVersion}
            </p>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && upgradeResult && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">Schema Migration Successfully Completed</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  All {upgradeResult.upgradedCount} assets have been successfully upgraded to Schema v{targetVersion}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <p className="text-xl font-bold text-slate-900">{upgradeResult.upgradedCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Total Migrated Assets</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <p className="text-xl font-bold text-indigo-600">{upgradeResult.preview.normalizedCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Normalized Fields</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <p className="text-xl font-bold text-purple-600">{upgradeResult.preview.backfilledCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Backfilled Defaults</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <p className="text-xl font-bold text-emerald-600">{upgradeResult.preview.preservedUnknownCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Custom Fields Preserved</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                Close & Return to Inventory
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
