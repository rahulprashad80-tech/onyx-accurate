import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Company } from '../../types';
import { AlertCircle, Building2, Mail, Phone, MapPin, User, Globe, FileText, CheckCircle2 } from 'lucide-react';

interface CompanyModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({ company, isOpen, onClose }) => {
  const { userProfile, activeRole } = useAuth();
  const { companies, createCompany, updateCompany } = useData();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [contactPerson, setContactPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [website, setWebsite] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (company) {
      setName(company.name);
      setCode(company.code);
      setContactEmail(company.contactEmail || '');
      setPhone(company.phone || '');
      setAddress(company.address || '');
      setCity(company.city || '');
      setCountry(company.country || 'United States');
      setContactPerson(company.contactPerson || '');
      setNotes(company.notes || '');
      setStatus(company.status === 'inactive' ? 'inactive' : 'active');
      setWebsite(company.website || '');
    } else {
      setName('');
      setCode('');
      setContactEmail('');
      setPhone('');
      setAddress('');
      setCity('');
      setCountry('United States');
      setContactPerson('');
      setNotes('');
      setStatus('active');
      setWebsite('');
    }
    setErrorMsg('');
  }, [company, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName) {
      setErrorMsg('Company Name is required.');
      return;
    }
    if (!trimmedCode) {
      setErrorMsg('Company Code is required.');
      return;
    }

    // Uniqueness validation
    const nameConflict = companies.find(
      (c) => c.id !== company?.id && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameConflict) {
      setErrorMsg(`Company name "${trimmedName}" is already in use by another company.`);
      return;
    }

    const codeConflict = companies.find(
      (c) => c.id !== company?.id && c.code.trim().toUpperCase() === trimmedCode
    );
    if (codeConflict) {
      setErrorMsg(`Company code "${trimmedCode}" is already in use. Please choose a unique code.`);
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
        code: trimmedCode,
        contactEmail: contactEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        contactPerson: contactPerson.trim(),
        notes: notes.trim(),
        status,
        website: website.trim(),
      };

      if (company) {
        await updateCompany(company.id, payload, {
          type: 'updated',
          actorName: actor.name,
          actorRole: actor.role,
          message: `Updated company details for ${trimmedName} (${trimmedCode})`,
        });
      } else {
        await createCompany(payload, actor);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save company entity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? `Edit Company: ${company.name}` : 'Add New Corporate Entity'}
      subtitle="Define organizational subsidiaries, legal entities, contact details, and status"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Basic Entity Info */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Corporate Identification</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Company Name * <span className="text-slate-400 font-normal">(Must be unique)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Global Industries"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Company Code * <span className="text-slate-400 font-normal">(Unique)</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ACME"
                maxLength={10}
                className="w-full text-xs font-mono uppercase font-bold text-indigo-700 rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Key Contact Person *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Eleanor Vance (VP Operations)"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>
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
                <option value="active">Active (Operational & Accepting Allocations)</option>
                <option value="inactive">Inactive / Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact & Communication */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Mail className="w-4 h-4 text-indigo-600" />
            <span>Contact & Communication</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Company Email *
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@acmeglobal.com"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Website URL (Optional)
            </label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme-global.internal"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Location & Address */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Headquarters & Location</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Physical Street Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="100 Innovation Way, Suite 400"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Jose"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Country *
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United States"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
            </div>
          </div>
        </div>

        {/* Administrative Notes */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Administrative Notes / Description
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Operational scope, billing entities, lease contracts, or IT governance notes..."
            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        {/* Action Buttons */}
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
            <span>{isSubmitting ? 'Saving...' : company ? 'Save Changes' : 'Create Company'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

