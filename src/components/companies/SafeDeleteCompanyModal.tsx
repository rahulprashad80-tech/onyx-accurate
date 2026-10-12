import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Company } from '../../types';
import {
  AlertTriangle,
  Building2,
  Users,
  Monitor,
  Ticket,
  Layers,
  Archive,
  ArrowRightLeft,
  Trash2,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface SafeDeleteCompanyModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SafeDeleteCompanyModal: React.FC<SafeDeleteCompanyModalProps> = ({
  company,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { userProfile, activeRole } = useAuth();
  const {
    companies,
    departments,
    employees,
    computers,
    tickets,
    deleteCompany,
    archiveCompany,
    reassignCompanyRecords,
  } = useData();

  const [targetCompanyId, setTargetCompanyId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!company) return null;

  // Calculate linked dependencies
  const linkedDepartments = departments.filter((d) => d.companyId === company.id);
  const linkedEmployees = employees.filter((e) => e.companyId === company.id);
  const linkedAssets = computers.filter((c) => c.companyId === company.id);
  const linkedTickets = tickets.filter((t) => t.companyId === company.id);

  const totalLinked =
    linkedDepartments.length +
    linkedEmployees.length +
    linkedAssets.length +
    linkedTickets.length;

  const hasLinkedRecords = totalLinked > 0;
  const otherCompanies = companies.filter((c) => c.id !== company.id);

  const actor = {
    name: userProfile?.displayName || 'Administrator',
    role: activeRole,
  };

  const handleArchive = async () => {
    try {
      setIsProcessing(true);
      setErrorMsg('');
      await archiveCompany(company.id, actor);
      setSuccessMsg(`Company "${company.name}" has been safely archived.`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to archive company.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassign = async () => {
    if (!targetCompanyId) {
      setErrorMsg('Please select a destination company for the reassignment.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg('');
      const target = companies.find((c) => c.id === targetCompanyId);
      await reassignCompanyRecords(company.id, targetCompanyId, actor);
      setSuccessMsg(
        `Successfully transferred all records to ${target?.name || 'target company'}. The company now has 0 dependencies.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reassign company records.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (hasLinkedRecords) {
      setErrorMsg('Cannot delete while linked records exist. Reassign or archive first.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg('');
      await deleteCompany(company.id, actor);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to permanently delete company.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Remove Company: ${company.name}`}
      subtitle={`Code: ${company.code} • Safe Deletion & Integrity Check`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Messages */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* State 1: Has Linked Records */}
        {hasLinkedRecords ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/90 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Protected Record: Deletion Blocked Due to Linked Dependencies</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                To prevent orphan records and protect database integrity, <strong>{company.name}</strong> cannot be deleted while linked records exist.
              </p>
            </div>

            {/* Dependency Breakdown */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Linked Records Breakdown ({totalLinked} Total)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <div className="flex items-center justify-center text-slate-400 mb-1">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-slate-900">{linkedDepartments.length}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-medium">Departments</div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <div className="flex items-center justify-center text-slate-400 mb-1">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-slate-900">{linkedEmployees.length}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-medium">Employees</div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <div className="flex items-center justify-center text-slate-400 mb-1">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-slate-900">{linkedAssets.length}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-medium">IT Assets</div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <div className="flex items-center justify-center text-slate-400 mb-1">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-slate-900">{linkedTickets.length}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-medium">Tickets</div>
                </div>
              </div>
            </div>

            {/* Safe Options */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-800">
                Recommended Safe Actions:
              </div>

              {/* Option A: Reassign Records */}
              {otherCompanies.length > 0 && (
                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    <span>Option 1: Reassign All Records to Another Entity</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Safely migrate all {totalLinked} departments, staff, hardware assets, and tickets to another active company in one click.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <select
                      value={targetCompanyId}
                      onChange={(e) => setTargetCompanyId(e.target.value)}
                      className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                    >
                      <option value="">-- Select Destination Company --</option>
                      {otherCompanies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleReassign}
                      disabled={isProcessing || !targetCompanyId}
                      className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg cursor-pointer transition-colors shrink-0"
                    >
                      {isProcessing ? 'Transferring...' : 'Reassign All Records'}
                    </button>
                  </div>
                </div>
              )}

              {/* Option B: Archive Company */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Archive className="w-4 h-4 text-slate-500" />
                    <span>Option 2: Archive Company</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Archive Company
                  </button>
                </div>
                <p className="text-[11px] text-slate-600">
                  Marks this entity as inactive while preserving all linked staff, tickets, and computer assignments for audit compliance.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: Zero Linked Records - Safe to delete */
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero Linked Dependencies</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>{company.name}</strong> currently has no departments, staff members, computer assets, or support tickets associated with it. It is safe to permanently delete this corporate record.
              </p>
            </div>

            <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-200 text-rose-800 text-xs">
              <strong>Warning:</strong> Permanent deletion is irreversible and will remove this company from corporate records.
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Cancel
          </button>

          {!hasLinkedRecords && (
            <button
              type="button"
              onClick={handlePermanentDelete}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Deleting...' : 'Permanently Delete Company'}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
