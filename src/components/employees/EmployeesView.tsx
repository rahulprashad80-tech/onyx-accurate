import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { Employee, Computer } from '../../types';
import { EmployeeModal } from './EmployeeModal';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  Monitor,
  Ticket,
} from 'lucide-react';

interface EmployeesViewProps {
  onSelectComputer?: (computer: Computer) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ onSelectComputer }) => {
  const { activeRole } = useAuth();
  const { employees, companies, departments, computers, tickets, deleteEmployee } = useData();
  const { showToast } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Confirm delete state
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = activeRole === 'admin';

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (roleFilter !== 'all' && e.role !== roleFilter) return false;
      if (companyFilter !== 'all' && e.companyId !== companyFilter) return false;
      if (departmentFilter !== 'all') {
        const selectedDept = departments.find((d) => d.id === departmentFilter);
        const deptName = selectedDept ? selectedDept.name.toLowerCase() : departmentFilter.toLowerCase();
        const empDept = departments.find((d) => d.id === e.departmentId);
        if (e.departmentId !== departmentFilter && (!empDept || empDept.name.toLowerCase() !== deptName)) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const co = companies.find((c) => c.id === e.companyId);
        const dp = departments.find((d) => d.id === e.departmentId);
        return (
          e.fullName.toLowerCase().includes(query) ||
          (e.username || '').toLowerCase().includes(query) ||
          e.email.toLowerCase().includes(query) ||
          (e.jobTitle || '').toLowerCase().includes(query) ||
          (co?.name || '').toLowerCase().includes(query) ||
          (dp?.name || '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [employees, roleFilter, companyFilter, departmentFilter, searchTerm, departments, companies]);

  const confirmDeleteAction = async () => {
    if (!employeeToDelete) return;
    try {
      setIsDeleting(true);
      await deleteEmployee(employeeToDelete.id);
      showToast({
        title: 'Employee Removed',
        message: `Employee "${employeeToDelete.name}" was successfully removed.`,
        type: 'success',
      });
      setEmployeeToDelete(null);
    } catch (err: any) {
      showToast({
        title: 'Delete Failed',
        message: err?.message || 'Could not delete employee record.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, email, or job title..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="technician">IT Technicians</option>
            <option value="employee">Employees</option>
          </select>

          <select
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setDepartmentFilter('all');
            }}
            className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700"
          >
            <option value="all">All Departments</option>
            {(companyFilter === 'all'
              ? departments
              : departments.filter((d) => d.companyId === companyFilter)
            ).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {companyFilter === 'all' ? `(${companies.find((c) => c.id === d.companyId)?.name || ''})` : ''}
              </option>
            ))}
          </select>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setSelectedEmployee(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title={employees.length === 0 ? "No employees found" : "No employee records found"}
            description={employees.length === 0 ? "There are no employee staff records yet. Add employees to assign hardware assets and track support ticket requests." : "No employee records match the current search filters."}
            actionLabel={isAdmin ? 'Add Employee' : undefined}
            onAction={isAdmin ? () => {
              setSelectedEmployee(null);
              setIsModalOpen(true);
            } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Org</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Hardware</th>
                  <th className="py-3 px-4">Open Tickets</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const comp = companies.find((c) => c.id === emp.companyId);
                  const dept = departments.find((d) => d.id === emp.departmentId);
                  const assignedDevices = computers.filter(
                    (c) => c.assignedEmployeeId === emp.id || c.assignedEmployeeName === emp.fullName
                  );
                  const openEmpTickets = tickets.filter(
                    (t) => t.requesterEmail === emp.email && (t.status === 'open' || t.status === 'in_progress')
                  ).length;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{emp.fullName}</span>
                          {emp.username && (
                            <span className="text-[10px] font-mono font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              @{emp.username}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{emp.jobTitle || 'Employee'}</div>
                        <div className="text-[10px] text-indigo-600 font-mono">{emp.email}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        <p className="font-medium">{dept?.name || 'Unassigned Dept'}</p>
                        <p className="text-[10px] text-slate-400">{comp?.name || 'Unassigned Org'}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="role" value={emp.role} size="sm" />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                            emp.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : emp.status === 'on_leave'
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.status === 'active'
                                ? 'bg-emerald-500'
                                : emp.status === 'on_leave'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {emp.status === 'active' ? 'Active' : emp.status === 'on_leave' ? 'On Leave' : 'Terminated'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {assignedDevices.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">No devices</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignedDevices.map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => onSelectComputer && onSelectComputer(d)}
                                className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded ring-1 ring-indigo-200 cursor-pointer"
                                title={`${d.brand} ${d.model}`}
                              >
                                {d.assetTag}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {openEmpTickets > 0 ? (
                          <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] ring-1 ring-rose-200">
                            {openEmpTickets} active
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmployeeToDelete({ id: emp.id, name: emp.fullName })}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <EmployeeModal
        employee={selectedEmployee}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Destructive Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!employeeToDelete}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={confirmDeleteAction}
        title="Delete Employee Record"
        message={`Are you sure you want to permanently delete the profile for "${employeeToDelete?.name}"? Any linked computer assets will need to be reallocated.`}
        confirmLabel="Delete Employee"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
