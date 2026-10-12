import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  Computer, 
  ComputerType, 
  ComputerCondition, 
  ComputerStatus 
} from '../../types';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  X,
  FileText,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

// Supported target inventory fields
interface TargetFieldDef {
  key: keyof Computer | 'hostname' | 'assignedDate';
  label: string;
  required?: boolean;
  aliases: string[];
}

const TARGET_FIELDS: TargetFieldDef[] = [
  { key: 'assetTag', label: 'Asset Tag', required: true, aliases: ['asset tag', 'tag', 'assettag', 'asset_tag', 'id', 'barcode'] },
  { key: 'serialNumber', label: 'Serial Number', required: false, aliases: ['serial number', 'serial', 'serial no', 's/n', 'serialnumber', 'sn'] },
  { key: 'hostname', label: 'Computer Name / Hostname', required: false, aliases: ['hostname', 'computer name', 'host name', 'machine name', 'pc name', 'device name'] },
  { key: 'type', label: 'Asset Type', required: false, aliases: ['asset type', 'type', 'device type', 'category', 'hardware type'] },
  { key: 'brand', label: 'Brand / Manufacturer', required: false, aliases: ['brand', 'make', 'manufacturer', 'oem', 'vendor'] },
  { key: 'model', label: 'Model', required: false, aliases: ['model', 'model name', 'product model', 'machine model'] },
  { key: 'os', label: 'Operating System', required: false, aliases: ['operating system', 'os', 'platform', 'os version'] },
  { key: 'cpu', label: 'CPU / Processor', required: false, aliases: ['cpu', 'processor', 'chip'] },
  { key: 'ram', label: 'RAM / Memory', required: false, aliases: ['ram', 'memory', 'ram size'] },
  { key: 'storage', label: 'Storage / Disk', required: false, aliases: ['storage', 'disk', 'ssd', 'hdd', 'hard drive'] },
  { key: 'purchaseDate', label: 'Purchase Date', required: false, aliases: ['purchase date', 'procurement date', 'bought date', 'date purchased'] },
  { key: 'purchaseCost', label: 'Purchase Cost', required: false, aliases: ['purchase cost', 'cost', 'price', 'amount', 'procurement cost'] },
  { key: 'warrantyExpiration', label: 'Warranty Expiry', required: false, aliases: ['warranty expiry', 'warranty expiration', 'warranty end', 'warranty date', 'warranty'] },
  { key: 'vendor', label: 'Vendor / Supplier', required: false, aliases: ['vendor', 'supplier', 'seller', 'reseller'] },
  { key: 'location', label: 'Physical Location', required: false, aliases: ['location', 'site', 'office', 'floor', 'room', 'physical location'] },
  { key: 'condition', label: 'Condition', required: false, aliases: ['condition', 'hardware condition', 'health'] },
  { key: 'status', label: 'Status', required: false, aliases: ['status', 'asset status', 'state', 'operational status'] },
  { key: 'companyId', label: 'Company / Entity', required: false, aliases: ['company', 'company name', 'entity', 'organization', 'org'] },
  { key: 'departmentId', label: 'Department', required: false, aliases: ['department', 'dept', 'division', 'unit'] },
  { key: 'assignedEmployeeName', label: 'Assigned Employee', required: false, aliases: ['assigned employee', 'employee', 'assigned to', 'user', 'custodian', 'assignee'] },
  { key: 'assignedDate', label: 'Assigned Date', required: false, aliases: ['assigned date', 'checkout date', 'assignment date'] },
  { key: 'notes', label: 'Notes / Comments', required: false, aliases: ['notes', 'comments', 'remarks', 'description'] },
];

