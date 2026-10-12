import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { AppUser, UserRole, UserStatus } from '../../types';
import { User, Lock, Mail, Building, Layers, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

interface UserModalProps {
  user?: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ user, isOpen, onClose }) => {
  const { createUser, updateUser } = useAuth();
  const { companies, departments } = useData();
  const { showToast } = useNotifications();

  const isEditing = !!user;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [password, setPassword] = useState('');
  const [forceReset, setForceReset] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setUsername(user.username);
      setEmail(user.email);
      setRole(user.role);
      setCompanyId(user.companyId || '');
      setDepartmentId(user.departmentId || '');
      setStatus(user.status);
      setForceReset(user.mustChangePassword ?? false);
      setPassword('');
      setErrorMsg(null);
    } else {
      setFullName('');
      setUsername('');
      setEmail('');
      setRole('employee');
      setCompanyId(companies[0]?.id || '');
      setDepartmentId('');
      setStatus('active');
      setPassword('Acculate@123');
      setForceReset(true);
      setErrorMsg(null);
    }
  }, [user, isOpen, companies]);

  // Filter departments by company
  const availableDepts = departments.filter((d) => !companyId || d.companyId === companyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setErrorMsg('Full Name, Username, and Email are required.');
      return;
    }

    if (!isEditing && password.length < 8) {
      setErrorMsg('Initial password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selCo = companies.find((c) => c.id === companyId);
      const selDept = departments.find((d) => d.id === departmentId);

      if (isEditing && user) {
        await updateUser(user.id, {
          fullName: fullName.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          role,
          companyId: companyId || undefined,
          companyName: selCo?.name,
          departmentId: departmentId || undefined,
          departmentName: selDept?.name,
          status,
          mustChangePassword: forceReset,
        });

        showToast({
          title: 'User Updated',
          message: `User record for "${fullName}" was updated.`,
          type: 'success',
        });
      } else {
        await createUser(
          {
            fullName: fullName.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            role,
            companyId: companyId || undefined,
            companyName: selCo?.name,
            departmentId: departmentId || undefined,
            departmentName: selDept?.name,
            status,
            mustChangePassword: forceReset,
          },
          password
        );

        showToast({
          title: 'User Created',
          message: `User account @${username} was created successfully.`,
          type: 'success',
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save user profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit User: ${user.fullName}` : 'Create New User Account'}
      subtitle={isEditing ? 'Update access role, organization, and status' : 'Add an authenticated system user'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Marcus Vance"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            required
          />
        </div>

        {/* Username & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="e.g. marcusv"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="m.vance@company.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>
          </div>
        </div>

        {/* Role & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              System Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="admin">Administrator (Full Access)</option>
              <option value="technician">IT Technician (Tickets & Inventory)</option>
              <option value="employee">Employee (Own Inquiries & Equipment)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="active">Active (Can Sign In)</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="inactive">Inactive / Suspended</option>
            </select>
          </div>
        </div>

        {/* Company & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Company
            </label>
            <select
              value={companyId}
              onChange={(e) => {
                const newCo = e.target.value;
                setCompanyId(newCo);
                const currentDept = departments.find((d) => d.id === departmentId);
                const validDepts = departments.filter((d) => d.companyId === newCo);
                const match = validDepts.find((d) => d.name.toLowerCase() === currentDept?.name.toLowerCase());
                setDepartmentId(match ? match.id : (validDepts[0]?.id || ''));
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="">-- No Company Assigned --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="">-- No Department Assigned --</option>
              {availableDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Initial Password (only on create) */}
        {!isEditing && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Force password change on next login */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={forceReset}
              onChange={(e) => setForceReset(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <div className="text-xs text-slate-700">
              <span className="font-semibold block">Force password reset on next login</span>
              <span className="text-[11px] text-slate-500">
                User will be required to create their own new password upon signing in.
              </span>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isEditing ? 'Save Changes' : 'Create User'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
