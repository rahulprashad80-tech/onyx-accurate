import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Department, Company, Employee, Computer, Ticket } from '../../types';
import { Badge } from '../common/Badge';
import { AuditInfo } from '../common/AuditInfo';
import {
  Layers,
  Building2,
  Users,
  Monitor,
  Ticket as TicketIcon,
  Clock,
  Mail,
  Phone,
  MapPin,
  User,
  Edit,
  Trash2,
  Archive,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface DepartmentDetailModalProps {
  department: Department | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (department: Department) => void;
  onDeleteRequest: (department: Department) => void;
  onSelectEmployee?: (emp: Employee) => void;
  onSelectComputer?: (comp: Computer) => void;
  onSelectTicket?: (ticket: Ticket) => void;
}

type TabType = 'employees' | 'assets' | 'tickets' | 'audit';

export const DepartmentDetailModal: React.FC<DepartmentDetailModalProps> = ({
  department,
  isOpen,
  onClose,
  onEdit,
  onDeleteRequest,
  onSelectEmployee,
  onSelectComputer,
  onSelectTicket,
}) => {
  const { userProfile, activeRole } = useAuth();
  const {
    companies,
    employees,
    computers,
    tickets,
    archiveDepartment,
    restoreDepartment,
  } = useData();

  const [activeTab, setActiveTab] = useState<TabType>('employees');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!department) return null;

  const isAdmin = activeRole === 'admin';
  const parentCompany = companies.find((c) => c.id === department.companyId);

  // Linked records
  const deptEmployees = employees.filter((e) => e.departmentId === department.id);
  const deptAssets = computers.filter((c) => c.departmentId === department.id);
  const deptTickets = tickets.filter((t) => t.departmentId === department.id);
  const openTickets = deptTickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user'
  );

  const actor = {
    name: userProfile?.displayName || 'Administrator',
    role: activeRole,
  };

  const handleToggleArchive = async () => {
    try {
      setIsUpdatingStatus(true);
      if (department.status === 'active') {
        await archiveDepartment(department.id, actor);
      } else {
        await restoreDepartment(department.id, actor);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={department.name}
      subtitle={`Parent: ${parentCompany?.name || 'Corporate Entity'} ${
        department.code ? `• Code: ${department.code}` : ''
      }`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="bg-slate-50 rounded-xl border border-slate-200/90 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                {department.code ? department.code.slice(0, 3) : department.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">{department.name}</h2>
                  {department.code && (
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded ring-1 ring-indigo-200">
                      {department.code}
                    </span>
                  )}
                  <Badge
                    variant={department.status === 'active' ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {department.status === 'active' ? 'Active Unit' : 'Inactive / Archived'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Company: <strong className="text-slate-700">{parentCompany?.name || 'Unassigned'}</strong>{' '}
                    ({parentCompany?.code})
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Admin Actions */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onEdit(department)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleArchive}
                  disabled={isUpdatingStatus}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{department.status === 'active' ? 'Archive' : 'Restore'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteRequest(department)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-200/80 text-xs text-slate-600">
            <div className="flex items-center gap-2 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Manager: <strong>{department.managerName || department.headName || 'Not designated'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {department.location || department.floorLocation || 'No physical location set'}
              </span>
            </div>

            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{department.email || 'No email set'}</span>
            </div>
          </div>

          {department.notes && (
            <div className="pt-2 text-xs text-slate-500 border-t border-slate-200/60">
              <span className="font-semibold text-slate-700">Scope:</span> {department.notes}
            </div>
          )}
        </div>

        {/* 3 Summary Stat Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Department Staff</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">{deptEmployees.length}</div>
            <div className="text-[11px] text-slate-400">Total assigned employees</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>IT Hardware Assets</span>
              <Monitor className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">{deptAssets.length}</div>
            <div className="text-[11px] text-slate-400">Allocated computers & devices</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Open Tickets</span>
              <TicketIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600">{openTickets.length}</div>
            <div className="text-[11px] text-slate-400">Pending support tickets</div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            className={`px-3 py-2 font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'employees'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Employees ({deptEmployees.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-2 font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'assets'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Assigned Assets ({deptAssets.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-2 font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Support Tickets ({deptTickets.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2 font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Audit Log ({department.auditHistory?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[220px]">
          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div>
              {deptEmployees.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No staff members currently mapped to this department.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5 px-3">Employee Name</th>
                        <th className="py-2.5 px-3">Job Title</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deptEmployees.map((emp) => (
                        <tr
                          key={emp.id}
                          onClick={() => onSelectEmployee?.(emp)}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{emp.fullName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{emp.jobTitle}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{emp.email}</td>
                          <td className="py-2.5 px-3 text-slate-600">{emp.phone || '—'}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                emp.role === 'admin'
                                  ? 'primary'
                                  : emp.role === 'technician'
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {emp.role}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={emp.status === 'active' ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {emp.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div>
              {deptAssets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No computers or hardware assets assigned to this department.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5 px-3">Asset Tag</th>
                        <th className="py-2.5 px-3">Model / Hardware</th>
                        <th className="py-2.5 px-3">Hostname</th>
                        <th className="py-2.5 px-3">Assigned User</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deptAssets.map((asset) => (
                        <tr
                          key={asset.id}
                          onClick={() => onSelectComputer?.(asset)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                            {asset.assetTag}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">
                              {asset.brand} {asset.model}
                            </div>
                            <div className="text-[11px] text-slate-400 capitalize">{asset.type}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {asset.hostname || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {asset.assignedEmployeeName || (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                asset.status === 'available'
                                  ? 'success'
                                  : asset.status === 'assigned' || asset.status === 'in_use'
                                  ? 'primary'
                                  : asset.status === 'under_repair'
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {asset.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 capitalize text-slate-600">
                            {asset.condition || 'good'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div>
              {deptTickets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No support tickets logged for this department.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5 px-3">Ticket ID</th>
                        <th className="py-2.5 px-3">Issue Title</th>
                        <th className="py-2.5 px-3">Requester</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deptTickets.map((tck) => (
                        <tr
                          key={tck.id}
                          onClick={() => onSelectTicket?.(tck)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                            {tck.ticketNumber}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs truncate">
                            {tck.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{tck.requesterName}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                tck.priority === 'critical'
                                  ? 'danger'
                                  : tck.priority === 'high'
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {tck.priority}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                tck.status === 'open'
                                  ? 'danger'
                                  : tck.status === 'in_progress'
                                  ? 'warning'
                                  : tck.status === 'resolved'
                                  ? 'success'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {tck.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {new Date(tck.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              {(!department.auditHistory || department.auditHistory.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No department change audit log entries recorded.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {department.auditHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              entry.type === 'created'
                                ? 'success'
                                : entry.type === 'archived'
                                ? 'neutral'
                                : entry.type === 'reassigned'
                                ? 'primary'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {entry.type.toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-slate-900">{entry.message}</span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Performed by: <span className="font-medium text-slate-700">{entry.actorName}</span>{' '}
                          ({entry.actorRole})
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-200">
          <AuditInfo createdAt={department.createdAt} updatedAt={department.updatedAt} />
        </div>
      </div>
    </Modal>
  );
};
