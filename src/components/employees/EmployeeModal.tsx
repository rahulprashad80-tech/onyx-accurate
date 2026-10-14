import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useData } from '../../context/DataContext';
import { Employee, UserRole, EmployeeStatus } from '../../types';
import { AlertCircle } from 'lucide-react';

interface EmployeeModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ employee, isOpen, onClose }) => {
  const { createEmployee, updateEmployee, companies, departments } = useData();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [status, setStatus] = useState<EmployeeStatus>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (employee) {
      setFullName(employee.fullName);
      setUsername(employee.username || '');
      setEmail(employee.email);
      setPhone(employee.phone || '');
      setJobTitle(employee.jobTitle || '');
      setCompanyId(employee.companyId || '');
      setDepartmentId(employee.departmentId || '');
      setRole(employee.role || 'employee');
      setStatus(employee.status || 'active');
    } else {
      setFullName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setJobTitle('');
      const defaultCoId = companies[0]?.id || '';
      const defaultDept = departments.find((d) => d.companyId === defaultCoId);
      setCompanyId(defaultCoId);
      setDepartmentId(defaultDept ? defaultDept.id : '');
      setRole('employee');
      setStatus('active');
    }
  }, [employee, isOpen, companies, departments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Work Email is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        fullName: fullName.trim(),
        username: username.trim() ? username.trim().toLowerCase() : undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        companyId,
        departmentId,
        role,
        status,
      };

      if (employee) {
        await updateEmployee(employee.id, payload);
      } else {
        await createEmployee(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save employee profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDepts = departments.filter((d) => !companyId || d.companyId === companyId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? 'Edit Employee Profile' : 'Add Employee'}
      subtitle="Corporate directory record and IT access credentials"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username <span className="text-slate-400 font-normal">(Used for Excel Asset Matching)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
              placeholder="e.g. cmmda1 or sjenkins"
              className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah.jenkins@company.internal"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Financial Analyst"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 019-7712"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
            <select
              value={companyId}
              onChange={(e) => {
                const newCompanyId = e.target.value;
                setCompanyId(newCompanyId);
                const currentDept = departments.find((d) => d.id === departmentId);
                const validDepts = departments.filter((d) => d.companyId === newCompanyId);
                const matchingDept = validDepts.find((d) => d.name.toLowerCase() === currentDept?.name.toLowerCase());
                if (matchingDept) {
                  setDepartmentId(matchingDept.id);
                } else {
                  setDepartmentId(validDepts[0]?.id || '');
                }
              }}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
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
              {filteredDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Portal Access Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium"
            >
              <option value="employee">Employee (Self-Service View)</option>
              <option value="technician">IT Technician (Support & Inventory)</option>
              <option value="admin">Admin (Full Control)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
