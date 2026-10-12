import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Department } from '../../types';
import {
  AlertCircle,
  Layers,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface DepartmentModalProps {
  department: Department | null;
  isOpen: boolean;
  onClose: () => void;
  defaultCompanyId?: string;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  department,
  isOpen,
  onClose,
  defaultCompanyId,
}) => {
  const { userProfile, activeRole } = useAuth();
  const { createDepartment, updateDepartment, departments, companies } = useData();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [managerName, setManagerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (department) {
      setName(department.name);
      setCode(department.code || '');
      setCompanyId(department.companyId);
      setManagerName(department.managerName || department.headName || '');
      setEmail(department.email || '');
      setPhone(department.phone || '');
      setLocation(department.location || department.floorLocation || '');
      setNotes(department.notes || '');
      setStatus(department.status === 'inactive' ? 'inactive' : 'active');
    } else {
      setName('');
      setCode('');
      setCompanyId(defaultCompanyId || companies[0]?.id || '');
      setManagerName('');
      setEmail('');
      setPhone('');
      setLocation('');
      setNotes('');
      setStatus('active');
    }
    setErrorMsg('');
  }, [department, isOpen, defaultCompanyId, companies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName) {
      setErrorMsg('Department Name is required.');
      return;
    }
    if (!companyId) {
      setErrorMsg('Please select a parent company.');
      return;
    }

    // Uniqueness validation: Department names should be unique within each company
    const nameConflict = departments.find(
      (d) =>
        d.companyId === companyId &&
        d.id !== department?.id &&
        d.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameConflict) {
      const parentCo = companies.find((c) => c.id === companyId);
      setErrorMsg(
        `Department name "${trimmedName}" already exists within ${parentCo?.name || 'this company'}. Department names must be unique within each company.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const actor = {
        name: userProfile?.displayName || 'Administrator',
        role: activeRole,
      };

      const payload = {
        name: trimmedName,
        code: trimmedCode || undefined,
        companyId,
        managerName: managerName.trim() || undefined,
        headName: managerName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        floorLocation: location.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      };

      if (department) {
        await updateDepartment(department.id, payload, {
          type: 'updated',
          actorName: actor.name,
          actorRole: actor.role,
          message: `Updated department ${trimmedName}${trimmedCode ? ` (${trimmedCode})` : ''}`,
        });
      } else {
        await createDepartment(payload, actor);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={department ? `Edit Department: ${department.name}` : 'Create New Department'}
      subtitle="Configure organizational business division, management lead, and location"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Parent Company & Status */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Parent Corporate Alignment</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Parent Company *
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Operational Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="active">Active (Accepting Staff & Equipment)</option>
                <option value="inactive">Inactive / Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Department Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Department Name * <span className="text-slate-400 font-normal">(Unique within company)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Software Engineering or Human Resources"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Code (Optional)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENG"
              maxLength={8}
              className="w-full text-xs font-mono uppercase font-bold text-indigo-700 rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Manager & Physical Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Department Manager / Lead
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="e.g. David Chen (Engineering Director)"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Office / Floor Location
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Building A, 3rd Floor - Wing B"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Department Email
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eng-team@acmeglobal.com"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Extension / Phone
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 234-5680"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Department Scope / Description
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Operational scope, team mandate, seating arrangement, or billing center codes..."
            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs cursor-pointer disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : department ? 'Save Changes' : 'Create Department'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
