import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { Location } from '../../types';
import { MapPin, Building2, Layers, AlertCircle } from 'lucide-react';

interface LocationModalProps {
  location: Location | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  location,
  isOpen,
  onClose,
}) => {
  const { userProfile, activeRole } = useAuth();
  const { locations, createLocation, updateLocation } = useData();
  const { showToast } = useNotifications();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (location) {
      setName(location.name || '');
      setCode(location.code || '');
      setBuilding(location.building || '');
      setFloor(location.floor || '');
      setRoom(location.room || '');
      setAddress(location.address || '');
      setDescription(location.description || '');
      setStatus(location.status || 'active');
    } else {
      setName('');
      setCode('');
      setBuilding('HQ Main Tower');
      setFloor('Floor 1');
      setRoom('');
      setAddress('100 Tech Center Blvd');
      setDescription('');
      setStatus('active');
    }
    setErrorMsg('');
  }, [location, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Location name is required.');
      return;
    }

    // Check unique name
    const duplicate = locations.find(
      (l) => l.name.toLowerCase() === cleanName.toLowerCase() && l.id !== location?.id
    );
    if (duplicate) {
      setErrorMsg(`A location named "${cleanName}" already exists.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const actor = {
        name: userProfile?.displayName || 'IT Admin',
        role: activeRole,
      };

      const payload = {
        name: cleanName,
        code: code.trim().toUpperCase() || undefined,
        building: building.trim() || undefined,
        floor: floor.trim() || undefined,
        room: room.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        status,
      };

      if (location) {
        await updateLocation(location.id, payload, actor);
        showToast({
          title: 'Location Updated',
          message: `Physical location "${cleanName}" was successfully updated.`,
          type: 'success',
        });
      } else {
        await createLocation(payload, actor);
        showToast({
          title: 'Location Created',
          message: `Physical location "${cleanName}" has been added to inventory sites.`,
          type: 'success',
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={location ? `Edit Physical Location: ${location.name}` : 'Add Physical Location'}
      subtitle="Register buildings, server rooms, labs, or floor suites where IT hardware is stationed"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Location Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Location Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. IT Storage Lab, Server Room 101, Executive Suite"
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 font-medium focus:border-indigo-600 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Code / Tag
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. LOC-HQ-01"
              className="w-full text-xs font-mono uppercase rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Facility Details: Building & Floor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Building / Campus / Site
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. HQ Main Tower, West Campus, Unit 2"
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Floor / Level
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. Floor 1, Basement B1, Level 4"
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Room / Bay & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Room / Desk / Area Details
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Room 102 (Inventory Rack A-D), Pod 4"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="active">Active (In Use)</option>
              <option value="inactive">Inactive / Closed</option>
            </select>
          </div>
        </div>

        {/* Physical Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Street Address / Campus Site
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 100 Tech Center Blvd, Suite 100, San Jose, CA"
            className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-600 focus:outline-hidden"
          />
        </div>

        {/* Notes / Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description & Access Notes
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Keycard required, climate controlled, emergency contact, or equipment capacity notes..."
            className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-600 focus:outline-hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? 'Saving...' : location ? 'Save Changes' : 'Create Location'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
