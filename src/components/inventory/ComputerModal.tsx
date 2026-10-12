import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Computer,
  ComputerType,
  ComputerCondition,
  ComputerStatus,
  ComputerAttachment,
  ComputerAuditEntry,
} from '../../types';
import {
  AlertCircle,
  Paperclip,
  Trash2,
  Upload,
  FileText,
  ShieldCheck,
  Image as ImageIcon,
  File,
} from 'lucide-react';

interface ComputerModalProps {
  computer: Computer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ComputerModal: React.FC<ComputerModalProps> = ({ computer, isOpen, onClose }) => {
  const { userProfile, activeRole } = useAuth();
  const { createComputer, updateComputer, computers, employees, companies, departments } = useData();

  // Identification
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [hostname, setHostname] = useState('');
  const [type, setType] = useState<ComputerType>('laptop');
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');

  // Hardware Specs
  const [os, setOs] = useState('macOS Sequoia');
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('16 GB');
  const [storage, setStorage] = useState('512 GB SSD');
  const [specs, setSpecs] = useState('');

  // Purchase & Vendor
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('$1,499');
  const [warrantyExpiration, setWarrantyExpiration] = useState('');
  const [vendor, setVendor] = useState('Dell Premier Enterprise');
  const [location, setLocation] = useState('');

  // Lifecycle & Status
  const [condition, setCondition] = useState<ComputerCondition>('good');
  const [status, setStatus] = useState<ComputerStatus>('available');

  // Assignment
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedDate, setAssignedDate] = useState('');
  const [returnedDate, setReturnedDate] = useState('');

