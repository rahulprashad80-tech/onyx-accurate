import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { LocationModal } from '../locations/LocationModal';
import { PrinterConsumableModal } from './PrinterConsumableModal';
import {
  Computer,
  ComputerType,
  ComputerCondition,
  ComputerStatus,
  ComputerAttachment,
  ComputerAuditEntry,
  PrinterType,
  PrinterFunction,
  PrinterColorMode,
  DuplexPrinting,
  PrinterConsumable,
  NetworkDeviceCategory,
  NetworkDeviceStatus,
  NetworkPortType,
  VlanEntry,
} from '../../types';
import {
  AlertCircle,
  Trash2,
  Upload,
  FileText,
  ShieldCheck,
  Image as ImageIcon,
  File,
  Monitor,
  User,
  MapPin,
  Building2,
  Plus,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Layers,
  Printer,
  Network,
  Droplets,
  RotateCcw,
  Wifi,
  Radio,
  Server,
  Hash,
  Activity,
  Edit,
} from 'lucide-react';

interface ComputerModalProps {
  computer: Computer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ComputerModal: React.FC<ComputerModalProps> = ({ computer, isOpen, onClose }) => {
  const { userProfile, activeRole } = useAuth();
  const {
    createComputer,
    updateComputer,
    computers,
    employees,
    companies,
    departments,
    locations,
  } = useData();

  // Primary Asset Type
  const [type, setType] = useState<ComputerType>('laptop');

  // Active form tab
  const [activeTab, setActiveTab] = useState<string>('details');

  // Common Identity & Asset fields
  const [assetTag, setAssetTag] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [assetName, setAssetName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [hostname, setHostname] = useState('');
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState<ComputerCondition>('good');
  const [status, setStatus] = useState<ComputerStatus>('available');

  // Common Custody, Assignment & Location
  const [assetUserName, setAssetUserName] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [location, setLocation] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [assignedDate, setAssignedDate] = useState('');
  const [returnedDate, setReturnedDate] = useState('');
  const [isEmployeeTouched, setIsEmployeeTouched] = useState(false);

  // Common Procurement, Invoicing & AMC
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [warrantyStart, setWarrantyStart] = useState('');
  const [warrantyExpiration, setWarrantyExpiration] = useState('');
  const [amcStart, setAmcStart] = useState('');
  const [amcEnd, setAmcEnd] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState('');

  // Category A: PC / Laptop Specific
  const [os, setOs] = useState('Windows 11 Pro');
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('16 GB');
  const [storage, setStorage] = useState('512 GB SSD');
  const [specs, setSpecs] = useState('');

  // Category B: Printer Specific
  const [printerType, setPrinterType] = useState<PrinterType>('laser');
  const [printerFunction, setPrinterFunction] = useState<PrinterFunction>('print_scan_copy');
  const [printerName, setPrinterName] = useState('');
  const [printerIpAddress, setPrinterIpAddress] = useState('');
  const [printerMacAddress, setPrinterMacAddress] = useState('');
  const [connectivity, setConnectivity] = useState<string[]>(['Ethernet', 'Wi-Fi']);
  const [colorMode, setColorMode] = useState<PrinterColorMode>('monochrome');
  const [duplexPrinting, setDuplexPrinting] = useState<DuplexPrinting>('yes');
  const [pageCounter, setPageCounter] = useState<string>('0');
  const [consumables, setConsumables] = useState<PrinterConsumable[]>([]);

  // Category C: Network Equipment Specific
  const [deviceCategory, setDeviceCategory] = useState<NetworkDeviceCategory>('switch');
  const [deviceStatus, setDeviceStatus] = useState<NetworkDeviceStatus>('active');
  const [managementIp, setManagementIp] = useState('');
  const [networkMacAddress, setNetworkMacAddress] = useState('');
  const [interfaceType, setInterfaceType] = useState('Gigabit RJ-45 & SFP+');
  const [portCount, setPortCount] = useState<string>('24');
  const [portType, setPortType] = useState<NetworkPortType>('ethernet');
  const [portSpeed, setPortSpeed] = useState('10/100/1000 Mbps');
  const [vlanDetails, setVlanDetails] = useState('VLAN 1 (Default), VLAN 10 (Data), VLAN 20 (Voice)');
  const [vlans, setVlans] = useState<VlanEntry[]>([]);
  const [firmwareVersion, setFirmwareVersion] = useState('v15.2(4)E7');
  const [firmwareUpdateDate, setFirmwareUpdateDate] = useState('');
  const [configBackupDate, setConfigBackupDate] = useState('');
  const [rackNumber, setRackNumber] = useState('Rack 01');
  const [rackPosition, setRackPosition] = useState('U12 - U13');
  const [roomLocation, setRoomLocation] = useState('Main Server Room B1');
  const [connectedSwitchName, setConnectedSwitchName] = useState('');
  const [connectedSwitchPort, setConnectedSwitchPort] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');

  // Common Documentation & Notes
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<ComputerAttachment[]>([]);
  const [newAttachmentCategory, setNewAttachmentCategory] = useState<
    'invoice' | 'warranty' | 'photo' | 'other'
  >('invoice');

  // Sub-modals
  const [isQuickLocationModalOpen, setIsQuickLocationModalOpen] = useState(false);
  const [isConsumableModalOpen, setIsConsumableModalOpen] = useState(false);
  const [consumableToEdit, setConsumableToEdit] = useState<PrinterConsumable | null>(null);
  const [consumableModalMode, setConsumableModalMode] = useState<'create' | 'edit' | 'replace'>('create');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize initial state
  useEffect(() => {
    setIsEmployeeTouched(false);
    setErrorMsg('');

    if (computer) {
      setType(computer.type || 'laptop');
      setAssetTag(computer.assetTag || '');
      setAssetNumber(computer.assetNumber || '');
      setAssetName(computer.assetName || computer.model || '');
      setSerialNumber(computer.serialNumber || '');
      setHostname(computer.hostname || '');
      setBrand(computer.brand || 'Dell');
      setModel(computer.model || '');
      setCondition(computer.condition || 'good');
      setStatus(computer.status || 'available');

      // PC
      setOs(computer.os || '');
      setCpu(computer.cpu || '');
      setRam(computer.ram || '');
      setStorage(computer.storage || '');
      setSpecs(computer.specs || '');

      // Custody
      setAssetUserName(computer.assetUserName || computer.assignedEmployeeName || '');
      if (computer.assignedEmployeeId) {
        setAssignedEmployeeId(computer.assignedEmployeeId);
      } else if (computer.assetUserName || computer.assignedEmployeeName) {
        const normU = (computer.assetUserName || '').trim().toLowerCase();
        const normN = (computer.assignedEmployeeName || '').trim().toLowerCase();
        const matched = employees.find(
          (e) =>
            (normU && e.username && e.username.trim().toLowerCase() === normU) ||
            (normN && e.fullName && e.fullName.trim().toLowerCase() === normN)
        );
        setAssignedEmployeeId(matched ? matched.id : '');
      } else {
        setAssignedEmployeeId('');
      }

      setCompanyId(computer.companyId || '');
      setDepartmentId(computer.departmentId || '');
      setAssignedDate(computer.assignedDate || '');
      setReturnedDate(computer.returnedDate || '');

      // Location
      const compLoc = computer.location || '';
      setLocation(compLoc);
      setLocationId(computer.locationId || '');
      const matchedLoc = locations.find((l) => l.name.toLowerCase() === compLoc.toLowerCase());
      setIsCustomLocation(Boolean(compLoc && !matchedLoc));

      // Procurement
      setPurchaseDate(computer.purchaseDate || '');
      setPurchaseCost(computer.purchaseCost || '');
      setVendor(computer.vendor || '');
      setInvoiceNumber(computer.invoiceNumber || '');
      setWarrantyStart(computer.warrantyStart || '');
      setWarrantyExpiration(computer.warrantyExpiration || '');
      setAmcStart(computer.amcStart || '');
      setAmcEnd(computer.amcEnd || '');
      setLastServiceDate(computer.lastServiceDate || '');

      // Printer Specific
      setPrinterType(computer.printerType || 'laser');
      setPrinterFunction(computer.printerFunction || 'print_scan_copy');
      setPrinterName(computer.printerName || computer.assetName || '');
      setPrinterIpAddress(computer.ipAddress || '');
      setPrinterMacAddress(computer.macAddress || '');
      setConnectivity(computer.connectivity || ['Ethernet', 'Wi-Fi']);
      setColorMode(computer.colorMode || 'monochrome');
      setDuplexPrinting(computer.duplexPrinting || 'yes');
      setPageCounter(String(computer.pageCounter || '0'));
      setConsumables(computer.consumables || []);

      // Network Specific
      setDeviceCategory(computer.deviceCategory || 'switch');
      setDeviceStatus(computer.deviceStatus || 'active');
      setManagementIp(computer.managementIp || computer.ipAddress || '');
      setNetworkMacAddress(computer.macAddress || '');
      setInterfaceType(computer.interfaceType || 'Gigabit RJ-45 & SFP+');
      setPortCount(String(computer.portCount || '24'));
      setPortType(computer.portType || 'ethernet');
      setPortSpeed(computer.portSpeed || '10/100/1000 Mbps');
      setVlanDetails(computer.vlanDetails || '');
      setVlans(computer.vlans || []);
      setFirmwareVersion(computer.firmwareVersion || '');
      setFirmwareUpdateDate(computer.firmwareUpdateDate || '');
      setConfigBackupDate(computer.configBackupDate || '');
      setRackNumber(computer.rackNumber || '');
      setRackPosition(computer.rackPosition || '');
      setRoomLocation(computer.roomLocation || computer.location || '');
      setConnectedSwitchName(computer.connectedSwitchName || '');
      setConnectedSwitchPort(computer.connectedSwitchPort || '');
      setResponsiblePerson(computer.responsiblePerson || '');

      // Notes & Attachments
      setNotes(computer.notes || '');
      setAttachments(computer.attachments || []);

      // Set initial tab appropriately
      if (computer.type === 'printer') setActiveTab('printer_info');
      else if (computer.type === 'network_device') setActiveTab('network_info');
      else setActiveTab('details');
    } else {
      // New asset registration defaults
      const randomTag = `AST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      setAssetTag(randomTag);
      setAssetNumber(`EQ-${Math.floor(1000 + Math.random() * 9000)}`);
      setAssetName('');
      setSerialNumber('');
      setHostname(`CORP-LT-${Math.floor(10 + Math.random() * 90)}`);
      setBrand('Dell');
      setModel('Latitude 5540');
      setType('laptop');
      setCondition('new');
      setStatus('available');

      setOs('Windows 11 Pro');
      setCpu('Intel Core i7-1365U');
      setRam('16 GB DDR5');
      setStorage('512 GB NVMe SSD');
      setSpecs('15.6" FHD IPS Anti-Glare, Intel Iris Xe');

      setAssetUserName('');
      setAssignedEmployeeId('');
      const defaultCoId = companies[0]?.id || '';
      const defaultDept = departments.find((d) => d.companyId === defaultCoId);
      setCompanyId(defaultCoId);
      setDepartmentId(defaultDept ? defaultDept.id : '');
      setAssignedDate('');
      setReturnedDate('');

      const defaultLoc = locations[0]?.name || 'IT Storage Lab';
      setLocation(defaultLoc);
      setLocationId(locations[0]?.id || '');
      setIsCustomLocation(false);

      const today = new Date().toISOString().split('T')[0];
      setPurchaseDate(today);
      setPurchaseCost('');
      setVendor('Dell Premier Enterprise');
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      const wDate = new Date();
      wDate.setFullYear(wDate.getFullYear() + 3);
      setWarrantyStart(today);
      setWarrantyExpiration(wDate.toISOString().split('T')[0]);
      setAmcStart('');
      setAmcEnd('');
      setLastServiceDate('');

      // Printer defaults
      setPrinterType('laser');
      setPrinterFunction('print_scan_copy');
      setPrinterName('Office LaserJet Pro');
      setPrinterIpAddress('192.168.1.150');
      setPrinterMacAddress('00:1E:67:A2:3B:4C');
      setConnectivity(['Ethernet', 'Wi-Fi']);
      setColorMode('monochrome');
      setDuplexPrinting('yes');
      setPageCounter('1240');
      setConsumables([
        {
          id: `con-black-1`,
          consumableType: 'toner',
          modelOrPartNumber: 'HP 206A Black (W2110A)',
          color: 'black',
          quantityInstalled: 1,
          currentStatus: 'installed',
          installationDate: today,
          expectedPageYield: '2500',
          remarks: 'Original OEM Cartridge',
          replacementHistory: [],
        },
      ]);

      // Network equipment defaults
      setDeviceCategory('switch');
      setDeviceStatus('active');
      setManagementIp('10.0.0.2');
      setNetworkMacAddress('D4:6D:50:88:99:AA');
      setInterfaceType('10/100/1000Base-T & 4x SFP+ 10G');
      setPortCount('24');
      setPortType('ethernet');
      setPortSpeed('1 Gbps / 10 Gbps Uplink');
      setVlanDetails('VLAN 1 (Default), VLAN 10 (Corporate), VLAN 20 (VoIP), VLAN 30 (Guest)');
      setVlans([
        { id: 'v1', vlanId: '1', name: 'Default', subnet: '10.0.0.0/24' },
        { id: 'v10', vlanId: '10', name: 'Corporate Data', subnet: '10.0.10.0/24' },
        { id: 'v20', vlanId: '20', name: 'VoIP Phones', subnet: '10.0.20.0/24' },
        { id: 'v30', vlanId: '30', name: 'Guest Wi-Fi', subnet: '192.168.30.0/24' },
      ]);
      setFirmwareVersion('v15.2(4)E7');
      setFirmwareUpdateDate(today);
      setConfigBackupDate(today);
      setRackNumber('Rack 01');
      setRackPosition('U14');
      setRoomLocation('MDF Server Room B1');
      setConnectedSwitchName('CORE-DIST-SW01');
      setConnectedSwitchPort('Te1/0/1');
      setResponsiblePerson('Network Operations Team');

      setNotes('');
      setAttachments([]);
      setActiveTab('details');
    }
  }, [computer, isOpen, companies, departments, employees, locations]);

  // Adjust active tab when type changes
  const handleTypeChange = (newType: ComputerType) => {
    setType(newType);
    if (newType === 'printer') {
      setActiveTab('printer_info');
      if (brand === 'Dell' || brand === 'Apple') {
        setBrand('HP');
        setModel('LaserJet Pro M428fdw');
      }
    } else if (newType === 'network_device') {
      setActiveTab('network_info');
      if (brand === 'Dell' || brand === 'Apple') {
        setBrand('Cisco');
        setModel('Catalyst 2960X-24TS-L');
      }
    } else {
      setActiveTab('details');
    }
  };

  // Toggle connectivity option for printer
  const toggleConnectivity = (tech: string) => {
    setConnectivity((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  // Quick helper to populate standard CMYK set for color printers
  const addStandardCmykSet = () => {
    const today = new Date().toISOString().split('T')[0];
    const prefix = model || 'LaserJet';
    const cmykSet: PrinterConsumable[] = [
      {
        id: `con-cmyk-k-${Date.now()}`,
        consumableType: 'toner',
        modelOrPartNumber: `${prefix} Black Toner`,
        color: 'black',
        compatiblePrinterModel: model,
        quantityInstalled: 1,
        currentStatus: 'installed',
        installationDate: today,
        expectedPageYield: '3000',
        remarks: 'Black Toner Cartridge',
        replacementHistory: [],
      },
      {
        id: `con-cmyk-c-${Date.now() + 1}`,
        consumableType: 'toner',
        modelOrPartNumber: `${prefix} Cyan Toner`,
        color: 'cyan',
        compatiblePrinterModel: model,
        quantityInstalled: 1,
        currentStatus: 'installed',
        installationDate: today,
        expectedPageYield: '2500',
        remarks: 'Cyan Toner Cartridge',
        replacementHistory: [],
      },
      {
        id: `con-cmyk-m-${Date.now() + 2}`,
        consumableType: 'toner',
        modelOrPartNumber: `${prefix} Magenta Toner`,
        color: 'magenta',
        compatiblePrinterModel: model,
        quantityInstalled: 1,
        currentStatus: 'installed',
        installationDate: today,
        expectedPageYield: '2500',
        remarks: 'Magenta Toner Cartridge',
        replacementHistory: [],
      },
      {
        id: `con-cmyk-y-${Date.now() + 3}`,
        consumableType: 'toner',
        modelOrPartNumber: `${prefix} Yellow Toner`,
        color: 'yellow',
        compatiblePrinterModel: model,
        quantityInstalled: 1,
        currentStatus: 'installed',
        installationDate: today,
        expectedPageYield: '2500',
        remarks: 'Yellow Toner Cartridge',
        replacementHistory: [],
      },
    ];

    setConsumables((prev) => {
      // Keep any drums/waste boxes, replace colors
      const nonColors = prev.filter((c) => c.color === 'not_applicable' || c.color === 'other');
      return [...nonColors, ...cmykSet];
    });
  };

  // Quick helper to add Black toner for monochrome printers
  const addMonochromeToner = () => {
    const today = new Date().toISOString().split('T')[0];
    const blackToner: PrinterConsumable = {
      id: `con-mono-k-${Date.now()}`,
      consumableType: 'toner',
      modelOrPartNumber: `${model || 'LaserJet'} High-Yield Black Toner`,
      color: 'black',
      compatiblePrinterModel: model,
      quantityInstalled: 1,
      currentStatus: 'installed',
      installationDate: today,
      expectedPageYield: '3000',
      remarks: 'High-Yield OEM Black Toner',
      replacementHistory: [],
    };
    setConsumables((prev) => [...prev.filter((c) => c.color !== 'black'), blackToner]);
  };

  // Add / Edit consumable handler from sub-modal
  const handleSaveConsumable = (savedConsumable: PrinterConsumable) => {
    setConsumables((prev) => {
      const idx = prev.findIndex((c) => c.id === savedConsumable.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedConsumable;
        return next;
      }
      return [...prev, savedConsumable];
    });
  };

  const removeConsumable = (id: string) => {
    setConsumables((prev) => prev.filter((c) => c.id !== id));
  };

  // VLAN helpers
  const addVlanRow = () => {
    const newV: VlanEntry = {
      id: `vlan-${Date.now()}`,
      vlanId: String((vlans.length + 1) * 10),
      name: `VLAN_${(vlans.length + 1) * 10}`,
      subnet: `10.0.${(vlans.length + 1) * 10}.0/24`,
      description: '',
    };
    const updated = [...vlans, newV];
    setVlans(updated);
    setVlanDetails(updated.map((v) => `VLAN ${v.vlanId} (${v.name})`).join(', '));
  };

  const updateVlanRow = (id: string, field: keyof VlanEntry, val: string) => {
    const updated = vlans.map((v) => (v.id === id ? { ...v, [field]: val } : v));
    setVlans(updated);
    setVlanDetails(updated.map((v) => `VLAN ${v.vlanId} (${v.name})`).join(', '));
  };

  const removeVlanRow = (id: string) => {
    const updated = vlans.filter((v) => v.id !== id);
    setVlans(updated);
    setVlanDetails(updated.map((v) => `VLAN ${v.vlanId} (${v.name})`).join(', '));
  };

  // Handle employee change
  const handleEmployeeChange = (empId: string, autoFillUser = true) => {
    setIsEmployeeTouched(true);
    setAssignedEmployeeId(empId);
    if (empId) {
      const emp = employees.find((e) => e.id === empId);
      if (emp) {
        if (autoFillUser) {
          setAssetUserName(emp.username || emp.fullName.toLowerCase().replace(/\s+/g, '.'));
        }
        if (emp.companyId) setCompanyId(emp.companyId);
        if (emp.departmentId) setDepartmentId(emp.departmentId);
      }
      setStatus('assigned');
      if (!assignedDate) {
        setAssignedDate(new Date().toISOString().split('T')[0]);
      }
      setReturnedDate('');
    } else {
      if (status === 'assigned') {
        setStatus('available');
      }
      setAssignedDate('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newAtt: ComputerAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          category: newAttachmentCategory,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
          uploadedByName: userProfile?.displayName || 'IT Admin',
        };
        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTag = assetTag.trim().toUpperCase();
    if (!cleanTag) {
      setErrorMsg('Asset ID / Asset Tag is required.');
      return;
    }

    // Check unique Asset Tag
    const duplicateTag = computers.find(
      (c) => c.assetTag.toLowerCase() === cleanTag.toLowerCase() && c.id !== computer?.id
    );
    if (duplicateTag) {
      setErrorMsg(`Asset ID "${cleanTag}" is already assigned to ${duplicateTag.brand} ${duplicateTag.model}. Asset ID must be unique.`);
      return;
    }

    // Check unique Serial Number if provided
    const cleanSerial = serialNumber.trim().toUpperCase();
    if (cleanSerial) {
      const duplicateSerial = computers.find(
        (c) => c.serialNumber && c.serialNumber.toLowerCase() === cleanSerial.toLowerCase() && c.id !== computer?.id
      );
      if (duplicateSerial) {
        setErrorMsg(`Serial Number "${cleanSerial}" is already assigned to asset ${duplicateSerial.assetTag}. Serial number must be unique.`);
        return;
      }
    }

    if (!model.trim()) {
      setErrorMsg('Model name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const assignedEmp = employees.find((e) => e.id === assignedEmployeeId);

      let finalAssignedEmployeeId: string | undefined = undefined;
      let finalAssignedEmployeeName: string | undefined = undefined;
      let finalAssetUserName: string | undefined = assetUserName.trim() || undefined;
      let finalAssignmentStatus: string | undefined = undefined;

      if (assignedEmployeeId && assignedEmp) {
        finalAssignedEmployeeId = assignedEmp.id;
        finalAssignedEmployeeName = assignedEmp.fullName;
        finalAssetUserName = finalAssetUserName || assignedEmp.username || undefined;
        finalAssignmentStatus = 'matched';
      } else if (finalAssetUserName) {
        finalAssignedEmployeeId = undefined;
        finalAssignedEmployeeName = undefined;
        finalAssignmentStatus = 'pending';
      } else if (isEmployeeTouched) {
        finalAssignedEmployeeId = undefined;
        finalAssignedEmployeeName = undefined;
        finalAssetUserName = undefined;
        finalAssignmentStatus = undefined;
      } else if (computer) {
        finalAssignedEmployeeId = computer.assignedEmployeeId || undefined;
        finalAssignedEmployeeName = computer.assignedEmployeeName || undefined;
        finalAssetUserName = computer.assetUserName || undefined;
        finalAssignmentStatus = computer.assignmentStatus || undefined;
      }

      // Location resolution
      let finalLocation = location.trim();
      if (finalLocation === 'CUSTOM_ENTRY') finalLocation = '';
      let finalLocationId = locationId || undefined;
      const matchedLocObj = locations.find(
        (l) => l.name.toLowerCase() === finalLocation.toLowerCase()
      );
      if (matchedLocObj) finalLocationId = matchedLocObj.id;

      const payload: Partial<Computer> = {
        assetTag: cleanTag,
        assetNumber: assetNumber.trim() || undefined,
        assetName: assetName.trim() || model.trim(),
        serialNumber: cleanSerial,
        hostname: hostname.trim() || undefined,
        brand: brand.trim(),
        model: model.trim(),
        type,
        condition,
        status: type === 'network_device' ? (deviceStatus as ComputerStatus) : status,

        // Custody & Location
        assignedEmployeeId: finalAssignedEmployeeId,
        assignedEmployeeName: finalAssignedEmployeeName,
        assetUserName: finalAssetUserName,
        assignmentStatus: finalAssignmentStatus,
        companyId: companyId || undefined,
        departmentId: departmentId || undefined,
        location: finalLocation || undefined,
        locationId: finalLocationId,
        assignedDate: assignedDate.trim() || undefined,
        returnedDate: returnedDate.trim() || undefined,

        // Procurement & Warranty
        purchaseDate: purchaseDate.trim() || undefined,
        purchaseCost: purchaseCost.trim() || computer?.purchaseCost || undefined,
        vendor: vendor.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        warrantyStart: warrantyStart.trim() || undefined,
        warrantyExpiration: warrantyExpiration.trim() || undefined,
        amcStart: amcStart.trim() || undefined,
        amcEnd: amcEnd.trim() || undefined,
        lastServiceDate: lastServiceDate.trim() || undefined,

        // PC fields
        os: type !== 'printer' && type !== 'network_device' ? os.trim() || undefined : undefined,
        cpu: type !== 'printer' && type !== 'network_device' ? cpu.trim() || undefined : undefined,
        ram: type !== 'printer' && type !== 'network_device' ? ram.trim() || undefined : undefined,
        storage: type !== 'printer' && type !== 'network_device' ? storage.trim() || undefined : undefined,
        specs: type !== 'printer' && type !== 'network_device' ? specs.trim() || undefined : undefined,

        // Category B: Printer fields
        printerType: type === 'printer' ? printerType : undefined,
        printerFunction: type === 'printer' ? printerFunction : undefined,
        printerName: type === 'printer' ? (printerName.trim() || assetName.trim() || model.trim()) : undefined,
        ipAddress: type === 'printer' ? printerIpAddress.trim() || undefined : type === 'network_device' ? managementIp.trim() || undefined : undefined,
        macAddress: type === 'printer' ? printerMacAddress.trim() || undefined : type === 'network_device' ? networkMacAddress.trim() || undefined : undefined,
        connectivity: type === 'printer' ? connectivity : undefined,
        colorMode: type === 'printer' ? colorMode : undefined,
        duplexPrinting: type === 'printer' ? duplexPrinting : undefined,
        pageCounter: type === 'printer' ? pageCounter.trim() || undefined : undefined,
        consumables: type === 'printer' ? consumables : undefined,

        // Category C: Network Equipment fields
        deviceCategory: type === 'network_device' ? deviceCategory : undefined,
        deviceStatus: type === 'network_device' ? deviceStatus : undefined,
        managementIp: type === 'network_device' ? managementIp.trim() || undefined : undefined,
        interfaceType: type === 'network_device' ? interfaceType.trim() || undefined : undefined,
        portCount: type === 'network_device' ? portCount.trim() || undefined : undefined,
        portType: type === 'network_device' ? portType : undefined,
        portSpeed: type === 'network_device' ? portSpeed.trim() || undefined : undefined,
        vlanDetails: type === 'network_device' ? vlanDetails.trim() || undefined : undefined,
        vlans: type === 'network_device' ? vlans : undefined,
        firmwareVersion: type === 'network_device' ? firmwareVersion.trim() || undefined : undefined,
        firmwareUpdateDate: type === 'network_device' ? firmwareUpdateDate.trim() || undefined : undefined,
        configBackupDate: type === 'network_device' ? configBackupDate.trim() || undefined : undefined,
        rackNumber: type === 'network_device' ? rackNumber.trim() || undefined : undefined,
        rackPosition: type === 'network_device' ? rackPosition.trim() || undefined : undefined,
        roomLocation: type === 'network_device' ? roomLocation.trim() || undefined : undefined,
        connectedSwitchName: type === 'network_device' ? connectedSwitchName.trim() || undefined : undefined,
        connectedSwitchPort: type === 'network_device' ? connectedSwitchPort.trim() || undefined : undefined,
        responsiblePerson: type === 'network_device' ? responsiblePerson.trim() || undefined : undefined,

        attachments,
        notes: notes.trim() || undefined,
      };

      if (computer) {
        const auditEntry: Omit<ComputerAuditEntry, 'id' | 'timestamp'> = {
          type: 'updated',
          actorName: userProfile?.displayName || 'IT Admin',
          actorRole: activeRole,
          message: `Hardware asset specifications, consumables, or configuration updated by ${userProfile?.displayName || 'IT Admin'}`,
        };
        await updateComputer(computer.id, payload, auditEntry);
      } else {
        const initialAudit: ComputerAuditEntry[] = [
          {
            id: `aud-${Date.now()}`,
            type: 'created',
            actorName: userProfile?.displayName || 'IT Admin',
            actorRole: activeRole,
            message: `New ${type === 'printer' ? 'Printer' : type === 'network_device' ? 'Network Device' : 'Hardware Asset'} registered in inventory: ${cleanTag}`,
            timestamp: new Date().toISOString(),
          },
        ];
        if (finalAssignedEmployeeName || finalAssetUserName) {
          initialAudit.push({
            id: `aud-${Date.now()}-assign`,
            type: 'assigned',
            actorName: userProfile?.displayName || 'IT Admin',
            actorRole: activeRole,
            message: `Assigned upon registration to user: ${finalAssignedEmployeeName || finalAssetUserName}`,
            newValue: finalAssignedEmployeeName || finalAssetUserName,
            timestamp: new Date().toISOString(),
          });
        }
        await createComputer({
          ...(payload as any),
          auditHistory: initialAudit,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save asset record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLocObj = locations.find((l) => l.name === location || l.id === locationId);

  // Tab definitions dynamically depending on asset type
  const isPrinter = type === 'printer';
  const isNetwork = type === 'network_device';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          computer
            ? `Edit Asset: ${computer.assetTag} (${isPrinter ? 'Printer' : isNetwork ? 'Network Equipment' : 'Computer'})`
            : `Add Hardware Asset (${isPrinter ? 'Printer' : isNetwork ? 'Network Equipment' : 'PC / Computer'})`
        }
        subtitle="Manage hardware specs, printer consumables, and network infrastructure"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ASSET TYPE SELECTOR BAR (Primary category router) */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Asset Category:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleTypeChange('laptop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    !isPrinter && !isNetwork
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>PC / Laptop / Server</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('printer')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPrinter
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Printer (Category B)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange('network_device')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isNetwork
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Network Equipment (Category C)</span>
                </button>
              </div>
            </div>

            {/* Sub-type selection if PC */}
            {!isPrinter && !isNetwork && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Form Factor:</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ComputerType)}
                  className="text-xs rounded-lg border border-slate-300 px-2 py-1 bg-white font-medium"
                >
                  <option value="laptop">Laptop</option>
                  <option value="desktop">Desktop</option>
                  <option value="workstation">Workstation</option>
                  <option value="server">Server</option>
                  <option value="monitor">Monitor</option>
                  <option value="tablet">Tablet</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* DYNAMIC FORM TABS NAVIGATION BAR */}
          <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
            {/* PRINTER TABS */}
            {isPrinter && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('printer_info')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'printer_info'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>1. Printer Info</span>
                  {assetTag && model && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cartridges')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'cartridges'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. Cartridge / Toner Details</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold rounded-full px-1.5 py-0.2">
                    {consumables.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('user')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'user'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>3. User Name & Assignment</span>
                  {assetUserName && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('location')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'location'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>4. Physical Location</span>
                  {location && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('procurement')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'procurement'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>5. Warranty & AMC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'documents'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>6. Documents & Notes</span>
                </button>
              </>
            )}

            {/* NETWORK EQUIPMENT TABS */}
            {isNetwork && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('network_info')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'network_info'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>1. Device Info</span>
                  {assetTag && model && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ports_vlans')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'ports_vlans'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Server className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. Ports, VLANs & Rack</span>
                  {vlans.length > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold rounded-full px-1.5 py-0.2">
                      {vlans.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('user')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'user'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>3. User Name & Responsibility</span>
                  {assetUserName && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('location')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'location'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>4. Physical Location</span>
                  {location && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('procurement')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'procurement'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>5. Warranty & AMC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'documents'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>6. Documents & Notes</span>
                </button>
              </>
            )}

            {/* PC / LAPTOP STANDARD TABS */}
            {!isPrinter && !isNetwork && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'details'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>1. Device & Specs</span>
                  {assetTag && model && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('user')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'user'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>2. User Name & Assignment</span>
                  {assetUserName && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('location')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'location'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>3. Physical Location</span>
                  {location && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('procurement')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'procurement'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>4. Warranty & Service</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'documents'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>5. Documents & Notes</span>
                </button>
              </>
            )}
          </div>

          {/* ========================================================= */}
          {/* CATEGORY B: PRINTER FORM VIEWS                            */}
          {/* ========================================================= */}
          {isPrinter && activeTab === 'printer_info' && (
            <div className="space-y-4 pt-1">
              {/* Asset ID, Asset Number, Printer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset ID <span className="text-rose-500">*</span> (Unique)
                  </label>
                  <input
                    type="text"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    placeholder="e.g. AST-PRN-001"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Number
                  </label>
                  <input
                    type="text"
                    value={assetNumber}
                    onChange={(e) => setAssetNumber(e.target.value)}
                    placeholder="e.g. PRN-2024-001"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Printer Name / Display Name
                  </label>
                  <input
                    type="text"
                    value={assetName}
                    onChange={(e) => {
                      setAssetName(e.target.value);
                      setPrinterName(e.target.value);
                    }}
                    placeholder="e.g. HP LaserJet 2nd Floor Marketing"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Manufacturer, Model, Serial Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="HP, Canon, Epson, Brother, Xerox..."
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. LaserJet Pro M428fdw"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. VNB3J04812"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Printer Type, Function, Colour Mode, Duplex */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Printer Type</label>
                  <select
                    value={printerType}
                    onChange={(e) => setPrinterType(e.target.value as PrinterType)}
                    className="w-full text-xs rounded-md border border-slate-300 px-2 py-1.5 bg-white"
                  >
                    <option value="laser">Laser</option>
                    <option value="inkjet">Inkjet</option>
                    <option value="dot_matrix">Dot Matrix</option>
                    <option value="thermal">Thermal (Receipt/Label)</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Printer Function</label>
                  <select
                    value={printerFunction}
                    onChange={(e) => setPrinterFunction(e.target.value as PrinterFunction)}
                    className="w-full text-xs rounded-md border border-slate-300 px-2 py-1.5 bg-white"
                  >
                    <option value="print">Print Only</option>
                    <option value="print_scan">Print + Scan</option>
                    <option value="print_scan_copy">Print + Scan + Copy (All-in-One)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Colour Mode</label>
                  <select
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value as PrinterColorMode)}
                    className="w-full text-xs rounded-md border border-slate-300 px-2 py-1.5 bg-white font-medium"
                  >
                    <option value="monochrome">Monochrome (Black & White)</option>
                    <option value="colour">Colour (CMYK)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Duplex Printing</label>
                  <select
                    value={duplexPrinting}
                    onChange={(e) => setDuplexPrinting(e.target.value as DuplexPrinting)}
                    className="w-full text-xs rounded-md border border-slate-300 px-2 py-1.5 bg-white"
                  >
                    <option value="yes">Yes (Two-Sided)</option>
                    <option value="no">No (Single-Sided)</option>
                  </select>
                </div>
              </div>

              {/* Network & Connectivity & Page Counter */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Printer IP Address
                  </label>
                  <input
                    type="text"
                    value={printerIpAddress}
                    onChange={(e) => setPrinterIpAddress(e.target.value)}
                    placeholder="192.168.1.150"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    value={printerMacAddress}
                    onChange={(e) => setPrinterMacAddress(e.target.value)}
                    placeholder="00:1E:67:A2:3B:4C"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hostname / Network Name
                  </label>
                  <input
                    type="text"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="PRN-CORP-01"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Page Counter / Print Count
                  </label>
                  <input
                    type="text"
                    value={pageCounter}
                    onChange={(e) => setPageCounter(e.target.value)}
                    placeholder="e.g. 14,250"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
              </div>

              {/* Connectivity Options */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Connectivity Interfaces
                </label>
                <div className="flex items-center gap-3">
                  {['USB', 'Ethernet', 'Wi-Fi'].map((tech) => (
                    <label
                      key={tech}
                      className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={connectivity.includes(tech)}
                        onChange={() => toggleConnectivity(tech)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{tech}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PRINTER TAB 2: CARTRIDGE & TONER MANAGEMENT               */}
          {/* ========================================================= */}
          {isPrinter && activeTab === 'cartridges' && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-indigo-600" />
                    <span>Cartridge & Toner Management</span>
                  </h4>
                  <p className="text-[11px] text-indigo-800/80">
                    Mode: <strong className="capitalize">{colorMode}</strong> printing. Track linked cartridges, status, and replacement history.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {colorMode === 'colour' ? (
                    <button
                      type="button"
                      onClick={addStandardCmykSet}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg shadow-2xs cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Set Standard CMYK</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={addMonochromeToner}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg shadow-2xs cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Set Black Toner</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setConsumableToEdit(null);
                      setConsumableModalMode('create');
                      setIsConsumableModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-2xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Consumable</span>
                  </button>
                </div>
              </div>

              {/* Consumables List */}
              {consumables.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                  <Droplets className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-slate-700">No Cartridges or Toners Linked</p>
                  <p className="text-[11px] text-slate-500">
                    Add the cartridge models installed in this printer to track yields and replacements.
                  </p>
                  <button
                    type="button"
                    onClick={colorMode === 'colour' ? addStandardCmykSet : addMonochromeToner}
                    className="mt-2 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg shadow-2xs cursor-pointer"
                  >
                    {colorMode === 'colour' ? 'Initialize Standard CMYK Set' : 'Initialize Black Toner'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {consumables.map((con) => {
                    const colorBadgeClasses =
                      con.color === 'black'
                        ? 'bg-slate-900 text-white'
                        : con.color === 'cyan'
                        ? 'bg-cyan-500 text-white'
                        : con.color === 'magenta'
                        ? 'bg-fuchsia-600 text-white'
                        : con.color === 'yellow'
                        ? 'bg-amber-400 text-slate-900 font-bold'
                        : 'bg-slate-200 text-slate-800';

                    const statusBadgeClasses =
                      con.currentStatus === 'installed'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : con.currentStatus === 'low'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : con.currentStatus === 'empty'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200';

                    return (
                      <div
                        key={con.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-indigo-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Colour pill */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 uppercase text-[10px] shadow-2xs ${colorBadgeClasses}`}
                            title={`Color: ${con.color}`}
                          >
                            {con.color.charAt(0)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 truncate">
                                {con.modelOrPartNumber}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses} capitalize`}>
                                {con.currentStatus}
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                • {con.consumableType}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Yield: <strong className="text-slate-700">{con.expectedPageYield || 'N/A'} pages</strong>
                              {con.installationDate && ` • Installed: ${con.installationDate}`}
                              {con.lastReplacementDate && ` • Last Replaced: ${con.lastReplacementDate}`}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                          <button
                            type="button"
                            onClick={() => {
                              setConsumableToEdit(con);
                              setConsumableModalMode('replace');
                              setIsConsumableModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="Log replacement event and add to history"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-700" />
                            <span>Replace</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConsumableToEdit(con);
                              setConsumableModalMode('edit');
                              setIsConsumableModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer"
                            title="Edit Consumable details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeConsumable(con.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Remove Consumable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* CATEGORY C: NETWORK EQUIPMENT FORM VIEWS                  */}
          {/* ========================================================= */}
          {isNetwork && activeTab === 'network_info' && (
            <div className="space-y-4 pt-1">
              {/* Asset ID, Asset Number, Device Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset ID <span className="text-rose-500">*</span> (Unique)
                  </label>
                  <input
                    type="text"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    placeholder="e.g. AST-NET-001"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Number
                  </label>
                  <input
                    type="text"
                    value={assetNumber}
                    onChange={(e) => setAssetNumber(e.target.value)}
                    placeholder="e.g. NET-2024-001"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Name / Description
                  </label>
                  <input
                    type="text"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="e.g. Core Distribution Switch Stack 1"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Device Category, Manufacturer, Model */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Device Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={deviceCategory}
                    onChange={(e) => setDeviceCategory(e.target.value as NetworkDeviceCategory)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium capitalize"
                  >
                    <option value="switch">Network Switch</option>
                    <option value="router">Edge / Core Router</option>
                    <option value="firewall">Security Firewall</option>
                    <option value="access_point">Wireless Access Point (AP)</option>
                    <option value="modem">ISP Gateway / Modem</option>
                    <option value="network_controller">WLAN / SDN Controller</option>
                    <option value="other">Other Network Device</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Cisco, Ubiquiti, Fortinet, Aruba, Juniper..."
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Catalyst 2960X-48FPD-L"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Hostname, Management IP, MAC, Serial */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hostname
                  </label>
                  <input
                    type="text"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="e.g. SW-CORE-B1-01"
                    className="w-full font-mono text-xs rounded-md border border-slate-300 px-2.5 py-1.5 uppercase bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Management IP Address
                  </label>
                  <input
                    type="text"
                    value={managementIp}
                    onChange={(e) => setManagementIp(e.target.value)}
                    placeholder="10.0.0.10"
                    className="w-full font-mono text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    value={networkMacAddress}
                    onChange={(e) => setNetworkMacAddress(e.target.value)}
                    placeholder="00:1B:44:11:3A:B7"
                    className="w-full font-mono text-xs rounded-md border border-slate-300 px-2.5 py-1.5 uppercase bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="FCW1938C01Z"
                    className="w-full font-mono text-xs rounded-md border border-slate-300 px-2.5 py-1.5 uppercase bg-white"
                  />
                </div>
              </div>

              {/* Device Status & Firmware */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Device Operational Status
                  </label>
                  <select
                    value={deviceStatus}
                    onChange={(e) => setDeviceStatus(e.target.value as NetworkDeviceStatus)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium capitalize"
                  >
                    <option value="active">Active (Online in Production)</option>
                    <option value="inactive">Inactive (Standby / Cold Spare)</option>
                    <option value="under_maintenance">Under Maintenance / Firmware Upgrade</option>
                    <option value="retired">Retired / Decommissioned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Firmware Version
                  </label>
                  <input
                    type="text"
                    value={firmwareVersion}
                    onChange={(e) => setFirmwareVersion(e.target.value)}
                    placeholder="e.g. Cisco IOS 15.2(4)E7 / UniFi 6.5.62"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Firmware Update Date
                  </label>
                  <input
                    type="date"
                    value={firmwareUpdateDate}
                    onChange={(e) => setFirmwareUpdateDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* NETWORK TAB 2: PORTS, VLANS & RACK LAYOUT                 */}
          {/* ========================================================= */}
          {isNetwork && activeTab === 'ports_vlans' && (
            <div className="space-y-4 pt-1">
              {/* Ports Specification */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Port Capacities & Speeds
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Number of Ports
                    </label>
                    <input
                      type="text"
                      value={portCount}
                      onChange={(e) => setPortCount(e.target.value)}
                      placeholder="e.g. 24 or 48"
                      className="w-full font-mono text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Port Type
                    </label>
                    <select
                      value={portType}
                      onChange={(e) => setPortType(e.target.value as NetworkPortType)}
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    >
                      <option value="ethernet">Ethernet (RJ45 1Gbps / 2.5Gbps)</option>
                      <option value="sfp">SFP (1 Gbps Fiber)</option>
                      <option value="sfp_plus">SFP+ (10 Gbps Fiber / DAC)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Supported Port Speed
                    </label>
                    <input
                      type="text"
                      value={portSpeed}
                      onChange={(e) => setPortSpeed(e.target.value)}
                      placeholder="e.g. 10/100/1000 Mbps, 10G SFP+"
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Connectivity / Interface
                    </label>
                    <input
                      type="text"
                      value={interfaceType}
                      onChange={(e) => setInterfaceType(e.target.value)}
                      placeholder="e.g. PoE+ 370W, Console, USB"
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Rack Location & Upstream Switch Link */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rack Number
                  </label>
                  <input
                    type="text"
                    value={rackNumber}
                    onChange={(e) => setRackNumber(e.target.value)}
                    placeholder="e.g. Rack A / Cabinet 02"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rack Position (U)
                  </label>
                  <input
                    type="text"
                    value={rackPosition}
                    onChange={(e) => setRackPosition(e.target.value)}
                    placeholder="e.g. U14 - U15"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Connected Switch Name
                  </label>
                  <input
                    type="text"
                    value={connectedSwitchName}
                    onChange={(e) => setConnectedSwitchName(e.target.value)}
                    placeholder="e.g. CORE-SW-01"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Connected Switch Port
                  </label>
                  <input
                    type="text"
                    value={connectedSwitchPort}
                    onChange={(e) => setConnectedSwitchPort(e.target.value)}
                    placeholder="e.g. Te1/0/24"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
              </div>

              {/* VLAN Details with structured table and quick summary */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Configured VLANs ({vlans.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={addVlanRow}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add VLAN</span>
                  </button>
                </div>

                {vlans.length > 0 ? (
                  <div className="space-y-2">
                    {vlans.map((v) => (
                      <div key={v.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={v.vlanId}
                            onChange={(e) => updateVlanRow(v.id, 'vlanId', e.target.value)}
                            placeholder="VLAN ID"
                            className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 px-2 py-1.5"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => updateVlanRow(v.id, 'name', e.target.value)}
                            placeholder="VLAN Name (e.g. Corporate_Data)"
                            className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1.5"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={v.subnet || ''}
                            onChange={(e) => updateVlanRow(v.id, 'subnet', e.target.value)}
                            placeholder="Subnet CIDR (e.g. 10.0.10.0/24)"
                            className="w-full text-xs font-mono rounded-lg border border-slate-300 px-2 py-1.5"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeVlanRow(v.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove VLAN"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    No structured VLANs configured yet. Click "Add VLAN" above or specify in summary below.
                  </p>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    VLAN Summary Text (Export / Overview)
                  </label>
                  <input
                    type="text"
                    value={vlanDetails}
                    onChange={(e) => setVlanDetails(e.target.value)}
                    placeholder="e.g. VLAN 1 (Mgmt), VLAN 10 (Data), VLAN 20 (Voice)"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Configuration Backup Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Configuration Backup Date
                  </label>
                  <input
                    type="date"
                    value={configBackupDate}
                    onChange={(e) => setConfigBackupDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mt-5 italic">
                    🔒 Network device credentials and configuration files are stored securely in external vault systems and are never exposed in inventory views.
                  </p>
                </div>
              </div>
            </div>
          )}



          {/* ========================================================= */}
          {/* COMMON TAB: WARRANTY, AMC & SERVICE (All Categories)       */}
          {/* (Purchase Cost Removed per user request)                  */}
          {/* ========================================================= */}
          {activeTab === 'procurement' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Supplier</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g. Dell Enterprise, HP Direct, CDW"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2024-8841"
                    className="w-full text-xs font-mono uppercase rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  />
                </div>
              </div>

              {/* Warranty & AMC Start and End Dates */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Warranty & Annual Maintenance Contract (AMC)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Warranty Start</label>
                    <input
                      type="date"
                      value={warrantyStart}
                      onChange={(e) => setWarrantyStart(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Warranty Expiry / End</label>
                    <input
                      type="date"
                      value={warrantyExpiration}
                      onChange={(e) => setWarrantyExpiration(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">AMC Start Date</label>
                    <input
                      type="date"
                      value={amcStart}
                      onChange={(e) => setAmcStart(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">AMC End Date</label>
                    <input
                      type="date"
                      value={amcEnd}
                      onChange={(e) => setAmcEnd(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Last Service / Maintenance Date
                    </label>
                    <input
                      type="date"
                      value={lastServiceDate}
                      onChange={(e) => setLastServiceDate(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Service Remarks / AMC Reference
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contract reference number, technician contact..."
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* CATEGORY A: PC / LAPTOP PRESERVED TABS                    */}
          {/* ========================================================= */}
          {!isPrinter && !isNetwork && activeTab === 'details' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Tag <span className="text-rose-500">*</span> (Unique)
                  </label>
                  <input
                    type="text"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    placeholder="e.g. AST-2024-045"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serial Number (S/N) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. C02GK812MD6R"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Computer Name / Hostname
                  </label>
                  <input
                    type="text"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="e.g. CORP-LT-045"
                    className="w-full font-mono text-xs rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Apple, Dell, Lenovo, HP..."
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. MacBook Pro 14 or Latitude 5540"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hardware Specifications
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Operating System</label>
                    <input
                      type="text"
                      value={os}
                      onChange={(e) => setOs(e.target.value)}
                      placeholder="Windows 11 Pro, macOS..."
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Processor (CPU)</label>
                    <input
                      type="text"
                      value={cpu}
                      onChange={(e) => setCpu(e.target.value)}
                      placeholder="e.g. M3 Pro / i7-1365U"
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">RAM (Memory)</label>
                    <input
                      type="text"
                      value={ram}
                      onChange={(e) => setRam(e.target.value)}
                      placeholder="16 GB / 32 GB"
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Storage Drive</label>
                    <input
                      type="text"
                      value={storage}
                      onChange={(e) => setStorage(e.target.value)}
                      placeholder="512 GB SSD / 1 TB"
                      className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Other Hardware Specs (GPU, Ports, Screen size, Resolution, etc.)
                  </label>
                  <input
                    type="text"
                    value={specs}
                    onChange={(e) => setSpecs(e.target.value)}
                    placeholder="e.g. 15.6-inch FHD Anti-Glare, Intel Iris Xe, Thunderbolt 4, Wi-Fi 6E"
                    className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: USER NAME & ASSIGNMENT (All Categories)              */}
          {/* ========================================================= */}
          {activeTab === 'user' && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>Asset User Name</span>
                  </label>
                  <span className="text-[11px] font-medium text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    {isNetwork ? 'Responsible Lead / Custodian Handle' : 'Account Handle / Custodian'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={assetUserName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssetUserName(val);
                      if (val.trim()) {
                        const match = employees.find(
                          (emp) =>
                            emp.username &&
                            emp.username.trim().toLowerCase() === val.trim().toLowerCase()
                        );
                        if (match && match.id !== assignedEmployeeId) {
                          handleEmployeeChange(match.id, false);
                        }
                      }
                    }}
                    placeholder={
                      isNetwork
                        ? 'e.g. netadmin, sysops, or responsible IT engineer'
                        : isPrinter
                        ? 'e.g. reception.printer, hr.admin, or custodian username'
                        : 'e.g. john.doe, jsmith, or custodian network ID'
                    }
                    className="w-full text-xs font-medium rounded-lg border border-indigo-300 bg-white px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-indigo-800/80">
                  {isNetwork
                    ? 'Enter the responsible network lead, admin handle, or system custodian username for this device.'
                    : 'Specify the user account or custodian for this hardware asset. Selecting an employee below will automatically sync their username here.'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {isNetwork ? 'Responsible Person / Engineer' : 'Assigned Employee Name'}
                  </label>
                  {isNetwork && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                      Optional for infrastructure equipment
                    </span>
                  )}
                </div>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium"
                >
                  <option value="">
                    {isNetwork
                      ? '-- No Specific Employee (Shared Infrastructure Equipment) --'
                      : '-- Unassigned (In Storage Pool / Shared Asset) --'}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} {emp.username ? `(@${emp.username})` : ''} • {emp.jobTitle || emp.role || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="">-- None --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isNetwork ? 'Responsible Department' : 'Department'}
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="">-- None --</option>
                    {(companyId ? departments.filter((d) => d.companyId === companyId) : departments).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: PHYSICAL LOCATION (All Categories)                   */}
          {/* ========================================================= */}
          {activeTab === 'location' && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>Physical Location</span>
                  </label>
                  {activeRole === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setIsQuickLocationModalOpen(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add New Location</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <select
                    value={isCustomLocation ? 'CUSTOM_ENTRY' : location}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM_ENTRY') {
                        setIsCustomLocation(true);
                      } else {
                        setIsCustomLocation(false);
                        setLocation(val);
                        const found = locations.find((l) => l.name === val);
                        setLocationId(found ? found.id : '');
                      }
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium focus:border-indigo-600 focus:outline-hidden"
                  >
                    <option value="">-- Select Physical Location --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name} {loc.building ? `(${loc.building}${loc.floor ? ` • ${loc.floor}` : ''}${loc.room ? ` • ${loc.room}` : ''})` : ''}
                      </option>
                    ))}
                    <option value="CUSTOM_ENTRY">+ Enter Custom / Desk Location...</option>
                  </select>

                  {isCustomLocation && (
                    <div>
                      <input
                        type="text"
                        value={location === 'CUSTOM_ENTRY' ? '' : location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          setLocationId('');
                        }}
                        placeholder="e.g. HQ Tower B - Desk 412"
                        className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:border-indigo-600 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {selectedLocObj && !isCustomLocation && (
                    <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-bold">{selectedLocObj.name}</span>
                          {selectedLocObj.code && (
                            <span className="text-[10px] bg-indigo-200/70 text-indigo-800 font-mono px-1.5 py-0.5 rounded">
                              {selectedLocObj.code}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Active Site
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-700">Building:</span>{' '}
                          {selectedLocObj.building || 'Main'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Floor:</span>{' '}
                          {selectedLocObj.floor || 'N/A'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Room / Lab:</span>{' '}
                          {selectedLocObj.room || 'General'}
                        </div>
                      </div>
                      {selectedLocObj.address && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-indigo-100/60">
                          <span className="font-semibold text-slate-600">Physical Address:</span>{' '}
                          {selectedLocObj.address}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Network-specific rack fields if Network device */}
              {isNetwork && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Rack & Network Infrastructure Location</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rack Number</label>
                      <input
                        type="text"
                        value={rackNumber}
                        onChange={(e) => setRackNumber(e.target.value)}
                        placeholder="e.g. Rack-01, IDF-A"
                        className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rack Position / Unit</label>
                      <input
                        type="text"
                        value={rackPosition}
                        onChange={(e) => setRackPosition(e.target.value)}
                        placeholder="e.g. U14-U15, Top Mount"
                        className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Room / Network Location</label>
                      <input
                        type="text"
                        value={roomLocation}
                        onChange={(e) => setRoomLocation(e.target.value)}
                        placeholder="e.g. MDF Server Room, Basement"
                        className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Connected Upstream Switch</label>
                      <input
                        type="text"
                        value={connectedSwitchName}
                        onChange={(e) => setConnectedSwitchName(e.target.value)}
                        placeholder="e.g. CORE-DIST-SW01"
                        className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Connected Upstream Port</label>
                      <input
                        type="text"
                        value={connectedSwitchPort}
                        onChange={(e) => setConnectedSwitchPort(e.target.value)}
                        placeholder="e.g. Te1/0/1, GigabitEthernet0/24"
                        className="w-full text-xs rounded-md border border-slate-300 px-2.5 py-1.5 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hardware Condition and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ComputerCondition)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="new">New (Freshly unboxed / pristine)</option>
                    <option value="good">Good (Normal operation, fully functional)</option>
                    <option value="fair">Fair (Visible cosmetic wear, functional)</option>
                    <option value="damaged">Damaged (Requires repair / faulty ports)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isNetwork ? 'Device Operating Status' : 'Inventory Status'}
                  </label>
                  {isNetwork ? (
                    <select
                      value={deviceStatus}
                      onChange={(e) => {
                        const ds = e.target.value as NetworkDeviceStatus;
                        setDeviceStatus(ds);
                        if (ds === 'active') setStatus('assigned');
                        else if (ds === 'inactive') setStatus('available');
                        else if (ds === 'under_maintenance') setStatus('under_repair');
                        else if (ds === 'retired') setStatus('retired');
                      }}
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium"
                    >
                      <option value="active">Active (Online & forwarding traffic)</option>
                      <option value="inactive">Inactive (Powered down / Standby)</option>
                      <option value="under_maintenance">Under Maintenance (Firmware / Config)</option>
                      <option value="retired">Retired (Decommissioned)</option>
                    </select>
                  ) : (
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ComputerStatus)}
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium"
                    >
                      <option value="available">Available (Spare pool / in storage)</option>
                      <option value="assigned">Assigned (In active circulation)</option>
                      <option value="under_repair">Under Repair (Maintenance / RMA)</option>
                      <option value="retired">Retired (Decommissioned / E-waste)</option>
                      <option value="lost">Lost / Missing</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* COMMON TAB: DOCUMENTS & NOTES                             */}
          {/* ========================================================= */}
          {activeTab === 'documents' && (
            <div className="space-y-4 pt-1">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>Attached Invoices, Warranty Certificates & Photos</span>
                  <span className="text-[11px] font-normal text-slate-400">Attached files</span>
                </h4>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Category:</span>
                    {(['invoice', 'warranty', 'photo', 'other'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewAttachmentCategory(cat)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer capitalize ${
                          newAttachmentCategory === cat
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}

                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer ml-auto">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {att.category === 'invoice' && <FileText className="w-4 h-4 text-emerald-600 shrink-0" />}
                            {att.category === 'warranty' && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
                            {att.category === 'photo' && <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />}
                            {att.category === 'other' && <File className="w-4 h-4 text-slate-500 shrink-0" />}
                            <div className="truncate">
                              <p className="font-medium text-slate-800 truncate">{att.name}</p>
                              <p className="text-[10px] text-slate-400 capitalize">
                                {att.category} • {(att.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer rounded"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center py-2">
                      No documents uploaded yet. You can attach vendor invoices, warranty certificates, or hardware photos.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Remarks & Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Deployment notes, maintenance contract IDs, network rack cabling notes, or special instructions..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* MODAL ACTIONS FOOTER */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500 font-medium">
              Category: <span className="font-bold text-slate-800 capitalize">{isPrinter ? 'Printer' : isNetwork ? 'Network Equipment' : 'Computer'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <span>{isSubmitting ? 'Saving...' : computer ? 'Save Changes' : `Register ${isPrinter ? 'Printer' : isNetwork ? 'Network Device' : 'Asset'}`}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Admin Quick Add Location Sub-modal */}
      {isQuickLocationModalOpen && (
        <LocationModal
          location={null}
          isOpen={isQuickLocationModalOpen}
          onClose={() => setIsQuickLocationModalOpen(false)}
        />
      )}

      {/* Printer Consumable Modal (Add, Edit, Replace) */}
      {isConsumableModalOpen && (
        <PrinterConsumableModal
          isOpen={isConsumableModalOpen}
          onClose={() => {
            setIsConsumableModalOpen(false);
            setConsumableToEdit(null);
          }}
          onSave={handleSaveConsumable}
          initialData={consumableToEdit}
          printerModel={model}
          isColorPrinter={colorMode === 'colour'}
          mode={consumableModalMode}
        />
      )}
    </>
  );
};
