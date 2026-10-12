import React, { useState } from 'react';
import {
  Computer,
  Company,
  Department,
  ComputerType,
} from '../../types';
import { ComputerStatusIndicator, STATUS_CONFIGS } from './ComputerStatusIndicator';
import { Badge } from '../common/Badge';
import {
  Laptop,
  Monitor,
  Printer,
  Server,
  Network,
  Cpu,
  User,
  Calendar,
  Building2,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  UserMinus,
  Edit,
  Trash2,
  Archive,
  Ticket as TicketIcon,
  Copy,
  Check,
  HardDrive,
  Eye,
  ExternalLink,
} from 'lucide-react';

export interface ComputerCardProps {
  computer: Computer;
  company?: Company;
  department?: Department;
  onSelectComputer: (computer: Computer) => void;
  onAssign?: (computer: Computer) => void;
  onUnassign?: (computer: Computer) => void;
  onEdit?: (computer: Computer) => void;
  onRetire?: (computer: Computer) => void;
  onDelete?: (computer: Computer) => void;
  onCreateTicket?: (computer: Computer) => void;
  canManage: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
}

const getDeviceIcon = (type: ComputerType) => {
  switch (type) {
    case 'laptop':
      return Laptop;
    case 'desktop':
    case 'workstation':
      return Monitor;
    case 'server':
      return Server;
    case 'network_device':
      return Network;
    case 'printer':
      return Printer;
    default:
      return Cpu;
  }
};