  // Documentation & Notes
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<ComputerAttachment[]>([]);
  const [newAttachmentCategory, setNewAttachmentCategory] = useState<'invoice' | 'warranty' | 'photo' | 'other'>('invoice');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (computer) {
      setAssetTag(computer.assetTag);
      setSerialNumber(computer.serialNumber || '');
      setHostname(computer.hostname || '');
      setBrand(computer.brand);
      setModel(computer.model);
      setType(computer.type);
      setOs(computer.os || '');
      setCpu(computer.cpu || '');
      setRam(computer.ram || '');
      setStorage(computer.storage || '');
      setSpecs(computer.specs || '');
      setPurchaseDate(computer.purchaseDate || '');
      setWarrantyExpiration(computer.warrantyExpiration || '');
      setPurchaseCost(computer.purchaseCost || '');
      setVendor(computer.vendor || '');
      setLocation(computer.location || '');
      setCondition(computer.condition || 'good');
      setStatus(computer.status || 'available');
      setAssignedEmployeeId(computer.assignedEmployeeId || '');
      setCompanyId(computer.companyId || '');
      setDepartmentId(computer.departmentId || '');
      setAssignedDate(computer.assignedDate || '');
      setReturnedDate(computer.returnedDate || '');
      setNotes(computer.notes || '');
      setAttachments(computer.attachments || []);
    } else {
      // Generated tag defaults
      const randomTag = `AST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      setAssetTag(randomTag);
      setSerialNumber('');
      setHostname(`CORP-LT-${Math.floor(10 + Math.random() * 90)}`);
      setBrand('Dell');
      setModel('Latitude 5540');
      setType('laptop');
      setOs('Windows 11 Pro');
      setCpu('Intel Core i7-1365U');
      setRam('16 GB DDR5');
      setStorage('512 GB NVMe SSD');
      setSpecs('15.6" FHD IPS Anti-Glare, Intel Iris Xe, Thunderbolt 4');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      const wDate = new Date();
      wDate.setFullYear(wDate.getFullYear() + 3);
      setWarrantyExpiration(wDate.toISOString().split('T')[0]);
      setPurchaseCost('$1,599');
      setVendor('Dell Premier Enterprise');
      setLocation('IT Storage Lab');
      setCondition('new');
      setStatus('available');
      setAssignedEmployeeId('');
      const defaultCoId = companies[0]?.id || '';
      const defaultDept = departments.find((d) => d.companyId === defaultCoId);
      setCompanyId(defaultCoId);
      setDepartmentId(defaultDept ? defaultDept.id : '');
      setAssignedDate('');
      setReturnedDate('');
      setNotes('');
      setAttachments([]);
    }
  }, [computer, isOpen, companies, departments]);

  // Handle employee selection: auto-sync status and date
  const handleEmployeeChange = (empId: string) => {
    setAssignedEmployeeId(empId);
    if (empId) {
      const emp = employees.find((e) => e.id === empId);
      if (emp) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTag = assetTag.trim().toUpperCase();
    if (!cleanTag) {
      setErrorMsg('Asset Tag is required.');
      return;
    }

    // Check unique Asset Tag
    const duplicateTag = computers.find(
      (c) => c.assetTag.toLowerCase() === cleanTag.toLowerCase() && c.id !== computer?.id
    );
    if (duplicateTag) {
      setErrorMsg(`Asset Tag "${cleanTag}" is already assigned to ${duplicateTag.brand} ${duplicateTag.model}. Asset Tag must be unique.`);
      return;
    }

    // Check unique Serial Number if provided
    const cleanSerial = serialNumber.trim().toUpperCase();
    if (cleanSerial) {
      const duplicateSerial = computers.find(
        (c) => c.serialNumber.toLowerCase() === cleanSerial.toLowerCase() && c.id !== computer?.id
      );
      if (duplicateSerial) {
        setErrorMsg(`Serial Number "${cleanSerial}" is already assigned to asset ${duplicateSerial.assetTag}. Serial number must be unique.`);
        return;
      }
    }

    if (!model.trim()) {
      setErrorMsg('Device Model is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const assignedEmp = employees.find((e) => e.id === assignedEmployeeId);

      const payload = {
        assetTag: cleanTag,
        serialNumber: cleanSerial,
        hostname: hostname.trim() || undefined,
        brand: brand.trim(),
        model: model.trim(),
        type,
        os: os.trim() || undefined,
        cpu: cpu.trim() || undefined,
        ram: ram.trim() || undefined,
        storage: storage.trim() || undefined,
        specs: specs.trim() || undefined,
        purchaseDate: purchaseDate.trim() || undefined,
        warrantyExpiration: warrantyExpiration.trim() || undefined,
        purchaseCost: purchaseCost.trim() || undefined,
        vendor: vendor.trim() || undefined,
        location: location.trim() || undefined,
        condition,
        status,
        assignedEmployeeId: assignedEmployeeId || undefined,
        assignedEmployeeName: assignedEmp ? assignedEmp.fullName : undefined,
        companyId: companyId || undefined,
        departmentId: departmentId || undefined,
        assignedDate: assignedDate.trim() || undefined,
        returnedDate: returnedDate.trim() || undefined,
        attachments,
        notes: notes.trim() || undefined,
      };

      if (computer) {
        // Audit entry for edit
        const auditEntry: Omit<ComputerAuditEntry, 'id' | 'timestamp'> = {
          type: 'updated',
          actorName: userProfile?.displayName || 'IT Admin',
          actorRole: activeRole,
          message: `Asset specifications and details updated by ${userProfile?.displayName || 'IT Admin'}`,
        };
        await updateComputer(computer.id, payload, auditEntry);
      } else {
        const initialAudit: ComputerAuditEntry[] = [
          {
            id: `aud-${Date.now()}`,
            type: 'created',
            actorName: userProfile?.displayName || 'IT Admin',
            actorRole: activeRole,
            message: `New hardware asset registered in inventory: ${cleanTag}`,
            timestamp: new Date().toISOString(),
          },
        ];
        if (assignedEmployeeId && assignedEmp) {
          initialAudit.push({
            id: `aud-${Date.now()}-assign`,
            type: 'assigned',
            actorName: userProfile?.displayName || 'IT Admin',
            actorRole: activeRole,
            message: `Assigned upon registration to ${assignedEmp.fullName}`,
            newValue: assignedEmp.fullName,
            timestamp: new Date().toISOString(),
          });
        }
        await createComputer({
          ...payload,
          auditHistory: initialAudit,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save computer record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={computer ? `Edit Hardware Asset: ${computer.assetTag}` : 'Add Hardware Asset'}
      subtitle="Register or update computer assets with full hardware specifications and lifecycle tracking"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Identification */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 pb-1 border-b border-slate-100">
            1. Asset Identification & Model
          </h4>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ComputerType)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              >
                <option value="desktop">Desktop</option>
                <option value="laptop">Laptop</option>
                <option value="monitor">Monitor</option>
                <option value="printer">Printer</option>
                <option value="server">Server</option>
                <option value="network_device">Network Device</option>
                <option value="workstation">Workstation</option>
                <option value="other">Other</option>
              </select>
            </div>

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
        </div>

        {/* Section 2: Technical Specifications */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 pb-1 border-b border-slate-100">
            2. Technical Specifications
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
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

          <div className="mt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Other Hardware Specs (GPU, Ports, Screen size, Resolution, etc.)
            </label>
            <input
              type="text"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="e.g. 14-inch Liquid Retina XDR, NVIDIA RTX 4000 Ada, Touch ID, Wi-Fi 6E"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Section 3: Purchasing, Warranty & Location */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 pb-1 border-b border-slate-100">
            3. Procurement, Warranty & Physical Location
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost</label>
              <input
                type="text"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                placeholder="$1,499"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Expiry Date</label>
              <input
                type="date"
                value={warrantyExpiration}
                onChange={(e) => setWarrantyExpiration(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Supplier</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Dell Enterprise, Apple..."
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. HQ Building A - IT Storage Lab / Floor 2 Cubicle 412"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        {/* Section 4: Condition, Status & Assignment */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 pb-1 border-b border-slate-100">
            4. Lifecycle Condition & Assignment
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hardware Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ComputerCondition)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              >
                <option value="new">New (Pristine in box / freshly imaged)</option>
                <option value="good">Good (Normal wear, fully functional)</option>
                <option value="fair">Fair (Visible cosmetic wear, functional)</option>
                <option value="damaged">Damaged (Faulty hardware, degraded battery, broken glass)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Inventory Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ComputerStatus)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium"
              >
                <option value="available">Available (Spare in storage pool)</option>
                <option value="assigned">Assigned (In active user circulation)</option>
                <option value="under_repair">Under Repair (On technician workbench / RMA)</option>
                <option value="retired">Retired (Decommissioned / E-waste)</option>
                <option value="lost">Lost / Missing</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Employee</label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              >
                <option value="">-- Unassigned (In Storage Pool) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
              <select
                value={companyId}
                onChange={(e) => {
                  const newCoId = e.target.value;
                  setCompanyId(newCoId);
                  const currentDept = departments.find((d) => d.id === departmentId);
                  const validDepts = departments.filter((d) => !newCoId || d.companyId === newCoId);
                  const matchingDept = validDepts.find((d) => d.name.toLowerCase() === currentDept?.name.toLowerCase());
                  if (matchingDept) {
                    setDepartmentId(matchingDept.id);
                  } else if (departmentId && !validDepts.some((d) => d.id === departmentId)) {
                    setDepartmentId(validDepts[0]?.id || '');
                  }
                }}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              >
                <option value="">-- None --</option>
                {(companyId
                  ? departments.filter((d) => d.companyId === companyId)
                  : departments
                ).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {!companyId ? `(${companies.find((c) => c.id === d.companyId)?.name || ''})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Date</label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Returned Date</label>
              <input
                type="date"
                value={returnedDate}
                onChange={(e) => setReturnedDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Attachments (Invoice, Warranty, Photo) */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 pb-1 border-b border-slate-100 flex items-center justify-between">
            <span>5. Documents & Attachments</span>
            <span className="text-[11px] font-normal text-slate-400">Invoice, Warranty, Asset Photos</span>
          </h4>

          {/* Upload input */}
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

            {/* List of uploaded attachments */}
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
              <p className="text-[11px] text-slate-400 italic text-center py-1">
                No documents uploaded yet. You can attach vendor invoices, warranty certificates, or hardware photos.
              </p>
            )}
          </div>
        </div>

        {/* Section 6: Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Notes & Special Instructions</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Deployment details, license keys, maintenance contract IDs, or physical condition notes..."
            className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-600 focus:outline-hidden"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
            className="px-5 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? 'Saving...' : computer ? 'Save Changes' : 'Register Asset'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
