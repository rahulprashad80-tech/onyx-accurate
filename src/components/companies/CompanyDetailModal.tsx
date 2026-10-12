import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Company, Department, Employee, Computer, Ticket } from '../../types';
import { Badge } from '../common/Badge';
import { AuditInfo } from '../common/AuditInfo';
import {
  Building2,
  Layers,
  Users,
  Monitor,
  Ticket as TicketIcon,
  Clock,
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  Edit,
  Trash2,
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  ExternalLink,
  Laptop,
  AlertCircle,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { DepartmentModal } from '../departments/DepartmentModal';

interface CompanyDetailModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (company: Company) => void;
  onDeleteRequest: (company: Company) => void;
  onSelectDepartment?: (dept: Department) => void;
  onSelectEmployee?: (emp: Employee) => void;
  onSelectComputer?: (comp: Computer) => void;
  onSelectTicket?: (ticket: Ticket) => void;
}

type TabType = 'departments' | 'employees' | 'assets' | 'tickets' | 'audit';

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  company,
  isOpen,
  onClose,
  onEdit,
  onDeleteRequest,
  onSelectDepartment,
  onSelectEmployee,
  onSelectComputer,
  onSelectTicket,
}) => {
  const { userProfile, activeRole } = useAuth();
  const {
    departments,
    employees,
    computers,
    tickets,
    archiveCompany,
    restoreCompany,
  } = useData();

  const [activeTab, setActiveTab] = useState<TabType>('departments');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);

  if (!company) return null;

  const isAdmin = activeRole === 'admin';

  // Linked records
  const companyDepartments = departments.filter((d) => d.companyId === company.id);
  const companyEmployees = employees.filter((e) => e.companyId === company.id);
  const companyAssets = computers.filter((c) => c.companyId === company.id);
  const companyTickets = tickets.filter((t) => t.companyId === company.id);
  const openTickets = companyTickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user'
  );

  const actor = {
    name: userProfile?.displayName || 'Administrator',
    role: activeRole,
  };

  const handleToggleArchive = async () => {
    try {
      setIsUpdatingStatus(true);
      if (company.status === 'active') {
        await archiveCompany(company.id, actor);
      } else {
        await restoreCompany(company.id, actor);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company.name}
      subtitle={`Code: ${company.code} • Corporate Entity Profile`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="bg-slate-50 rounded-xl border border-slate-200/90 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                {company.code.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{company.name}</h2>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded ring-1 ring-indigo-200">
                    {company.code}
                  </span>
                  <Badge
                    variant={company.status === 'active' ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {company.status === 'active' ? 'Active Entity' : 'Inactive / Archived'}
                  </Badge>
                </div>
                {company.contactPerson && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lead Contact: <strong className="text-slate-700">{company.contactPerson}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Admin Actions */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onEdit(company)}
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
                  <span>{company.status === 'active' ? 'Archive' : 'Restore'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteRequest(company)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Contact & Location Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-200/80 text-xs text-slate-600">
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{company.contactEmail || 'No email specified'}</span>
            </div>

            <div className="flex items-center gap-2 truncate">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{company.phone || 'No phone specified'}</span>
            </div>

            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {[company.address, company.city, company.country].filter(Boolean).join(', ') ||
                  'No location specified'}
              </span>
            </div>
          </div>

          {company.notes && (
            <div className="pt-2 text-xs text-slate-500 border-t border-slate-200/60">
              <span className="font-semibold text-slate-700">Notes:</span> {company.notes}
            </div>
          )}
        </div>

        {/* 4 Summary Stat Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Departments</span>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">{companyDepartments.length}</div>
            <div className="text-[11px] text-slate-400">Organizational units</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Employees</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">{companyEmployees.length}</div>
            <div className="text-[11px] text-slate-400">Total staff registered</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>IT Assets</span>
              <Monitor className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">{companyAssets.length}</div>
            <div className="text-[11px] text-slate-400">Allocated hardware</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Open Tickets</span>
              <TicketIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600">{openTickets.length}</div>
            <div className="text-[11px] text-slate-400">Pending resolution</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`px-3 py-2 font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'departments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Departments ({companyDepartments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            className={`px-3 py-2 font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'employees'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Employees ({companyEmployees.length})
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
            IT Assets ({companyAssets.length})
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
            Support Tickets ({companyTickets.length})
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
            Audit History ({company.auditHistory?.length || 0})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[220px]">
          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-500 font-medium">
                  Configured departments belonging to {company.name}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsAddDeptOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Department</span>
                  </button>
                )}
              </div>

              {companyDepartments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No departments created under this company yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Head / Manager</th>
                        <th className="py-2.5 px-3">Staff</th>
                        <th className="py-2.5 px-3">Assets</th>
                        <th className="py-2.5 px-3">Open Tickets</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companyDepartments.map((dept) => {
                        const dEmps = employees.filter((e) => e.departmentId === dept.id).length;
                        const dAssets = computers.filter((c) => c.departmentId === dept.id).length;
                        const dOpenTickets = tickets.filter(
                          (t) =>
                            t.departmentId === dept.id &&
                            (t.status === 'open' || t.status === 'in_progress')
                        ).length;

                        return (
                          <tr
                            key={dept.id}
                            onClick={() => onSelectDepartment?.(dept)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{dept.name}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{dept.code || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{dept.managerName || dept.headName || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-700">{dEmps}</td>
                            <td className="py-2.5 px-3 text-slate-700">{dAssets}</td>
                            <td className="py-2.5 px-3">
                              {dOpenTickets > 0 ? (
                                <span className="font-semibold text-amber-600">{dOpenTickets}</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant={dept.status === 'active' ? 'success' : 'neutral'} size="sm">
                                {dept.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === 'employees' && (
            <div>
              {companyEmployees.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No staff members currently assigned to this company entity.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5 px-3">Employee Name</th>
                        <th className="py-2.5 px-3">Job Title</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companyEmployees.map((emp) => {
                        const dept = departments.find((d) => d.id === emp.departmentId);
                        return (
                          <tr
                            key={emp.id}
                            onClick={() => onSelectEmployee?.(emp)}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{emp.fullName}</td>
                            <td className="py-2.5 px-3 text-slate-600">{emp.jobTitle}</td>
                            <td className="py-2.5 px-3 text-slate-600">{dept?.name || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{emp.email}</td>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div>
              {companyAssets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No IT hardware or computers registered under this company.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5 px-3">Asset Tag</th>
                        <th className="py-2.5 px-3">Type / Model</th>
                        <th className="py-2.5 px-3">Hostname</th>
                        <th className="py-2.5 px-3">Assigned To</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companyAssets.map((asset) => (
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
              {companyTickets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No support tickets recorded for this company.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2.5 px-3">Ticket ID</th>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Requester</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companyTickets.map((tck) => (
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

          {/* Audit History Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              {(!company.auditHistory || company.auditHistory.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No governance audit log entries recorded.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {company.auditHistory.map((entry) => (
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

        {/* Audit footer */}
        <div className="pt-3 border-t border-slate-200">
          <AuditInfo createdAt={company.createdAt} updatedAt={company.updatedAt} />
        </div>
      </div>

      {isAddDeptOpen && (
        <DepartmentModal
          department={null}
          isOpen={isAddDeptOpen}
          onClose={() => setIsAddDeptOpen(false)}
          defaultCompanyId={company.id}
        />
      )}
    </Modal>
  );
};