export const ComputerCard: React.FC<ComputerCardProps> = ({
  computer,
  company,
  department,
  onSelectComputer,
  onAssign,
  onUnassign,
  onEdit,
  onRetire,
  onDelete,
  onCreateTicket,
  canManage,
  isAdmin,
  isEmployee,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const DeviceIcon = getDeviceIcon(computer.type);
  const statusCfg = STATUS_CONFIGS[computer.status] || STATUS_CONFIGS.available;

  // Copy helper
  const handleCopy = (e: React.MouseEvent, text: string, fieldName: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Warranty status calculations
  const getWarrantyInfo = () => {
    if (!computer.warrantyExpiration) return null;
    const expDate = new Date(computer.warrantyExpiration).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((expDate - now) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return {
        label: 'Expired',
        badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
        isWarning: true,
      };
    }
    if (diffDays <= 30) {
      return {
        label: `${diffDays}d left`,
        badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
        isWarning: true,
      };
    }
    if (diffDays <= 90) {
      return {
        label: `${diffDays}d left`,
        badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        isWarning: true,
      };
    }
    return {
      label: 'Active',
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      isWarning: false,
    };
  };

  const warrantyInfo = getWarrantyInfo();

  return (
    <div
      onClick={() => onSelectComputer(computer)}
      className="group bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative"
    >
      {/* 1. Status Accent Top Border Bar */}
      <div
        className={`h-1.5 w-full transition-colors ${
          computer.status === 'available'
            ? 'bg-emerald-500'
            : computer.status === 'assigned' || computer.status === 'in_use'
            ? 'bg-amber-500'
            : computer.status === 'under_repair' || computer.status === 'maintenance'
            ? 'bg-rose-500'
            : computer.status === 'lost'
            ? 'bg-red-600'
            : 'bg-slate-400'
        }`}
      />

      <div className="p-4 flex-1 flex flex-col">
        {/* 2. Top Header Row: Asset Tag + Type Icon + Status Indicator Badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <DeviceIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded ring-1 ring-indigo-200 inline-block tracking-tight">
                {computer.assetTag}
              </span>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5 capitalize">
                {computer.type.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Prominent Visual Status Indicator */}
          <div className="shrink-0 flex items-center gap-1.5">
            <ComputerStatusIndicator status={computer.status} size="sm" showIcon={true} />
            <Badge variant="computerCondition" value={computer.condition} size="sm" />
          </div>
        </div>

        {/* 3. Hardware Model Title & Identity */}
        <div className="mb-3">
          <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {computer.brand} {computer.model}
          </h4>

          {/* Hostname & Serial */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] font-mono text-slate-500">
            {computer.hostname && (
              <span className="flex items-center gap-1 text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                <span>{computer.hostname}</span>
              </span>
            )}
            <span
              onClick={(e) => handleCopy(e, computer.serialNumber || computer.assetTag, 'sn')}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors cursor-copy"
              title="Click to copy Serial Number"
            >
              <span>S/N: {computer.serialNumber || 'N/A'}</span>
              {copiedField === 'sn' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-2.5 h-2.5 opacity-60" />
              )}
            </span>
          </div>
        </div>

        {/* 4. Specifications Quick Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
          {computer.cpu && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <Cpu className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[120px]">{computer.cpu}</span>
            </span>
          )}
          {computer.ram && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <span>{computer.ram}</span>
            </span>
          )}
          {computer.storage && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              <HardDrive className="w-3 h-3 text-slate-400" />
              <span>{computer.storage}</span>
            </span>
          )}
          {computer.os && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
              <span className="truncate max-w-[100px]">{computer.os}</span>
            </span>
          )}
        </div>

        {/* 5. Custody / Status Context Box */}
        <div className="mt-auto pt-2">
          {computer.status === 'available' ? (
            /* In Stock Banner - Green */
            <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900 text-[11px]">In Stock (IT Pool)</p>
                  <p className="text-[10px] text-emerald-700">Ready for immediate employee deployment</p>
                </div>
              </div>

              {canManage && onAssign && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(computer);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  Assign
                </button>
              )}
            </div>
          ) : computer.status === 'assigned' || computer.status === 'in_use' ? (
            /* Assigned Custodian Banner - Amber */
            <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-amber-900 text-[11px] truncate">
                    {computer.assignedEmployeeName || 'Assigned Custodian'}
                  </p>
                  <p className="text-[10px] text-amber-700 truncate">
                    Assigned: {computer.assignedDate || 'In use'}
                  </p>
                </div>
              </div>

              {canManage && onUnassign && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnassign(computer);
                  }}
                  className="px-2 py-1 text-[11px] font-medium bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors shrink-0 cursor-pointer"
                >
                  Return
                </button>
              )}
            </div>
          ) : computer.status === 'under_repair' || computer.status === 'maintenance' ? (
            /* Under Repair Banner - Red */
            <div className="p-2.5 rounded-lg bg-rose-50/80 border border-rose-200/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <statusCfg.IconComponent className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-rose-900 text-[11px]">Under Active Repair</p>
                  <p className="text-[10px] text-rose-700">Hardware bench / service diagnostics</p>
                </div>
              </div>
            </div>
          ) : (
            /* Retired or Lost */
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs">
              <statusCfg.IconComponent className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700 text-[11px] capitalize">{computer.status}</p>
                <p className="text-[10px] text-slate-500">{statusCfg.subtext}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Footer: Company, Department, Location & Warranty */}
      <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-700 truncate">
            {company?.name || 'Company'}
          </span>
          {department && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 truncate">{department.name}</span>
            </>
          )}
        </div>

        {warrantyInfo && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${warrantyInfo.badgeClass}`}
            title={`Warranty expires on ${computer.warrantyExpiration}`}
          >
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>{warrantyInfo.label}</span>
          </span>
        )}
      </div>

      {/* 7. Action Toolbar */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectComputer(computer);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Specs</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Quick Create Ticket for this Computer */}
          {onCreateTicket && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreateTicket(computer);
              }}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
              title="Raise IT Ticket for this asset"
            >
              <TicketIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {canManage && (
            <>
              {/* Quick Assign / Unassign button */}
              {computer.status === 'assigned' || computer.assignedEmployeeId ? (
                onUnassign && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnassign(computer);
                    }}
                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                    title="Return / Unassign Asset"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )
              ) : (
                onAssign && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssign(computer);
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                    title="Assign to Employee"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                )
              )}

              {/* Edit Asset */}
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(computer);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  title="Edit Specifications"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Retire Asset */}
              {isAdmin && computer.status !== 'retired' && onRetire && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetire(computer);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  title="Retire Asset"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Delete Asset */}
              {isAdmin && onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(computer);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                  title="Delete Hardware Asset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
