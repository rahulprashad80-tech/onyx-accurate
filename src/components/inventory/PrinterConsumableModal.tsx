import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  PrinterConsumable,
  ConsumableType,
  ConsumableColor,
  ConsumableStatus,
  ConsumableReplacementRecord,
} from '../../types';
import {
  Droplets,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  AlertTriangle,
  History,
} from 'lucide-react';

interface PrinterConsumableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (consumable: PrinterConsumable) => void;
  initialData?: PrinterConsumable | null;
  printerModel?: string;
  isColorPrinter?: boolean;
  mode?: 'create' | 'edit' | 'replace';
}

export const PrinterConsumableModal: React.FC<PrinterConsumableModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  printerModel = '',
  isColorPrinter = false,
  mode = 'create',
}) => {
  const { userProfile } = useAuth();

  const [consumableType, setConsumableType] = useState<ConsumableType>('toner');
  const [modelOrPartNumber, setModelOrPartNumber] = useState('');
  const [color, setColor] = useState<ConsumableColor>('black');
  const [compatiblePrinterModel, setCompatiblePrinterModel] = useState('');
  const [quantityInstalled, setQuantityInstalled] = useState<number>(1);
  const [currentStatus, setCurrentStatus] = useState<ConsumableStatus>('installed');
  const [installationDate, setInstallationDate] = useState('');
  const [expectedPageYield, setExpectedPageYield] = useState<string>('2500');
  const [lastReplacementDate, setLastReplacementDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Replacement specific fields
  const [replacementDate, setReplacementDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newPartNumber, setNewPartNumber] = useState('');
  const [pageCountAtReplacement, setPageCountAtReplacement] = useState('');
  const [replacementReason, setReplacementReason] = useState('Toner exhausted / empty');
  const [replacementNotes, setReplacementNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setConsumableType(initialData.consumableType || 'toner');
      setModelOrPartNumber(initialData.modelOrPartNumber || '');
      setColor(initialData.color || 'black');
      setCompatiblePrinterModel(initialData.compatiblePrinterModel || printerModel);
      setQuantityInstalled(initialData.quantityInstalled || 1);
      setCurrentStatus(initialData.currentStatus || 'installed');
      setInstallationDate(initialData.installationDate || '');
      setExpectedPageYield(String(initialData.expectedPageYield || '2500'));
      setLastReplacementDate(initialData.lastReplacementDate || '');
      setRemarks(initialData.remarks || '');
      setNewPartNumber(initialData.modelOrPartNumber || '');
    } else {
      setConsumableType('toner');
      setModelOrPartNumber('');
      setColor('black');
      setCompatiblePrinterModel(printerModel);
      setQuantityInstalled(1);
      setCurrentStatus('installed');
      setInstallationDate(new Date().toISOString().split('T')[0]);
      setExpectedPageYield('2500');
      setLastReplacementDate('');
      setRemarks('');
      setNewPartNumber('');
    }
    setReplacementDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
  }, [initialData, printerModel, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'replace') {
      if (!initialData) return;
      if (!newPartNumber.trim()) {
        setErrorMsg('New cartridge/toner part number is required.');
        return;
      }

      const newHistoryEntry: ConsumableReplacementRecord = {
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        replacedAt: replacementDate || new Date().toISOString().split('T')[0],
        replacedByName: userProfile?.displayName || 'IT Admin',
        previousPartNumber: initialData.modelOrPartNumber,
        newPartNumber: newPartNumber.trim(),
        pageCountAtReplacement: pageCountAtReplacement.trim() || undefined,
        reason: replacementReason.trim(),
        notes: replacementNotes.trim() || undefined,
      };

      const updatedRecord: PrinterConsumable = {
        ...initialData,
        modelOrPartNumber: newPartNumber.trim(),
        currentStatus: 'installed',
        lastReplacementDate: replacementDate,
        installationDate: replacementDate,
        remarks: replacementNotes ? `Replaced on ${replacementDate}: ${replacementNotes}` : initialData.remarks,
        replacementHistory: [
          newHistoryEntry,
          ...(initialData.replacementHistory || []),
        ],
      };

      onSave(updatedRecord);
      onClose();
      return;
    }

    if (!modelOrPartNumber.trim()) {
      setErrorMsg('Cartridge/toner model or part number is required.');
      return;
    }

    const consumableRecord: PrinterConsumable = {
      id: initialData?.id || `con-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      consumableType,
      modelOrPartNumber: modelOrPartNumber.trim(),
      color,
      compatiblePrinterModel: compatiblePrinterModel.trim() || undefined,
      quantityInstalled: Number(quantityInstalled) || 1,
      currentStatus,
      installationDate: installationDate.trim() || undefined,
      expectedPageYield: expectedPageYield.trim() || undefined,
      lastReplacementDate: lastReplacementDate.trim() || undefined,
      remarks: remarks.trim() || undefined,
      replacementHistory: initialData?.replacementHistory || [],
    };

    onSave(consumableRecord);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'replace'
          ? `Record Cartridge Replacement: ${initialData?.modelOrPartNumber || ''}`
          : initialData
          ? 'Edit Cartridge / Toner Record'
          : 'Add Cartridge / Toner'
      }
      subtitle={
        mode === 'replace'
          ? 'Log a replacement event with date, page count, and history retention without overwriting past records'
          : 'Track linked ink cartridges, laser toner cartridges, and drum units'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'replace' ? (
          /* REPLACE CONSUMABLE MODE */
          <div className="space-y-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 pb-2 border-b border-amber-200">
              <RotateCcw className="w-4 h-4 text-amber-700" />
              <span>Consumable Replacement Event Logging</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Replacement Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={replacementDate}
                  onChange={(e) => setReplacementDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  New Part / Model Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPartNumber}
                  onChange={(e) => setNewPartNumber(e.target.value)}
                  placeholder="e.g. HP 206A Black (W2110A)"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:border-indigo-600 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Printer Page Counter at Replacement
                </label>
                <input
                  type="text"
                  value={pageCountAtReplacement}
                  onChange={(e) => setPageCountAtReplacement(e.target.value)}
                  placeholder="e.g. 14,820 pages"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Replacement Reason
                </label>
                <select
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="Toner exhausted / empty">Toner exhausted / empty</option>
                  <option value="Faint printing / low ink">Faint printing / low ink</option>
                  <option value="Defective / streak marks">Defective / streak marks</option>
                  <option value="Scheduled routine replacement">Scheduled routine replacement</option>
                  <option value="Drum unit wear out">Drum unit wear out</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Replacement Remarks & Technician Notes
              </label>
              <textarea
                rows={2}
                value={replacementNotes}
                onChange={(e) => setReplacementNotes(e.target.value)}
                placeholder="Serial of new cartridge, supplier batch number, or print test verification notes..."
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>
        ) : (
          /* CREATE / EDIT CONSUMABLE MODE */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consumable Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={consumableType}
                  onChange={(e) => setConsumableType(e.target.value as ConsumableType)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="toner">Toner Cartridge (Laser)</option>
                  <option value="cartridge">Ink Cartridge (Inkjet)</option>
                  <option value="drum">Imaging Drum Unit</option>
                  <option value="other">Other Consumable</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Model / Part Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modelOrPartNumber}
                  onChange={(e) => setModelOrPartNumber(e.target.value)}
                  placeholder="e.g. HP 206A (W2110A) or TN-227BK"
                  className="w-full text-xs font-medium rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Colour <span className="text-rose-500">*</span>
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value as ConsumableColor)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="black">Black (K)</option>
                  {isColorPrinter && (
                    <>
                      <option value="cyan">Cyan (C)</option>
                      <option value="magenta">Magenta (M)</option>
                      <option value="yellow">Yellow (Y)</option>
                    </>
                  )}
                  <option value="not_applicable">Not Applicable (Drum / Waste Box)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Status
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as ConsumableStatus)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium"
                >
                  <option value="installed">Installed (In Printer)</option>
                  <option value="available">Available (Spare in Stock)</option>
                  <option value="low">Low Level (&lt; 15%)</option>
                  <option value="empty">Empty / Depleted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Installed
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantityInstalled}
                  onChange={(e) => setQuantityInstalled(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Page Yield
                </label>
                <input
                  type="text"
                  value={expectedPageYield}
                  onChange={(e) => setExpectedPageYield(e.target.value)}
                  placeholder="e.g. 1,500 pages"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Installation Date
                </label>
                <input
                  type="date"
                  value={installationDate}
                  onChange={(e) => setInstallationDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Replacement Date
                </label>
                <input
                  type="date"
                  value={lastReplacementDate}
                  onChange={(e) => setLastReplacementDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Compatible Printer Models / Remarks
              </label>
              <input
                type="text"
                value={compatiblePrinterModel}
                onChange={(e) => setCompatiblePrinterModel(e.target.value)}
                placeholder="e.g. HP LaserJet Pro M404, M428 Series"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="OEM genuine cartridge, high yield (X series), shelf storage notes..."
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              />
            </div>
          </div>
        )}

        {/* Existing Replacement History Log if present */}
        {initialData?.replacementHistory && initialData.replacementHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>Replacement History Log ({initialData.replacementHistory.length} events)</span>
            </h5>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {initialData.replacementHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{rec.replacedAt}</span>
                    <span className="text-slate-400"> • By {rec.replacedByName || 'Staff'}</span>
                    <p className="text-slate-500">
                      Replaced: {rec.previousPartNumber || 'Old'} → <span className="font-medium text-indigo-600">{rec.newPartNumber}</span>
                    </p>
                  </div>
                  {rec.pageCountAtReplacement && (
                    <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {rec.pageCountAtReplacement}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
          >
            {mode === 'replace' ? 'Confirm Replacement' : initialData ? 'Save Changes' : 'Add Consumable'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
