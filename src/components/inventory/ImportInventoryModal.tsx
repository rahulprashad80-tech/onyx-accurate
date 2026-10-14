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
  ComputerStatus,
  Employee,
} from '../../types';
import { AuditLogService } from '../../services/AuditLogService';
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
  User,
  Users,
  Clock,
  ShieldCheck,
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

export type AssignmentStatusType = 'matched' | 'pending' | 'multiple_matches' | 'unassigned';

export interface ValidatedRowItem {
  rowNumber: number;
  data: Partial<Computer>;
  isDuplicate: boolean;
  existingId?: string;
  rawAssetTag: string;
  rawAssetNumber: string;
  rawCompany: string;
  resolvedCompanyName?: string;
  rawDepartment: string;
  resolvedDeptName?: string;
  rawEmpName: string;
  rawAssetUserName: string;
  matchedEmployee?: Employee;
  multipleMatches?: Employee[];
  assignmentStatus: AssignmentStatusType;
  assignmentStatusLabel: string;
}

const TARGET_FIELDS: TargetFieldDef[] = [
  // 1. Asset ID
  { key: 'assetTag', label: 'Asset ID / Tag', required: true, aliases: ['asset tag', 'tag', 'assettag', 'asset_tag', 'id', 'asset id', 'asset_id', 'barcode', 'property tag'] },
  // 2. Company
  { key: 'companyId', label: 'Company', required: false, aliases: ['company', 'company name', 'entity', 'organization', 'org', 'company id'] },
  // 3. Asset Type
  { key: 'type', label: 'Asset Type', required: false, aliases: ['asset type', 'type', 'device type', 'category', 'hardware type'] },
  // 4. Asset Number
  { key: 'assetNumber', label: 'Asset Number', required: false, aliases: ['asset number', 'asset no', 'asset no.', 'asset #', 'assetnumber', 'asset_number', 'property tag'] },
  // 5. Condition
  { key: 'condition', label: 'Condition', required: false, aliases: ['condition', 'hardware condition', 'health', 'state'] },
  // 6. Assigned Employee Name
  { key: 'assignedEmployeeName', label: 'Assigned Employee Name', required: false, aliases: ['assigned employee name', 'assigned employee', 'employee', 'employee name', 'assigned to', 'user', 'custodian', 'assignee', 'custodian name'] },
  // 7. Asset User Name (Primary employee matching field)
  { key: 'assetUserName', label: 'Asset User Name / Custodian', required: false, aliases: ['asset user name', 'asset username', 'asset user', 'custodian username', 'username', 'user name', 'custodian name', 'device user', 'asset user id'] },
  // 8. Department
  { key: 'departmentId', label: 'Department', required: false, aliases: ['department', 'dept', 'division', 'unit', 'department id'] },
  // 9. Location
  { key: 'location', label: 'Location', required: false, aliases: ['location', 'site', 'office', 'floor', 'room', 'physical location', 'branch'] },
  // 10. IP Adresss
  { key: 'ipAddress', label: 'IP Address', required: false, aliases: ['ip address', 'ip adresss', 'ip', 'ip_address', 'network ip'] },
  // 11. Serial Number
  { key: 'serialNumber', label: 'Serial Number', required: false, aliases: ['serial number', 'serial', 'serial no', 's/n', 'serialnumber', 'sn'] },
  // 12. Manufacturer / Brand
  { key: 'brand', label: 'Manufacturer', required: false, aliases: ['manufacturer', 'brand', 'make', 'oem', 'mfg'] },
  // 13. Model
  { key: 'model', label: 'Model', required: false, aliases: ['model', 'model name', 'product model', 'machine model'] },
  // 14. Processor / CPU
  { key: 'cpu', label: 'Processor', required: false, aliases: ['processor', 'cpu', 'chip', 'processor name'] },
  // 15. Purchase Date
  { key: 'purchaseDate', label: 'Purchase Date', required: false, aliases: ['purchase date', 'procurement date', 'bought date', 'date purchased', 'dop'] },
  // 16. New (NH)/ Old (SH)
  { key: 'procurementType', label: 'New (NH)/ Old (SH)', required: false, aliases: ['new (nh)/ old (sh)', 'nh/sh', 'new/old', 'procurement type', 'new or old', 'condition type'] },
  // 17. Storage
  { key: 'storage', label: 'Storage', required: false, aliases: ['storage', 'disk', 'ssd', 'hdd', 'hard drive', 'rom'] },
  // 18. RAM
  { key: 'ram', label: 'RAM', required: false, aliases: ['ram', 'memory', 'ram size', 'memory size'] },
  // 19. WINDOWS VERSION
  { key: 'os', label: 'WINDOWS VERSION', required: false, aliases: ['windows version', 'windows', 'operating system', 'os', 'os version', 'platform'] },
  // 20. MSOFFICE
  { key: 'msOffice', label: 'MSOFFICE', required: false, aliases: ['msoffice', 'ms office', 'office version', 'microsoft office', 'office'] },
  // 21. ESCAN
  { key: 'escan', label: 'ESCAN', required: false, aliases: ['escan', 'e-scan', 'antivirus', 'av', 'security suite'] },
  // 22. Motherboard
  { key: 'motherboard', label: 'Motherboard', required: false, aliases: ['motherboard', 'mainboard', 'mobo', 'system board'] },
  // 23. Display
  { key: 'display', label: 'Display', required: false, aliases: ['display', 'screen', 'monitor brand', 'display panel'] },
  // 24. Display Size
  { key: 'displaySize', label: 'Display Size', required: false, aliases: ['display size', 'screen size', 'monitor size', 'inches', 'panel size'] },
  // 25. Lan Card
  { key: 'lanCard', label: 'Lan Card', required: false, aliases: ['lan card', 'ethernet', 'nic', 'network card', 'lan'] },
  // 26. Ups/ Battery
  { key: 'upsBattery', label: 'Ups/ Battery', required: false, aliases: ['ups/ battery', 'ups', 'battery', 'battery health', 'ups/battery', 'power'] },
  // 27. Warranty Start
  { key: 'warrantyStart', label: 'Warranty Start', required: false, aliases: ['warranty start', 'warranty begin', 'start warranty', 'warranty date from'] },
  // 28. Warranty End
  { key: 'warrantyExpiration', label: 'Warranty End', required: false, aliases: ['warranty end', 'warranty expiry', 'warranty expiration', 'warranty', 'end warranty'] },

  // Operational extra columns
  { key: 'hostname', label: 'Hostname', required: false, aliases: ['hostname', 'computer name', 'host name', 'machine name', 'pc name'] },
  { key: 'vendor', label: 'Vendor / Supplier', required: false, aliases: ['vendor', 'supplier', 'seller', 'reseller'] },
  { key: 'purchaseCost', label: 'Purchase Cost', required: false, aliases: ['purchase cost', 'cost', 'price', 'amount'] },
  { key: 'assignedDate', label: 'Assigned Date', required: false, aliases: ['assigned date', 'checkout date'] },
  { key: 'notes', label: 'Notes', required: false, aliases: ['notes', 'comments', 'remarks', 'description'] },
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
    createInventorySnapshot,
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

  // Preview tab filter: 'all' | 'matched' | 'pending' | 'multiple' | 'duplicate'
  const [previewFilter, setPreviewFilter] = useState<'all' | 'matched' | 'pending' | 'multiple' | 'duplicate'>('all');

  // Validation output
  const [validatedData, setValidatedData] = useState<{
    validRows: ValidatedRowItem[];
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
    assignedCount: number;
    pendingCount: number;
    multipleCount: number;
    unmatchedList: ValidatedRowItem[];
  }>({
    total: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    assignedCount: 0,
    pendingCount: 0,
    multipleCount: 0,
    unmatchedList: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Download official Excel Template
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'Asset ID',
      'Asset Number',
      'Company',
      'Department',
      'Assigned Employee Name',
      'Asset User Name',
      'Serial Number',
      'Asset Type',
      'Brand',
      'Model',
      'Operating System',
      'CPU',
      'RAM',
      'Storage',
      'Purchase Date',
      'Warranty End',
      'Physical Location',
      'Condition',
      'Status',
      'Notes',
    ];

    const sampleRow = [
      'AST-1001',
      'IT-0042',
      'AGIPL',
      'PRODUCTION',
      'Tejaswini Singh',
      'cmmda1',
      'PF399XY8',
      'laptop',
      'Lenovo',
      'ThinkPad T14s Gen 4',
      'Windows 11 Pro',
      'Intel Core i7-1365U',
      '16 GB',
      '512 GB SSD',
      '2024-03-15',
      '2027-03-15',
      'Floor 2 Cubicle 412',
      'good',
      'assigned',
      'Primary engineering laptop.',
    ];

    const sampleRow2 = [
      'AST-1002',
      'IT-0043',
      'ASSPL',
      'IT',
      'Sameer Tupe',
      'sameertupe',
      'C02G8721MD6T',
      'desktop',
      'Dell',
      'OptiPlex 7090',
      'Windows 11 Pro',
      'Intel Core i7-11700',
      '32 GB',
      '1 TB NVMe',
      '2024-01-10',
      '2027-01-10',
      'IT Operations Center',
      'new',
      'assigned',
      'IT management workstation.',
    ];

    const sampleRow3 = [
      'AST-1003',
      'IT-0044',
      'AGIPL',
      'IT',
      'Unassigned Storage Pool',
      '',
      'SN-AST-1003',
      'laptop',
      'Dell',
      'Latitude 5430',
      'Windows 11 Pro',
      'Intel Core i5-1235U',
      '16 GB',
      '512 GB SSD',
      '2024-05-01',
      '2027-05-01',
      'IT Lab Storage Shelf A',
      'good',
      'available',
      'Ready for new hire deployment.',
    ];

    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, sampleRow, sampleRow2, sampleRow3]);

    // Set column widths
    ws['!cols'] = templateHeaders.map(() => ({ wch: 22 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory_Template');

    XLSX.writeFile(wb, 'IT_Inventory_Import_Template.xlsx');
    showToast({
      title: 'Template Downloaded',
      message: 'Downloaded "IT_Inventory_Import_Template.xlsx". Columns include Asset ID, Asset Number, Company, Department, Assigned Employee Name, and Asset User Name.',
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

  // 3. Process Mapping & Perform Row-by-Row Validation with Automated Employee Matching
  const handleProceedToValidation = () => {
    if (!columnMapping.assetTag) {
      showToast({
        title: 'Mapping Incomplete',
        message: 'Please map the required "Asset Tag / Asset ID" column to continue.',
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

    const validRows: ValidatedRowItem[] = [];
    const errorRows: { rowNumber: number; raw: Record<string, any>; error: string }[] = [];

    // Helper for normalization
    const normalizeString = (s?: string) => (s ? s.trim().toLowerCase().replace(/^@+/, '') : '');

    // Helper for company / dept mapping
    const findCompany = (val?: string) => {
      if (!val) return undefined;
      const clean = val.toLowerCase().trim();
      return companies.find((c) => c.name.toLowerCase() === clean || c.code.toLowerCase() === clean || c.id === clean);
    };

    const findDept = (val?: string, coId?: string) => {
      if (!val) return undefined;
      const clean = val.toLowerCase().trim();
      return departments.find((d) => (!coId || d.companyId === coId) && (d.name.toLowerCase() === clean || (d.code && d.code.toLowerCase() === clean) || d.id === clean));
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

      // Required validation: Asset Tag / Asset ID
      if (!assetTag) {
        errorRows.push({
          rowNumber: rowNum,
          raw: rawObj,
          error: 'Missing required field: Asset Tag / Asset ID is blank.',
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

      // Read columns: Company, Department, Asset Number, Assigned Employee Name, Asset User Name
      const rawAssetNumber = getVal('assetNumber');
      const rawCompany = getVal('companyId');
      const rawDept = getVal('departmentId');
      const rawEmpName = getVal('assignedEmployeeName');
      const rawAssetUserName = getVal('assetUserName');

      const compObj = findCompany(rawCompany);
      const deptObj = findDept(rawDept, compObj?.id);

      // AUTOMATED MATCHING LOGIC
      // Primary: Asset User Name
      // Priority 1: Exact normalized username match against Firebase/Firestore employee records
      // Priority 2: If username is missing, match exact normalized employee name, using Company as additional condition
      // Priority 3: If multiple employees match, flag Multiple Matches — Review Required
      const normUser = normalizeString(rawAssetUserName);
      const normName = normalizeString(rawEmpName);

      let matchedEmployee: Employee | undefined = undefined;
      let multipleMatches: Employee[] | undefined = undefined;
      let assignmentStatus: AssignmentStatusType = 'unassigned';
      let assignmentStatusLabel = 'Unassigned (In Pool)';

      if (normUser) {
        // Priority 1: Search existing employees in Firebase for matching username
        const userMatches = employees.filter((e) => normalizeString(e.username) === normUser);

        if (userMatches.length === 1) {
          // Unique matching employee found -> automatically assign
          matchedEmployee = userMatches[0];
          assignmentStatus = 'matched';
          assignmentStatusLabel = 'Matched — Ready to Assign';
        } else if (userMatches.length > 1) {
          // Multiple matching employees found -> flag for manual review, do not guess
          multipleMatches = userMatches;
          assignmentStatus = 'multiple_matches';
          assignmentStatusLabel = 'Multiple Matches — Review Required';
        } else {
          // Username provided in Excel but not found in Firebase -> Assignment Pending
          assignmentStatus = 'pending';
          assignmentStatusLabel = 'Assignment Pending';
        }
      } else if (normName && normName !== 'unassigned' && normName !== 'in storage' && normName !== 'spare' && normName !== 'none') {
        // Priority 2: Username is missing, match exact normalized employee name with company disambiguation
        let nameMatches = employees.filter((e) => normalizeString(e.fullName) === normName);

        if (nameMatches.length > 1 && compObj?.id) {
          const coFiltered = nameMatches.filter((e) => e.companyId === compObj.id);
          if (coFiltered.length > 0) {
            nameMatches = coFiltered;
          }
        }

        if (nameMatches.length === 1) {
          matchedEmployee = nameMatches[0];
          assignmentStatus = 'matched';
          assignmentStatusLabel = 'Matched — Ready to Assign';
        } else if (nameMatches.length > 1) {
          multipleMatches = nameMatches;
          assignmentStatus = 'multiple_matches';
          assignmentStatusLabel = 'Multiple Matches — Review Required';
        } else {
          // Display name provided in Excel but not matched in database
          assignmentStatus = 'pending';
          assignmentStatusLabel = 'Assignment Pending';
        }
      }

      // Normalize types and enums
      const rawType = getVal('type').toLowerCase().replace(/\s+/g, '_');
      const validTypes: ComputerType[] = ['desktop', 'laptop', 'monitor', 'printer', 'server', 'network_device', 'workstation', 'tablet', 'other'];
      const type: ComputerType = validTypes.includes(rawType as ComputerType) ? (rawType as ComputerType) : 'laptop';

      const rawCondition = getVal('condition').toLowerCase();
      const validConditions: ComputerCondition[] = ['new', 'good', 'fair', 'damaged'];
      const condition: ComputerCondition = validConditions.includes(rawCondition as ComputerCondition) ? (rawCondition as ComputerCondition) : 'good';

      const rawStatus = getVal('status').toLowerCase().replace(/\s+/g, '_');
      const validStatuses: ComputerStatus[] = ['available', 'assigned', 'in_use', 'under_repair', 'maintenance', 'retired', 'lost'];
      let status: ComputerStatus = validStatuses.includes(rawStatus as ComputerStatus) ? (rawStatus as ComputerStatus) : 'available';

      // When an asset is successfully matched to an employee, set status to assigned
      if (assignmentStatus === 'matched') {
        status = 'assigned';
      }

      // Build parsed asset payload
      const parsedAsset: Partial<Computer> = {
        assetTag,
        assetNumber: rawAssetNumber || undefined,
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
        companyId: compObj?.id || matchedEmployee?.companyId || undefined,
        company: compObj?.name || matchedEmployee?.companyName || rawCompany || undefined,
        departmentId: deptObj?.id || matchedEmployee?.departmentId || undefined,
        department: deptObj?.name || matchedEmployee?.departmentName || rawDept || undefined,

        // Employee Assignment persistence
        assignedEmployeeId: assignmentStatus === 'matched' ? matchedEmployee?.id : undefined,
        assignedEmployeeName: assignmentStatus === 'matched' 
          ? matchedEmployee?.fullName 
          : (rawEmpName || undefined),
        assetUserName: assignmentStatus === 'matched'
          ? (matchedEmployee?.username || rawAssetUserName || undefined)
          : (rawAssetUserName || undefined),
        assignmentStatus,
        assignedDate: assignmentStatus === 'matched' ? (getVal('assignedDate') || new Date().toISOString().split('T')[0]) : undefined,
        notes: getVal('notes') || undefined,
      };

      validRows.push({
        rowNumber: rowNum,
        data: parsedAsset,
        isDuplicate,
        existingId: existingAsset?.id,
        rawAssetTag: assetTag,
        rawAssetNumber,
        rawCompany,
        resolvedCompanyName: compObj?.name,
        rawDepartment: rawDept,
        resolvedDeptName: deptObj?.name,
        rawEmpName,
        rawAssetUserName,
        matchedEmployee,
        multipleMatches,
        assignmentStatus,
        assignmentStatusLabel,
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

    const actorName = userProfile?.displayName || currentUser?.fullName || 'IT Administrator';
    const now = new Date().toISOString();

    // Create automatic recoverable pre-import snapshot before writing rows
    try {
      await createInventorySnapshot({
        name: `Pre-Import Backup (${fileName || 'Excel Import'})`,
        description: `Automated safety snapshot created immediately before importing ${validatedData.validRows.length} assets from spreadsheet "${fileName}"`,
        operationType: 'pre_import',
        reason: `Pre-import backup prior to Excel spreadsheet intake (${fileName})`,
      });
    } catch (snapErr: any) {
      console.error('Pre-import snapshot failed:', snapErr);
      showToast({
        title: 'Import Aborted',
        message: `Safety snapshot could not be created: ${snapErr?.message || 'Database error'}. Import stopped to protect inventory data.`,
        type: 'error',
      });
      setIsImporting(false);
      return;
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let assignedCount = 0;
    let pendingCount = 0;
    let multipleCount = 0;
    const unmatchedList: ValidatedRowItem[] = [];

    for (const item of validatedData.validRows) {
      try {
        if (item.assignmentStatus === 'matched') {
          assignedCount++;
        } else if (item.assignmentStatus === 'pending') {
          pendingCount++;
          unmatchedList.push(item);
        } else if (item.assignmentStatus === 'multiple_matches') {
          multipleCount++;
          unmatchedList.push(item);
        }

        if (item.isDuplicate && item.existingId) {
          if (duplicateStrategy === 'skip') {
            skippedCount++;
            continue;
          } else {
            // Update existing asset
            const existingAsset = computers.find((c) => c.id === item.existingId);
            const updatePayload: Record<string, any> = {
              updatedAt: now,
            };
            Object.entries(item.data).forEach(([k, v]) => {
              if (v !== undefined) {
                updatePayload[k] = v;
              }
            });

            // Safeguard (Rule 4): Do not overwrite a valid existing assignment with blank Excel values
            if (!item.rawAssetUserName && !item.rawEmpName && existingAsset?.assignedEmployeeId) {
              delete updatePayload.assignedEmployeeId;
              delete updatePayload.assignedEmployeeName;
              delete updatePayload.assetUserName;
              delete updatePayload.assignmentStatus;
              delete updatePayload.status;
            }

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
          // Create new asset with all fields
          const compPayload: Record<string, any> = {
            assetTag: item.data.assetTag!,
            serialNumber: item.data.serialNumber || `SN-${item.data.assetTag}`,
            type: item.data.type || 'laptop',
            brand: item.data.brand || 'Generic',
            manufacturer: item.data.brand || 'Generic',
            model: item.data.model || 'Enterprise Unit',
            condition: item.data.condition || 'good',
            status: item.data.status || 'available',
          };

          if (item.data.assetNumber) compPayload.assetNumber = item.data.assetNumber;
          if (item.data.assetUserName) compPayload.assetUserName = item.data.assetUserName;
          if (item.data.assignmentStatus) compPayload.assignmentStatus = item.data.assignmentStatus;
          if (item.data.assignedEmployeeId) compPayload.assignedEmployeeId = item.data.assignedEmployeeId;
          if (item.data.assignedEmployeeName) compPayload.assignedEmployeeName = item.data.assignedEmployeeName;
          if (item.data.assignedDate) compPayload.assignedDate = item.data.assignedDate;
          if (item.data.companyId) compPayload.companyId = item.data.companyId;
          if (item.data.company) compPayload.company = item.data.company;
          if (item.data.departmentId) compPayload.departmentId = item.data.departmentId;
          if (item.data.department) compPayload.department = item.data.department;
          if (item.data.location) compPayload.location = item.data.location;
          if (item.data.ipAddress) compPayload.ipAddress = item.data.ipAddress;
          if (item.data.hostname) compPayload.hostname = item.data.hostname;
          if (item.data.os) {
            compPayload.os = item.data.os;
            compPayload.windowsVersion = item.data.os;
          }
          if (item.data.cpu) {
            compPayload.cpu = item.data.cpu;
            compPayload.processor = item.data.cpu;
          }
          if (item.data.ram) compPayload.ram = item.data.ram;
          if (item.data.storage) compPayload.storage = item.data.storage;
          if (item.data.procurementType) compPayload.procurementType = item.data.procurementType;
          if (item.data.purchaseDate) compPayload.purchaseDate = item.data.purchaseDate;
          if (item.data.purchaseCost) compPayload.purchaseCost = item.data.purchaseCost;
          if (item.data.warrantyStart) compPayload.warrantyStart = item.data.warrantyStart;
          if (item.data.warrantyExpiration) compPayload.warrantyExpiration = item.data.warrantyExpiration;
          if (item.data.msOffice) compPayload.msOffice = item.data.msOffice;
          if (item.data.escan) compPayload.escan = item.data.escan;
          if (item.data.motherboard) compPayload.motherboard = item.data.motherboard;
          if (item.data.display) compPayload.display = item.data.display;
          if (item.data.displaySize) compPayload.displaySize = item.data.displaySize;
          if (item.data.lanCard) compPayload.lanCard = item.data.lanCard;
          if (item.data.upsBattery) compPayload.upsBattery = item.data.upsBattery;
          if (item.data.vendor) compPayload.vendor = item.data.vendor;
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
      assignedCount,
      pendingCount,
      multipleCount,
      unmatchedList,
    };

    setImportSummary(summary);
    setIsImporting(false);
    setCurrentStep(4);

    if (onImportComplete) {
      onImportComplete();
    }

    // System audit log
    await addOrganizationAuditEntry({
      type: 'imported',
      actorName,
      actorRole: 'admin',
      message: `Completed Excel inventory import (${fileName}): ${importedCount} created, ${updatedCount} updated, ${assignedCount} auto-assigned to employee accounts`,
      timestamp: now,
    });

    // Save to dedicated Firestore 'auditLogs' collection via AuditLogService
    await AuditLogService.recordAction({
      action: 'excel_import',
      actingUserId: currentUser?.id || 'usr-admin',
      actingUserName: actorName,
      actingUserRole: 'admin',
      actingUserEmail: currentUser?.email,
      affectedAssetCount: importedCount + updatedCount,
      details: `Spreadsheet import "${fileName}": ${importedCount} created, ${updatedCount} updated, ${assignedCount} auto-assigned to employee accounts`,
      metadata: { fileName, importedCount, updatedCount, skippedCount, assignedCount, pendingCount },
    }).catch(() => {});

    showToast({
      title: 'Import Completed',
      message: `Successfully processed ${summary.total} rows (${importedCount} new, ${updatedCount} updated, ${assignedCount} assigned).`,
      type: 'success',
    });
  };

  // Filtered rows for Step 3 Preview
  const displayedPreviewRows = validatedData.validRows.filter((r) => {
    if (previewFilter === 'matched') return r.assignmentStatus === 'matched';
    if (previewFilter === 'pending') return r.assignmentStatus === 'pending';
    if (previewFilter === 'multiple') return r.assignmentStatus === 'multiple_matches';
    if (previewFilter === 'duplicate') return r.isDuplicate;
    return true;
  });

  const matchedCount = validatedData.validRows.filter((r) => r.assignmentStatus === 'matched').length;
  const pendingCount = validatedData.validRows.filter((r) => r.assignmentStatus === 'pending').length;
  const multipleCount = validatedData.validRows.filter((r) => r.assignmentStatus === 'multiple_matches').length;
  const duplicateCount = validatedData.validRows.filter((r) => r.isDuplicate).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Hardware Inventory Spreadsheet"
      subtitle="Bulk import assets from Excel (.xlsx, .xls) or CSV with automatic employee assignment"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              1
            </span>
            <span className={`text-xs font-semibold ${currentStep === 1 ? 'text-indigo-600' : 'text-slate-500'}`}>
              Upload Spreadsheet
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={`text-xs font-semibold ${currentStep === 2 ? 'text-indigo-600' : 'text-slate-500'}`}>
              Map Columns
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              3
            </span>
            <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-indigo-600' : 'text-slate-500'}`}>
              Preview & Assign
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-200" />

          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              4
            </span>
            <span className={`text-xs font-semibold ${currentStep === 4 ? 'text-emerald-600' : 'text-slate-500'}`}>
              Results
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STEP 1: UPLOAD */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drop your inventory Excel spreadsheet here
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Supports .xlsx, .xls, and .csv files. Columns for <strong>Asset ID</strong>, <strong>Asset Number</strong>, <strong>Company</strong>, <strong>Assigned Employee Name</strong>, and <strong>Asset User Name</strong> will be automatically read and matched.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {isParsing && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-indigo-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reading and analyzing workbook sheets...</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Need the official inventory schema template?</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Download our formatted spreadsheet template containing all standard enterprise asset columns.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template (.xlsx)</span>
              </button>
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
                <h3 className="text-xs font-bold text-slate-800">Verify Column Mappings</h3>
                <p className="text-[11px] text-slate-500">
                  Spreadsheet: <strong>{fileName}</strong> ({rawRows.length} data rows detected)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Choose different file
              </button>
            </div>

            {/* Crucial Employee Assignment mapping banner */}
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-start gap-2.5 text-xs text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Automated Employee Matching Active: </span>
                Ensure <strong>Asset User Name</strong> is mapped to your spreadsheet's username column (e.g. <em>cmmda1</em>, <em>sameertupe</em>). The system searches your active Firebase employee accounts to automatically assign each computer without manual dropdown selection.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
              {TARGET_FIELDS.map((tf) => (
                <div
                  key={tf.key}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      <span>{tf.label}</span>
                      {tf.required && <span className="text-rose-500 font-bold">*</span>}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Key: <code className="font-mono">{String(tf.key)}</code>
                    </p>
                  </div>

                  <div className="w-48 shrink-0">
                    <select
                      value={columnMapping[tf.key] || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [tf.key]: e.target.value,
                        }))
                      }
                      className={`w-full text-xs rounded-lg border px-2.5 py-1.5 bg-white ${
                        tf.required && !columnMapping[tf.key]
                          ? 'border-rose-400 bg-rose-50/30'
                          : columnMapping[tf.key]
                          ? 'border-emerald-400 bg-emerald-50/20 text-emerald-950 font-medium'
                          : 'border-slate-300'
                      }`}
                    >
                      <option value="">-- Ignore Column --</option>
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
        {/* STEP 3: PREVIEW & VALIDATION WITH EMPLOYEE MATCH STATUS */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* Validation Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {validatedData.validRows.length + validatedData.errorRows.length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Matched Users</span>
                </span>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">
                  {matchedCount}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Pending Match</span>
                </span>
                <p className="text-xl font-bold text-amber-800 mt-0.5">
                  {pendingCount}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-[10px] uppercase font-bold text-purple-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Review Required</span>
                </span>
                <p className="text-xl font-bold text-purple-800 mt-0.5">
                  {multipleCount}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500">Duplicates in DB</span>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {duplicateCount}
                </p>
              </div>
            </div>

            {/* Duplicate Handling Strategy */}
            {duplicateCount > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Existing Asset Tags / Serial Numbers Detected ({duplicateCount})</span>
                </div>
                <p className="text-xs text-amber-800">
                  {duplicateCount} assets already exist in your inventory database. Choose how to handle duplicates:
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
                    <span>Update existing assets with imported data (preserve valid assignments if blank)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateStrategy === 'skip'}
                      onChange={() => setDuplicateStrategy('skip')}
                      className="text-indigo-600"
                    />
                    <span>Skip duplicate rows (keep current database records unchanged)</span>
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

            {/* Filter tabs for Preview */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    previewFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Rows ({validatedData.validRows.length})
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('matched')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    previewFilter === 'matched'
                      ? 'bg-emerald-700 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Matched ({matchedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('pending')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    previewFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Pending ({pendingCount})</span>
                </button>

                {multipleCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('multiple')}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                      previewFilter === 'multiple'
                        ? 'bg-purple-700 text-white'
                        : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Review Required ({multipleCount})</span>
                  </button>
                )}

                {duplicateCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('duplicate')}
                    className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                      previewFilter === 'duplicate'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Duplicates ({duplicateCount})
                  </button>
                )}
              </div>

              <span className="text-[11px] text-slate-400 shrink-0">
                Showing {displayedPreviewRows.length} of {validatedData.validRows.length} rows
              </span>
            </div>

            {/* PREVIEW TABLE WITH ALL 7 REQUIRED COLUMNS */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px] z-10">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      {/* Required column 1 */}
                      <th className="py-2.5 px-3">Asset ID</th>
                      {/* Required column 2 */}
                      <th className="py-2.5 px-3">Asset Number</th>
                      {/* Required column 3 */}
                      <th className="py-2.5 px-3">Company</th>
                      {/* Required column 4 */}
                      <th className="py-2.5 px-3">Assigned Employee Name</th>
                      {/* Required column 5 */}
                      <th className="py-2.5 px-3">Asset User Name</th>
                      {/* Required column 6 */}
                      <th className="py-2.5 px-3">Matched Employee</th>
                      {/* Required column 7 */}
                      <th className="py-2.5 px-3">Assignment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedPreviewRows.map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">#{r.rowNumber}</td>

                        {/* 1. Asset ID */}
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {r.rawAssetTag}
                          </span>
                        </td>

                        {/* 2. Asset Number */}
                        <td className="py-2 px-3 text-slate-700 font-mono">
                          {r.rawAssetNumber || <span className="text-slate-300">—</span>}
                        </td>

                        {/* 3. Company */}
                        <td className="py-2 px-3 text-slate-700">
                          {r.resolvedCompanyName || r.rawCompany || <span className="text-slate-300">—</span>}
                        </td>

                        {/* 4. Assigned Employee Name */}
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {r.rawEmpName || <span className="text-slate-300">—</span>}
                        </td>

                        {/* 5. Asset User Name */}
                        <td className="py-2 px-3">
                          {r.rawAssetUserName ? (
                            <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              @{r.rawAssetUserName}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* 6. Matched Employee */}
                        <td className="py-2 px-3">
                          {r.matchedEmployee ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-emerald-900">
                                {r.matchedEmployee.fullName}
                              </span>
                              {r.matchedEmployee.username && (
                                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                                  @{r.matchedEmployee.username}
                                </span>
                              )}
                            </div>
                          ) : r.assignmentStatus === 'multiple_matches' ? (
                            <span className="text-purple-700 font-semibold text-[11px]">
                              {r.multipleMatches?.length || 2} matching records in database
                            </span>
                          ) : r.assignmentStatus === 'pending' ? (
                            <span className="text-amber-700 italic text-[11px]">
                              No account for "{r.rawAssetUserName || r.rawEmpName}"
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">None (In storage pool)</span>
                          )}
                        </td>

                        {/* 7. Assignment Status Badge */}
                        <td className="py-2 px-3">
                          {r.assignmentStatus === 'matched' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Matched — Ready to Assign</span>
                            </span>
                          ) : r.assignmentStatus === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Assignment Pending</span>
                            </span>
                          ) : r.assignmentStatus === 'multiple_matches' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Multiple Matches — Review Required</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              Unassigned (In Pool)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
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
                    <span>Importing & Assigning Hardware...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Execute Import ({validatedData.validRows.length} assets)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: RESULTS SUMMARY & UNMATCHED RECORDS REPORT */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-5 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-600/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Inventory Import & Assignment Completed
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Spreadsheet <strong>{fileName}</strong> was parsed, validated, and saved to the hardware inventory.
              </p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Processed</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{importSummary.total}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Created New</span>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">{importSummary.imported}</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700">Updated Existing</span>
                <p className="text-xl font-bold text-indigo-800 mt-0.5">{importSummary.updated}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Auto-Assigned</span>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">{importSummary.assignedCount}</p>
              </div>
            </div>

            {/* Unmatched / Pending records report */}
            {importSummary.unmatchedList.length > 0 && (
              <div className="max-w-2xl mx-auto text-left p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Unmatched Assets Marked as Assignment Pending ({importSummary.unmatchedList.length})</span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800">
                  The following assets were saved to Hardware Inventory with their spreadsheet employee and username preserved, but could not be linked because no matching employee account exists in Firebase. You can link them once employee accounts are created.
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 pt-1">
                  {importSummary.unmatchedList.map((item) => (
                    <div
                      key={item.rowNumber}
                      className="text-xs bg-white/80 p-2 rounded-lg border border-amber-200/70 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-indigo-700">{item.rawAssetTag}</span>
                        {item.rawAssetNumber && <span className="text-slate-500">({item.rawAssetNumber})</span>}
                      </div>
                      <div className="text-[11px] text-slate-700 flex items-center gap-2">
                        <span>{item.rawEmpName || 'Unknown Custodian'}</span>
                        {item.rawAssetUserName && (
                          <span className="font-mono text-slate-500">@{item.rawAssetUserName}</span>
                        )}
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          {item.assignmentStatus === 'multiple_matches' ? 'Multiple Matches' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
