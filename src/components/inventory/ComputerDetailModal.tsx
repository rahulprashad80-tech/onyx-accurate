import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Computer,
  ComputerStatus,
  ComputerCondition,
  ComputerAttachment,
  Ticket,
} from '../../types';
import { Badge } from '../common/Badge';
import { ComputerStatusIndicator } from './ComputerStatusIndicator';
import { AuditInfo } from '../common/AuditInfo';
import {
  Laptop,
  Monitor as MonitorIcon,
  Printer as PrinterIcon,
  Server as ServerIcon,
  Network,
  Cpu,
  Calendar,
  ShieldCheck,
  User,
  MapPin,
  FileText,
  Edit,
  Trash2,
  Ticket as TicketIcon,
  Plus,
  AlertTriangle,
  Clock,
  Building2,
  Phone,
  Mail,
  UserCheck,
  UserMinus,
  Archive,
  Upload,
  ExternalLink,
  CheckCircle2,
  Image as ImageIcon,
  File,
  QrCode,
} from 'lucide-react';
import { AssetTagQRModal } from './AssetTagQRModal';

interface ComputerDetailModalProps {
  computer: Computer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (computer: Computer) => void;
  onOpenTicketForAsset: (computer: Computer) => void;
  onSelectTicket?: (ticket: Ticket) => void;
}

type DetailTab = 'specs' | 'assignment' | 'history' | 'documents' | 'audit';

