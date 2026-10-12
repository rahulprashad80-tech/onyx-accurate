import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { AppUser, UserRole } from '../../types';
import { UserModal } from './UserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  KeyRound,
  Trash2,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Building,
  Layers,
  Clock,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { users, currentUser, activeRole, deleteUser, toggleUserStatus, approveUser } = useAuth();
  const { companies, departments } = useData();
  const { showToast } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AppUser | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<AppUser | null>(null);

  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = activeRole === 'admin';

  const pendingUsers = useMemo(() => {
    return users.filter((u) => u.status === 'pending_approval');
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (companyFilter !== 'all' && u.companyId !== companyFilter) return false;
      if (departmentFilter !== 'all') {
        const selectedDept = departments.find((d) => d.id === departmentFilter);
        const deptName = selectedDept ? selectedDept.name.toLowerCase() : departmentFilter.toLowerCase();
        const userDept = departments.find((d) => d.id === u.departmentId);
        if (
          u.departmentId !== departmentFilter &&
          (!userDept || userDept.name.toLowerCase() !== deptName) &&
          (!u.departmentName || u.departmentName.toLowerCase() !== deptName)
        ) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.companyName && u.companyName.toLowerCase().includes(q)) ||
          (u.departmentName && u.departmentName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, companyFilter, departmentFilter, searchTerm, departments]);

  const confirmDeleteAction = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await deleteUser(userToDelete.id);
      showToast({
        title: 'User Removed',
        message: `Account @${userToDelete.username} was permanently removed.`,
        type: 'success',
      });
      setUserToDelete(null);
    } catch (err: any) {
      showToast({
        title: 'Deletion Failed',
        message: err?.message || 'Could not delete user.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (u: AppUser) => {
    try {
      await toggleUserStatus(u.id);
      showToast({
        title: 'Status Updated',
        message: `Account @${u.username} is now ${u.status === 'active' ? 'Inactive' : 'Active'}.`,
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Update Failed',
        message: err?.message || 'Could not update status.',
        type: 'error',
      });
    }
  };

  const handleApproveUser = async (u: AppUser) => {
    try {
      await approveUser(u.id);
      showToast({
        title: 'Account Approved',
        message: `Employee @${u.username} (${u.fullName}) has been approved and granted login access.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Approval Failed',
        message: err?.message || 'Could not approve account.',
        type: 'error',
      });
    }
  };

  const formatRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case 'technician':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800">
            IT Tech
          </span>
        );
      case 'employee':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
            Employee
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name, username, email, company..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="technician">IT Technicians</option>
            <option value="employee">Employees</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="pending_approval">
              Pending Approval ({pendingUsers.length})
            </option>
            <option value="inactive">Inactive / Suspended</option>
          </select>

          <select
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setDepartmentFilter('all');
            }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-slate-700 focus:ring-1 focus:ring-indigo-500"
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
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-slate-700 focus:ring-1 focus:ring-indigo-500"
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
                setUserToEdit(null);
                setIsUserModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Approvals Notification Banner */}
      {isAdmin && pendingUsers.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                {pendingUsers.length} Employee Registration{pendingUsers.length > 1 ? 's' : ''} Awaiting Approval
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                New staff self-registered with Employee role. Authorize their accounts to grant system access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('pending_approval')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            Filter Pending Requests ({pendingUsers.length})
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Create users or adjust filters to view system accounts."
            actionLabel={isAdmin ? 'Add First User' : undefined}
            onAction={isAdmin ? () => {
              setUserToEdit(null);
              setIsUserModalOpen(true);
            } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Company & Department</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Security Flags</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Created Date</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const co = companies.find((c) => c.id === u.companyId);
                  const dept = departments.find((d) => d.id === u.departmentId);
                  const isCurrent = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {u.fullName}
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              @{u.username} • {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatRoleBadge(u.role)}
                      </td>

                      <td className="py-3 px-4">
                        <p className="text-slate-800 font-medium">
                          {co?.name || u.companyName || 'Unassigned'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {dept?.name || u.departmentName || 'No Dept'}
                        </p>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : u.status === 'pending_approval' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-700" /> Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {u.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" /> Force Reset Pending
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Normal</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {u.lastLoginDate ? new Date(u.lastLoginDate).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {u.status === 'pending_approval' && (
                              <button
                                type="button"
                                onClick={() => handleApproveUser(u)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer mr-1 transition-colors"
                                title="Approve Employee Account"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setUserToEdit(u);
                                setIsUserModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
                              title="Edit User"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setUserToReset(u);
                                setIsResetModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 cursor-pointer"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  u.status === 'active'
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
                                }`}
                                title={u.status === 'active' ? 'Deactivate User' : 'Activate User'}
                              >
                                {u.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* Edit / Create User Modal */}
      {isUserModalOpen && (
        <UserModal
          user={userToEdit}
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            setUserToEdit(null);
          }}
        />
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <ResetPasswordModal
          user={userToReset}
          isOpen={isResetModalOpen}
          onClose={() => {
            setIsResetModalOpen(false);
            setUserToReset(null);
          }}
        />
      )}

      {/* Confirm User Deletion */}
      {userToDelete && (
        <ConfirmDialog
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={confirmDeleteAction}
          title="Delete User Account"
          message={`Are you sure you want to permanently delete the user account for "${userToDelete.fullName}" (@${userToDelete.username})? They will immediately lose access to the system.`}
          confirmLabel="Delete User"
          isDestructive={true}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