export const ImportInventoryModal: React.FC<ImportInventoryModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { 
    computers, 
    companies, 
    departments, 
    employees, 
    createComputer, 
    updateComputer,
    addOrganizationAuditEntry,
  } = useData();
  const { showToast } = useNotifications();

  // Step state: 1 = Upload, 2 = Mapping, 3 = Preview & Validate, 4 = Results
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File parsing state
  const [fileName, setFileName] = useState<string>('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Column mapping: fieldKey -> file column header or ''
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Duplicate resolution: 'skip' | 'update'
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('update');
  const [confirmDuplicateHandling, setConfirmDuplicateHandling] = useState<boolean>(false);

  // Validation output
  const [validatedData, setValidatedData] = useState<{
    validRows: { rowNumber: number; data: Partial<Computer>; isDuplicate: boolean; existingId?: string }[];
    errorRows: { rowNumber: number; raw: Record<string, any>; error: string }[];
  }>({ validRows: [], errorRows: [] });

  // Execution state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
  }>({ total: 0, imported: 0, updated: 0, skipped: 0, failed: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Download official Excel Template
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'Asset Tag',
      'Serial Number',
      'Computer Name / Hostname',
      'Asset Type',
      'Brand',
      'Model',
      'Operating System',
      'CPU',
      'RAM',
      'Storage',
      'Purchase Date',
      'Purchase Cost',
      'Warranty Expiry',
      'Vendor',
      'Physical Location',
      'Condition',
      'Status',
      'Company',
      'Department',
      'Assigned Employee',
      'Assigned Date',
      'Notes',
    ];

    const sampleRow = [
      'AST-1001',
      'PF399XY8',
      'ENG-LPT-04',
      'laptop',
      'Lenovo',
      'ThinkPad T14s Gen 4',
      'Windows 11 Pro',
      'AMD Ryzen 7 PRO 7840U',
      '32GB LPDDR5x',
      '1TB NVMe PCIe 4.0 SSD',
      '2024-03-15',
      '$1,450.00',
      '2027-03-15',
      'CDW Direct',
      'HQ Engineering Floor 4',
      'good',
      'assigned',
      'Acme Global Enterprise',
      'Software Engineering',
      'Marcus Vance',
      '2024-03-20',
      'Standard developer kit with 65W GaN charger.',
    ];

    const sampleRow2 = [
      'AST-1002',
      'C02G8721MD6T',
      'DES-MAC-02',
      'desktop',
      'Apple',
      'Mac Studio M2 Max',
      'macOS Sonoma',
      'Apple M2 Max (12-core)',
      '64GB Unified',
      '1TB SSD',
      '2024-01-10',
      '$2,399.00',
      '2026-01-10',
      'Apple Business Store',
      'Studio Lab B',
      'new',
      'available',
      'Acme Global Enterprise',
      'Creative & Product Design',
      '',
      '',
      'High-performance video workstation reserved as design spare.',
    ];

    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, sampleRow, sampleRow2]);

    // Set column widths
    ws['!cols'] = templateHeaders.map(() => ({ wch: 22 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory_Template');

    XLSX.writeFile(wb, 'IT_Inventory_Import_Template.xlsx');
    showToast({
      title: 'Template Downloaded',
      message: 'Downloaded "IT_Inventory_Import_Template.xlsx". Fill in your asset rows and re-upload.',
      type: 'success',
    });
  };

  // 2. Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        if (jsonRows.length < 2) {
          throw new Error('Uploaded file does not contain any data rows below the header.');
        }

        const headers = (jsonRows[0] || []).map((h: any) => String(h || '').trim());
        const dataRows = jsonRows.slice(1).filter((row) => row.some((cell) => cell !== undefined && String(cell).trim() !== ''));

        setFileHeaders(headers);
        setRawRows(dataRows);

        // Auto-match headers to target fields based on aliases
        const initialMapping: Record<string, string> = {};
        TARGET_FIELDS.forEach((tf) => {
          const matchedHeader = headers.find((h) => {
            const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return tf.aliases.some((alias) => clean === alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
          });
          if (matchedHeader) {
            initialMapping[tf.key] = matchedHeader;
          }
        });

        setColumnMapping(initialMapping);
        setCurrentStep(2);
      } catch (err: any) {
        showToast({
          title: 'File Parse Error',
          message: err?.message || 'Failed to read file. Please verify it is a valid .xlsx, .xls, or .csv spreadsheet.',
          type: 'error',
        });
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 3. Process Mapping & Perform Row-by-Row Validation
  const handleProceedToValidation = () => {
    if (!columnMapping.assetTag) {
      showToast({
        title: 'Mapping Incomplete',
        message: 'Please map the required "Asset Tag" column to continue.',
        type: 'error',
      });
      return;
    }

    const headerIndices: Record<string, number> = {};
    Object.entries(columnMapping).forEach(([fieldKey, headerName]) => {
      const idx = fileHeaders.indexOf(headerName);
      if (idx !== -1) {
        headerIndices[fieldKey] = idx;
      }
    });

    const validRows: { rowNumber: number; data: Partial<Computer>; isDuplicate: boolean; existingId?: string }[] = [];
    const errorRows: { rowNumber: number; raw: Record<string, any>; error: string }[] = [];

    // Helper for company / dept mapping
    const findCompanyId = (val?: string) => {
      if (!val) return undefined;
      const clean = val.toLowerCase().trim();
      const match = companies.find((c) => c.name.toLowerCase() === clean || c.code.toLowerCase() === clean || c.id === clean);
      return match ? match.id : undefined;
    };

    const findDeptId = (val?: string, coId?: string) => {
      if (!val) return undefined;
      const clean = val.toLowerCase().trim();
      const match = departments.find((d) => (!coId || d.companyId === coId) && (d.name.toLowerCase() === clean || (d.code && d.code.toLowerCase() === clean) || d.id === clean));
      return match ? match.id : undefined;
    };

    const findEmployeeId = (val?: string) => {
      if (!val) return undefined;
      const clean = val.toLowerCase().trim();
      const match = employees.find((e) => e.fullName.toLowerCase() === clean || e.email.toLowerCase() === clean || e.id === clean);
      return match ? match.id : undefined;
    };

    rawRows.forEach((row, i) => {
      const rowNum = i + 2; // header is row 1
      const rawObj: Record<string, any> = {};
      fileHeaders.forEach((h, idx) => {
        rawObj[h] = row[idx];
      });

      const getVal = (key: string) => {
        const idx = headerIndices[key];
        if (idx === undefined) return '';
        const cell = row[idx];
        return cell !== undefined && cell !== null ? String(cell).trim() : '';
      };

      const assetTag = getVal('assetTag');

      // Required validation: Asset Tag
      if (!assetTag) {
        errorRows.push({
          rowNumber: rowNum,
          raw: rawObj,
          error: 'Missing required field: Asset Tag is blank.',
        });
        return;
      }

      // Check duplicates against current database
      const serialNumber = getVal('serialNumber');
      const existingAsset = computers.find(
        (c) =>
          c.assetTag.toLowerCase() === assetTag.toLowerCase() ||
          (serialNumber && c.serialNumber && c.serialNumber.toLowerCase() === serialNumber.toLowerCase())
      );

      const isDuplicate = !!existingAsset;

      // Normalize types and enums
      const rawType = getVal('type').toLowerCase().replace(/\s+/g, '_');
      const validTypes: ComputerType[] = ['desktop', 'laptop', 'monitor', 'printer', 'server', 'network_device', 'workstation', 'tablet', 'other'];
      const type: ComputerType = validTypes.includes(rawType as ComputerType) ? (rawType as ComputerType) : 'laptop';

      const rawCondition = getVal('condition').toLowerCase();
      const validConditions: ComputerCondition[] = ['new', 'good', 'fair', 'damaged'];
      const condition: ComputerCondition = validConditions.includes(rawCondition as ComputerCondition) ? (rawCondition as ComputerCondition) : 'good';

      const rawStatus = getVal('status').toLowerCase().replace(/\s+/g, '_');
      const validStatuses: ComputerStatus[] = ['available', 'assigned', 'in_use', 'under_repair', 'maintenance', 'retired', 'lost'];
      const status: ComputerStatus = validStatuses.includes(rawStatus as ComputerStatus) ? (rawStatus as ComputerStatus) : 'available';

      const companyNameOrCode = getVal('companyId');
      const resolvedCompanyId = findCompanyId(companyNameOrCode);

      const deptNameOrCode = getVal('departmentId');
      const resolvedDeptId = findDeptId(deptNameOrCode, resolvedCompanyId);

      const empName = getVal('assignedEmployeeName');
      const resolvedEmpId = findEmployeeId(empName);

      const parsedAsset: Partial<Computer> = {
        assetTag,
        serialNumber: serialNumber || `SN-${assetTag}`,
        hostname: getVal('hostname') || undefined,
        type,
        brand: getVal('brand') || 'Standard',
        model: getVal('model') || 'Hardware Asset',
        os: getVal('os') || undefined,
        cpu: getVal('cpu') || undefined,
        ram: getVal('ram') || undefined,
        storage: getVal('storage') || undefined,
        purchaseDate: getVal('purchaseDate') || undefined,
        purchaseCost: getVal('purchaseCost') || undefined,
        warrantyExpiration: getVal('warrantyExpiration') || undefined,
        vendor: getVal('vendor') || undefined,
        location: getVal('location') || undefined,
        condition,
        status,
        companyId: resolvedCompanyId,
        departmentId: resolvedDeptId,
        assignedEmployeeId: resolvedEmpId,
        assignedEmployeeName: empName || undefined,
        assignedDate: getVal('assignedDate') || undefined,
        notes: getVal('notes') || undefined,
      };

      validRows.push({
        rowNumber: rowNum,
        data: parsedAsset,
        isDuplicate,
        existingId: existingAsset?.id,
      });
    });

    setValidatedData({ validRows, errorRows });
    setCurrentStep(3);
  };

  // 4. Download Error Report
  const handleDownloadErrorReport = () => {
    if (validatedData.errorRows.length === 0) return;

    const reportHeaders = ['Row Number', 'Error Reason', ...fileHeaders];
    const reportRows = validatedData.errorRows.map((err) => [
      err.rowNumber,
      `"${err.error.replace(/"/g, '""')}"`,
      ...fileHeaders.map((h) => `"${String(err.raw[h] || '').replace(/"/g, '""')}"`),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [reportHeaders.join(','), ...reportRows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_import_errors_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      title: 'Error Report Downloaded',
      message: 'Downloaded rejected rows report.',
      type: 'info',
    });
  };

  // 5. Execute Import
  const handleExecuteImport = async () => {
    setIsImporting(true);

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const actorName = userProfile?.displayName || currentUser?.fullName || 'IT Administrator';
    const now = new Date().toISOString();

    for (const item of validatedData.validRows) {
      try {
        if (item.isDuplicate && item.existingId) {
          if (duplicateStrategy === 'skip') {
            skippedCount++;
            continue;
          } else {
            // Update existing
            const updatePayload: Record<string, any> = {
              updatedAt: now,
            };
            Object.entries(item.data).forEach(([k, v]) => {
              if (v !== undefined) {
                updatePayload[k] = v;
              }
            });
            await updateComputer(
              item.existingId,
              updatePayload,
              {
                type: 'updated',
                actorName,
                actorRole: 'admin',
                message: `Bulk updated via Excel spreadsheet import (${fileName})`,
              }
            );
            updatedCount++;
          }
        } else {
          // Create new asset with only defined properties
          const compPayload: Record<string, any> = {
            assetTag: item.data.assetTag!,
            serialNumber: item.data.serialNumber || `SN-${item.data.assetTag}`,
            type: item.data.type || 'laptop',
            brand: item.data.brand || 'Generic',
            model: item.data.model || 'Enterprise Unit',
            condition: item.data.condition || 'good',
            status: item.data.status || 'available',
          };

          if (item.data.hostname) compPayload.hostname = item.data.hostname;
          if (item.data.os) compPayload.os = item.data.os;
          if (item.data.cpu) compPayload.cpu = item.data.cpu;
          if (item.data.ram) compPayload.ram = item.data.ram;
          if (item.data.storage) compPayload.storage = item.data.storage;
          if (item.data.purchaseDate) compPayload.purchaseDate = item.data.purchaseDate;
          if (item.data.purchaseCost) compPayload.purchaseCost = item.data.purchaseCost;
          if (item.data.warrantyExpiration) compPayload.warrantyExpiration = item.data.warrantyExpiration;
          if (item.data.vendor) compPayload.vendor = item.data.vendor;
          if (item.data.location) compPayload.location = item.data.location;
          if (item.data.companyId) compPayload.companyId = item.data.companyId;
          if (item.data.departmentId) compPayload.departmentId = item.data.departmentId;
          if (item.data.assignedEmployeeId) compPayload.assignedEmployeeId = item.data.assignedEmployeeId;
          if (item.data.assignedEmployeeName) compPayload.assignedEmployeeName = item.data.assignedEmployeeName;
          if (item.data.assignedDate) compPayload.assignedDate = item.data.assignedDate;
          if (item.data.notes) compPayload.notes = item.data.notes;

          await createComputer(
            compPayload as any,
            {
              type: 'created',
              actorName,
              actorRole: 'admin',
              message: `Bulk imported from Excel file: ${fileName}`,
            }
          );
          importedCount++;
        }
      } catch (err) {
        console.error('Failed row import:', err);
        failedCount++;
      }
    }

    failedCount += validatedData.errorRows.length;

    const summary = {
      total: validatedData.validRows.length + validatedData.errorRows.length,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      failed: failedCount,
    };

    setImportSummary(summary);
    setIsImporting(false);
    setCurrentStep(4);

    // Save audit-log record showing who imported the file, when, filename, and import result
    try {
      await addOrganizationAuditEntry({
        type: 'imported',
        actorName,
        actorRole: 'admin',
        message: `Imported inventory spreadsheet "${fileName}": ${summary.total} rows evaluated (${importedCount} new assets created, ${updatedCount} existing updated, ${skippedCount} duplicates skipped, ${failedCount} errors).`,
        timestamp: now,
      });
    } catch (auditErr) {
      console.warn('Could not record import audit record:', auditErr);
    }

    showToast({
      title: 'Inventory Import Complete',
      message: `Processed ${summary.total} rows (${importedCount} new, ${updatedCount} updated, ${skippedCount} skipped).`,
      type: 'success',
    });

    if (onImportComplete) {
      onImportComplete();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Computer Inventory"
      subtitle="Import hardware assets from .xlsx, .xls, or .csv spreadsheets"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
          {[
            { step: 1, title: '1. Upload File' },
            { step: 2, title: '2. Column Mapping' },
            { step: 3, title: '3. Preview & Validate' },
            { step: 4, title: '4. Import Results' },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex items-center gap-1.5 font-semibold ${
                currentStep === s.step
                  ? 'text-indigo-600'
                  : currentStep > s.step
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === s.step
                    ? 'bg-indigo-600 text-white font-bold'
                    : currentStep > s.step
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {currentStep > s.step ? '✓' : s.step}
              </div>
              <span className="hidden sm:inline">{s.title}</span>
            </div>
          ))}
        </div>

        {/* ======================================================== */}
        {/* STEP 1: UPLOAD & DOWNLOAD TEMPLATE */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Download Template Banner */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-indigo-900">
                  Download Standard Inventory Spreadsheet Template
                </h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Get our pre-formatted .xlsx file with ready column headers, allowed values, and sample hardware assets.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .xlsx Template</span>
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 text-center transition-colors cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>

              <h4 className="text-sm font-bold text-slate-800">
                {isParsing ? 'Parsing Spreadsheet...' : 'Choose or Drag Your Spreadsheet Here'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
              </p>

              {isParsing && (
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-indigo-600 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing rows...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: COLUMN MAPPING */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Match Spreadsheet Columns to Inventory Fields
                </h4>
                <p className="text-[11px] text-slate-500">
                  File: <strong className="font-mono">{fileName}</strong> ({rawRows.length} rows detected)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Change file
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {TARGET_FIELDS.map((tf) => (
                <div key={tf.key} className="p-2.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-800">
                      {tf.label} {tf.required && <span className="text-rose-600">*</span>}
                    </span>
                  </div>

                  <div className="w-56 shrink-0">
                    <select
                      value={columnMapping[tf.key] || ''}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, [tf.key]: e.target.value })
                      }
                      className={`w-full py-1.5 px-2 text-xs rounded-lg border bg-white focus:outline-hidden ${
                        tf.required && !columnMapping[tf.key]
                          ? 'border-rose-400 bg-rose-50/30'
                          : columnMapping[tf.key]
                          ? 'border-indigo-400 font-medium text-indigo-900'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      <option value="">-- Ignore / Not Mapped --</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToValidation}
                disabled={!columnMapping.assetTag}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span>Validate & Preview Rows</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: PREVIEW & VALIDATION */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* Validation Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {validatedData.validRows.length + validatedData.errorRows.length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Valid Rows</span>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">
                  {validatedData.validRows.length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700">Existing Duplicates</span>
                <p className="text-xl font-bold text-amber-800 mt-0.5">
                  {validatedData.validRows.filter((r) => r.isDuplicate).length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-700">Rejected Errors</span>
                <p className="text-xl font-bold text-rose-800 mt-0.5">
                  {validatedData.errorRows.length}
                </p>
              </div>
            </div>

            {/* Duplicate Handling Strategy */}
            {validatedData.validRows.some((r) => r.isDuplicate) && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Existing Asset Tags / Serial Numbers Detected</span>
                </div>
                <p className="text-xs text-amber-800">
                  {validatedData.validRows.filter((r) => r.isDuplicate).length} rows match assets already registered in your inventory. Choose how to handle them:
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateStrategy === 'update'}
                      onChange={() => setDuplicateStrategy('update')}
                      className="text-indigo-600"
                    />
                    <span>Update existing assets with imported data</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateStrategy === 'skip'}
                      onChange={() => setDuplicateStrategy('skip')}
                      className="text-indigo-600"
                    />
                    <span>Skip duplicate rows (keep existing records)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Error download button if errors found */}
            {validatedData.errorRows.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs">
                <span className="text-rose-800 font-medium">
                  {validatedData.errorRows.length} row(s) failed validation and will not be imported.
                </span>
                <button
                  type="button"
                  onClick={handleDownloadErrorReport}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-lg cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Error Report (CSV)</span>
                </button>
              </div>
            )}

            {/* Preview Table of First 5 Rows */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                Preview First {Math.min(5, validatedData.validRows.length)} Validated Rows:
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px]">
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Asset Tag</th>
                      <th className="py-2 px-3">Serial No</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Model</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validatedData.validRows.slice(0, 5).map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">#{r.rowNumber}</td>
                        <td className="py-1.5 px-3 font-mono font-bold text-indigo-600">{r.data.assetTag}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-600">{r.data.serialNumber}</td>
                        <td className="py-1.5 px-3 capitalize text-slate-700">{r.data.type}</td>
                        <td className="py-1.5 px-3 text-slate-800">{r.data.brand} {r.data.model}</td>
                        <td className="py-1.5 px-3 capitalize text-slate-700">{r.data.status}</td>
                        <td className="py-1.5 px-3">
                          {r.isDuplicate ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Duplicate ({duplicateStrategy})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              New Asset
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={isImporting}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Back to Mapping
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || validatedData.validRows.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing into Inventory...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Execute Import ({validatedData.validRows.length} rows)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: RESULTS SUMMARY */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-5 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-600/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Inventory Import Completed Successfully
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Spreadsheet <strong>{fileName}</strong> was parsed, validated, and saved to the IT inventory ledger.
              </p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Processed</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{importSummary.total}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Created New</span>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">{importSummary.imported}</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700">Updated</span>
                <p className="text-xl font-bold text-indigo-800 mt-0.5">{importSummary.updated}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Skipped / Failed</span>
                <p className="text-xl font-bold text-slate-700 mt-0.5">
                  {importSummary.skipped + importSummary.failed}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
              >
                Close & View Inventory Assets
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