export const ComputerDetailModal: React.FC<ComputerDetailModalProps> = ({
  computer,
  isOpen,
  onClose,
  onEdit,
  onOpenTicketForAsset,
  onSelectTicket,
}) => {
  const { activeRole, userProfile } = useAuth();
  const {
    assignComputer,
    unassignComputer,
    retireComputer,
    deleteComputer,
    addComputerAttachment,
    employees,
    companies,
    departments,
    tickets,
  } = useData();

  const [activeTab, setActiveTab] = useState<DetailTab>('specs');

  // Confirmation / Sub-modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [customAssignDate, setCustomAssignDate] = useState(new Date().toISOString().split('T')[0]);

  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [returnCondition, setReturnCondition] = useState<ComputerCondition>('good');
  const [returnNotes, setReturnNotes] = useState('');
  const [customReturnDate, setCustomReturnDate] = useState(new Date().toISOString().split('T')[0]);

  const [isRetireModalOpen, setIsRetireModalOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('End of life hardware lifecycle expiration');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Quick document upload
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'invoice' | 'warranty' | 'photo' | 'other'>('warranty');

  // Physical QR Tag Modal state
  const [isQRTagModalOpen, setIsQRTagModalOpen] = useState(false);

  if (!computer) return null;

  const canManage = activeRole === 'admin' || activeRole === 'technician';
  const isAdmin = activeRole === 'admin';

  const assignedEmployee = computer.assignedEmployeeId
    ? employees.find((e) => e.id === computer.assignedEmployeeId)
    : null;

  const company = computer.companyId
    ? companies.find((c) => c.id === computer.companyId)
    : null;

  const department = computer.departmentId
    ? departments.find((d) => d.id === computer.departmentId)
    : null;

  // Tickets linked to this asset
  const relatedTickets = tickets.filter(
    (t) => t.assetId === computer.id || t.assetTag === computer.assetTag
  );

  // Warranty calculation
  const getWarrantyInfo = () => {
    if (!computer.warrantyExpiration) return { status: 'none', text: 'No record', color: 'slate', diffDays: 0 };
    const expDate = new Date(computer.warrantyExpiration);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired',
        text: `Warranty Expired (${Math.abs(diffDays)} days ago on ${computer.warrantyExpiration})`,
        color: 'rose',
        diffDays,
      };
    } else if (diffDays <= 30) {
      return {
        status: 'expiring_30',
        text: `Critical: Warranty expires in ${diffDays} days (${computer.warrantyExpiration})`,
        color: 'rose',
        diffDays,
      };
    } else if (diffDays <= 60) {
      return {
        status: 'expiring_60',
        text: `Warning: Warranty expires in ${diffDays} days (${computer.warrantyExpiration})`,
        color: 'amber',
        diffDays,
      };
    } else if (diffDays <= 90) {
      return {
        status: 'expiring_90',
        text: `Notice: Warranty expires within 90 days (${diffDays} days left on ${computer.warrantyExpiration})`,
        color: 'amber',
        diffDays,
      };
    } else {
      return {
        status: 'active',
        text: `Active Warranty (Valid until ${computer.warrantyExpiration} • ~${Math.round(diffDays / 30)} months left)`,
        color: 'emerald',
        diffDays,
      };
    }
  };

  const warranty = getWarrantyInfo();

  // Asset type icon
  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'desktop':
      case 'workstation':
        return <MonitorIcon className="w-6 h-6" />;
      case 'laptop':
        return <Laptop className="w-6 h-6" />;
      case 'monitor':
        return <MonitorIcon className="w-6 h-6" />;
      case 'printer':
        return <PrinterIcon className="w-6 h-6" />;
      case 'server':
        return <ServerIcon className="w-6 h-6" />;
      case 'network_device':
        return <Network className="w-6 h-6" />;
      default:
        return <Cpu className="w-6 h-6" />;
    }
  };

  // Actions handlers
  const handleAssignConfirm = async () => {
    if (!selectedAssigneeId) return;
    const emp = employees.find((e) => e.id === selectedAssigneeId);
    if (!emp) return;

    try {
      setIsActionLoading(true);
      await assignComputer(
        computer.id,
        emp.id,
        emp.fullName,
        emp.companyId,
        emp.departmentId,
        customAssignDate,
        { name: userProfile?.displayName || 'IT Admin', role: activeRole }
      );
      setIsAssignModalOpen(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnassignConfirm = async () => {
    try {
      setIsActionLoading(true);
      await unassignComputer(
        computer.id,
        customReturnDate,
        returnCondition,
        returnNotes,
        { name: userProfile?.displayName || 'IT Admin', role: activeRole }
      );
      setIsUnassignModalOpen(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRetireConfirm = async () => {
    try {
      setIsActionLoading(true);
      await retireComputer(computer.id, retireReason, {
        name: userProfile?.displayName || 'IT Admin',
        role: activeRole,
      });
      setIsRetireModalOpen(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsActionLoading(true);
      await deleteComputer(computer.id);
      setIsDeleteModalOpen(false);
      onClose();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const newAtt: ComputerAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          category: uploadCategory,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
          uploadedByName: userProfile?.displayName || 'IT Admin',
        };
        await addComputerAttachment(computer.id, newAtt, {
          name: userProfile?.displayName || 'IT Admin',
          role: activeRole,
        });
        setIsUploadOpen(false);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${computer.brand} ${computer.model}`}
        subtitle={`Asset Tag: ${computer.assetTag} ${computer.hostname ? `• Hostname: ${computer.hostname}` : ''} • S/N: ${computer.serialNumber}`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Top Banner & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                {getAssetTypeIcon(computer.type)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded ring-1 ring-indigo-200">
                    {computer.assetTag}
                  </span>
                  <ComputerStatusIndicator status={computer.status} size="md" />
                  <Badge variant="computerCondition" value={computer.condition} />
                  <span className="text-xs uppercase font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                    {computer.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Serial Number: <span className="font-mono font-medium text-slate-800">{computer.serialNumber}</span>
                  {computer.hostname && (
                    <> • Hostname: <span className="font-mono font-medium text-slate-800">{computer.hostname}</span></>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Assign / Unassign */}
                {computer.status === 'assigned' || computer.assignedEmployeeId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReturnCondition(computer.condition || 'good');
                      setReturnNotes('');
                      setIsUnassignModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer shadow-2xs"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Unassign Asset</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssigneeId('');
                      setIsAssignModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer shadow-2xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Assign to User</span>
                  </button>
                )}

                {/* Log Helpdesk Ticket */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTicketForAsset(computer);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Ticket</span>
                </button>

                {/* Edit Specs */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(computer);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {/* View / Print Asset Tag QR Sticker */}
                <button
                  type="button"
                  onClick={() => setIsQRTagModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
                  title="View and print physical QR code asset tag sticker"
                >
                  <QrCode className="w-3.5 h-3.5 text-slate-600" />
                  <span>QR Tag</span>
                </button>

                {/* Retire Button */}
                {computer.status !== 'retired' && (
                  <button
                    type="button"
                    onClick={() => setIsRetireModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 cursor-pointer"
                    title="Retire asset from circulation"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Retire</span>
                  </button>
                )}

                {/* Admin Delete */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    title="Permanently remove asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Warranty Warning Banner */}
          {warranty.status !== 'none' && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                warranty.color === 'rose'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : warranty.color === 'amber'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {warranty.color === 'rose' || warranty.color === 'amber' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                ) : (
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                )}
                <div>
                  <span className="font-semibold">{warranty.text}</span>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    {warranty.status === 'expired'
                      ? 'Out-of-warranty hardware carries potential maintenance cost and security risk.'
                      : warranty.status.startsWith('expiring')
                      ? 'Recommend submitting vendor contract renewal request or ordering refresh unit.'
                      : 'Covered under active OEM manufacturer hardware warranty.'}
                  </p>
                </div>
              </div>
              <span className="shrink-0 font-mono text-[11px] uppercase font-bold px-2 py-0.5 rounded bg-white/70 border border-current">
                {computer.warrantyExpiration}
              </span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-6 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('specs')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'specs'
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Specifications & Specs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('assignment')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'assignment'
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Assignment & Custodian
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Support & Repair History</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                  {relatedTickets.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTab === 'documents'
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Invoices & Docs</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                  {computer.attachments?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`pb-2.5 border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Audit History
              </button>
            </nav>
          </div>

          {/* TAB 1: SPECIFICATIONS */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Technical Architecture
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-400">Operating System</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{computer.os || 'Not specified'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-400">Processor (CPU)</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{computer.cpu || 'Not specified'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-400">RAM / Memory</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{computer.ram || 'Not specified'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-400">Storage Drive</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{computer.storage || 'Not specified'}</p>
                  </div>
                </div>

                {computer.specs && (
                  <div className="mt-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs">
                    <span className="font-semibold text-slate-700">Additional Features & Hardware Specs: </span>
                    <span className="text-slate-600">{computer.specs}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Procurement & Location
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-400">Purchase Date</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{computer.purchaseDate || 'Unknown'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-400">Purchase Cost</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{computer.purchaseCost || 'N/A'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-400">Vendor / Supplier</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{computer.vendor || 'Direct OEM'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-400">Physical Location</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{computer.location || 'HQ IT Lab'}</p>
                  </div>
                </div>
              </div>

              {computer.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Asset Notes & Special Instructions
                  </h4>
                  <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                    {computer.notes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSIGNMENT & CUSTODIAN */}
          {activeTab === 'assignment' && (
            <div className="space-y-4">
              {computer.assignedEmployeeId || assignedEmployee ? (
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {(assignedEmployee?.fullName || computer.assignedEmployeeName || 'U').charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {assignedEmployee?.fullName || computer.assignedEmployeeName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {assignedEmployee?.jobTitle || 'Assigned Staff Member'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="computerStatus" value="assigned" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                    {assignedEmployee?.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{assignedEmployee.email}</span>
                      </div>
                    )}
                    {assignedEmployee?.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{assignedEmployee.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {company?.name || 'Company Assigned'}
                        {department ? ` • ${department.name}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Assigned Date: {computer.assignedDate || 'Recorded in inventory'}</span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReturnCondition(computer.condition || 'good');
                          setIsUnassignModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      >
                        Unassign & Return to Storage
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssigneeId(computer.assignedEmployeeId || '');
                          setIsAssignModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 cursor-pointer"
                      >
                        Reassign to Different Employee
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
                  <User className="w-10 h-10 text-slate-400 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">No Employee Assigned</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      This hardware device is currently unassigned in the available hardware storage pool.
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssigneeId('');
                        setIsAssignModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 cursor-pointer shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign Device Now</span>
                    </button>
                  )}
                </div>
              )}

              {/* Assignment Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400">Assigned Company:</span>{' '}
                  <span className="font-medium text-slate-800">{company?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Department:</span>{' '}
                  <span className="font-medium text-slate-800">{department?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Assigned Date:</span>{' '}
                  <span className="font-medium text-slate-800">{computer.assignedDate || 'None recorded'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Last Returned Date:</span>{' '}
                  <span className="font-medium text-slate-800">{computer.returnedDate || 'None'}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUPPORT & REPAIR HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Complete Repair & Incident Log ({relatedTickets.length})
                </h4>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTicketForAsset(computer);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log New Repair Ticket</span>
                  </button>
                )}
              </div>

              {relatedTickets.length > 0 ? (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
                  {relatedTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (onSelectTicket) {
                          onClose();
                          onSelectTicket(t);
                        }
                      }}
                      className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded ring-1 ring-indigo-200">
                            {t.ticketNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="priority" value={t.priority} size="sm" />
                          <Badge variant="ticketStatus" value={t.status} size="sm" />
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>

                      {t.resolutionNotes && (
                        <div className="p-2 rounded bg-emerald-50 text-[11px] text-emerald-800 border border-emerald-200 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Resolution: </strong>
                            {t.resolutionNotes}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Requester: {t.requesterName}</span>
                        <span>Logged: {new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                  <TicketIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium text-slate-600">No support or repair tickets recorded for this asset.</p>
                  <p className="text-[11px] text-slate-400">Clean service history with zero hardware faults reported.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INVOICES & DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Asset Documentation & Photos ({computer.attachments?.length || 0})
                </h4>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(!isUploadOpen)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Attach Document</span>
                  </button>
                )}
              </div>

              {/* Upload Dropdown */}
              {isUploadOpen && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-indigo-900">Document Type:</span>
                    {(['invoice', 'warranty', 'photo', 'other'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setUploadCategory(cat)}
                        className={`px-2 py-0.5 rounded capitalize cursor-pointer font-medium ${
                          uploadCategory === cat
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    <label className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>Choose File</span>
                      <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}

              {computer.attachments && computer.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {computer.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          {att.category === 'invoice' && <FileText className="w-4 h-4 text-emerald-600" />}
                          {att.category === 'warranty' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                          {att.category === 'photo' && <ImageIcon className="w-4 h-4 text-purple-600" />}
                          {att.category === 'other' && <File className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 truncate">{att.name}</p>
                          <p className="text-[11px] text-slate-400 capitalize">
                            {att.category} • {(att.size / 1024).toFixed(1)} KB • {new Date(att.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {att.url && (
                        <a
                          href={att.url}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                          title="Download or view file"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-1">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium text-slate-600">No documents or invoices attached.</p>
                  <p className="text-[11px] text-slate-400">Attach purchase invoices, warranty certificates, or setup photos.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT HISTORY */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hardware Lifecycle Audit Trail
              </h4>
              {computer.auditHistory && computer.auditHistory.length > 0 ? (
                <div className="space-y-2.5">
                  {computer.auditHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">{entry.message}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            By <span className="font-medium text-slate-600">{entry.actorName}</span> (
                            <span className="capitalize">{entry.actorRole}</span>)
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  No previous audit records found for this hardware asset.
                </p>
              )}

              {/* Timestamp footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <AuditInfo createdAt={computer.createdAt} updatedAt={computer.updatedAt} />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* CONFIRMATION SUB-MODAL: ASSIGN ASSET */}
      {isAssignModalOpen && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title={`Assign Asset: ${computer.assetTag}`}
          subtitle="Assign this computer to an active company employee"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
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
                value={customAssignDate}
                onChange={(e) => setCustomAssignDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-800">
              This will update the asset status to <strong>Assigned</strong> and preserve an entry in the hardware audit log.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedAssigneeId || isActionLoading}
                onClick={handleAssignConfirm}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION SUB-MODAL: UNASSIGN ASSET */}
      {isUnassignModalOpen && (
        <Modal
          isOpen={isUnassignModalOpen}
          onClose={() => setIsUnassignModalOpen(false)}
          title={`Unassign & Return Asset: ${computer.assetTag}`}
          subtitle="Return this device to the available inventory pool"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Date</label>
              <input
                type="date"
                value={customReturnDate}
                onChange={(e) => setCustomReturnDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Condition Upon Return</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value as ComputerCondition)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                <option value="new">New / Freshly Imaged</option>
                <option value="good">Good (Normal wear, fully functional)</option>
                <option value="fair">Fair (Cosmetic scratches, functional)</option>
                <option value="damaged">Damaged (Requires technician service)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return Notes / Reason</label>
              <textarea
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Device turned in upon employee offboarding or hardware upgrade..."
                className="w-full text-xs rounded-lg border border-slate-300 p-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUnassignModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleUnassignConfirm}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Processing...' : 'Confirm Return & Unassign'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION SUB-MODAL: RETIRE ASSET */}
      {isRetireModalOpen && (
        <Modal
          isOpen={isRetireModalOpen}
          onClose={() => setIsRetireModalOpen(false)}
          title={`Retire Hardware Asset: ${computer.assetTag}`}
          subtitle="Decommission device permanently from active IT inventory"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Confirm Asset Retirement</p>
                <p className="mt-0.5 opacity-90">
                  Retiring an asset marks it as decommissioned, removes any assigned user, and certifies it for salvage, resale, or certified E-Waste disposal.
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
                placeholder="e.g. End of life cycle, irreparable motherboard failure, unrepairable screen damage..."
                className="w-full text-xs rounded-lg border border-slate-300 p-2"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRetireModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!retireReason.trim() || isActionLoading}
                onClick={handleRetireConfirm}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-900 cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Retiring...' : 'Confirm Retirement'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION SUB-MODAL: DELETE ASSET */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={`Delete Asset: ${computer.assetTag}`}
          subtitle="Permanently remove asset record from the system"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Permanent Deletion Warning</p>
                <p className="mt-0.5 opacity-90">
                  Are you sure you want to delete <strong>{computer.assetTag}</strong> ({computer.brand} {computer.model})? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-xs"
              >
                {isActionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Physical Asset Tag QR Sticker Modal */}
      {isQRTagModalOpen && (
        <AssetTagQRModal
          computer={computer}
          isOpen={isQRTagModalOpen}
          onClose={() => setIsQRTagModalOpen(false)}
        />
      )}
    </>
  );
};
