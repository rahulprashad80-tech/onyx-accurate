import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { Location, Computer } from '../../types';
import { LocationModal } from './LocationModal';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Layers,
  Monitor,
  LayoutGrid,
  List,
  AlertTriangle,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface LocationsViewProps {
  onSelectComputer?: (computer: Computer) => void;
}

export const LocationsView: React.FC<LocationsViewProps> = ({ onSelectComputer }) => {
  const { activeRole, userProfile } = useAuth();
  const { locations, computers, deleteLocation } = useData();
  const { showToast } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Confirm delete state
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View assets in location modal state
  const [locationForAssetsModal, setLocationForAssetsModal] = useState<Location | null>(null);

  const isAdmin = activeRole === 'admin';

  // Distinct buildings for filter
  const uniqueBuildings = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((l) => {
      if (l.building && l.building.trim()) {
        set.add(l.building.trim());
      }
    });
    return Array.from(set).sort();
  }, [locations]);

  // Asset count map per location (matches by location name or locationId)
  const locationAssetMap = useMemo(() => {
    const map = new Map<string, Computer[]>();
    for (const comp of computers) {
      if (!comp.location && !comp.locationId) continue;
      for (const loc of locations) {
        const matchesName = comp.location && comp.location.trim().toLowerCase() === loc.name.trim().toLowerCase();
        const matchesId = comp.locationId && comp.locationId === loc.id;
        if (matchesName || matchesId) {
          const existing = map.get(loc.id) || [];
          existing.push(comp);
          map.set(loc.id, existing);
        }
      }
    }
    return map;
  }, [computers, locations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (statusFilter !== 'all' && loc.status !== statusFilter) return false;
      if (buildingFilter !== 'all' && loc.building !== buildingFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = loc.name.toLowerCase().includes(q);
        const matchCode = (loc.code || '').toLowerCase().includes(q);
        const matchBuilding = (loc.building || '').toLowerCase().includes(q);
        const matchFloor = (loc.floor || '').toLowerCase().includes(q);
        const matchRoom = (loc.room || '').toLowerCase().includes(q);
        const matchDesc = (loc.description || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBuilding && !matchFloor && !matchRoom && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }, [locations, statusFilter, buildingFilter, searchTerm]);

  // Top stats
  const stats = useMemo(() => {
    const total = locations.length;
    const active = locations.filter((l) => l.status === 'active').length;
    const totalStationedAssets = computers.filter((c) => c.location && c.location.trim().length > 0).length;
    return {
      total,
      active,
      buildingsCount: uniqueBuildings.length,
      totalStationedAssets,
    };
  }, [locations, uniqueBuildings, computers]);

  const confirmDelete = async () => {
    if (!locationToDelete) return;
    try {
      setIsDeleting(true);
      const actor = {
        name: userProfile?.displayName || 'IT Admin',
        role: activeRole,
      };
      await deleteLocation(locationToDelete.id, actor);
      showToast({
        title: 'Location Removed',
        message: `Physical location "${locationToDelete.name}" was removed.`,
        type: 'success',
      });
      setLocationToDelete(null);
    } catch (err: any) {
      showToast({
        title: 'Delete Failed',
        message: err.message || 'Could not delete location.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Locations</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">Managed facility sites & rooms</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Sites</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          <p className="text-xs text-slate-500 mt-1">Currently in operational use</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Buildings & Campuses</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.buildingsCount}</p>
          <p className="text-xs text-slate-500 mt-1">Distinct enterprise facilities</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Stationed Assets</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.totalStationedAssets}</p>
          <p className="text-xs text-slate-500 mt-1">Hardware mapped to locations</p>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Action Button */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search locations by name, code, building, or room..."
              className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="all">All Buildings</option>
              {uniqueBuildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Admin Add Location button */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setSelectedLocation(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location</span>
          </button>
        )}
      </div>

      {/* Locations Content */}
      {filteredLocations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No Physical Locations Found"
          description={
            searchTerm || buildingFilter !== 'all' || statusFilter !== 'all'
              ? 'No physical locations match your active search and filter criteria.'
              : 'Register corporate facilities, server rooms, labs, and office floors to track physical asset whereabouts.'
          }
          actionLabel={isAdmin ? 'Add First Location' : undefined}
          onAction={
            isAdmin
              ? () => {
                  setSelectedLocation(null);
                  setIsModalOpen(true);
                }
              : undefined
          }
        />
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLocations.map((loc) => {
            const locAssets = locationAssetMap.get(loc.id) || [];
            return (
              <div
                key={loc.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Header: Name, Code & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate" title={loc.name}>
                          {loc.name}
                        </h3>
                        {loc.code && (
                          <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {loc.code}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={loc.status === 'active' ? 'success' : 'neutral'}>
                      {loc.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Building & Floor Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 my-3 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">{loc.building || 'General Building'}</span>
                      {loc.floor && (
                        <span className="text-slate-400">• {loc.floor}</span>
                      )}
                    </div>
                    {loc.room && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{loc.room}</span>
                      </div>
                    )}
                    {loc.address && (
                      <p className="text-[11px] text-slate-400 truncate">{loc.address}</p>
                    )}
                  </div>

                  {loc.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 italic">
                      "{loc.description}"
                    </p>
                  )}
                </div>

                {/* Footer: Assets Stationed & Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setLocationForAssetsModal(loc)}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>{locAssets.length} Assets Assigned</span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLocation(loc);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Location"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationToDelete(loc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Location Name</th>
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Building & Floor</th>
                  <th className="py-3 px-4 font-semibold">Room / Area</th>
                  <th className="py-3 px-4 font-semibold">Assets Stationed</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLocations.map((loc) => {
                  const locAssets = locationAssetMap.get(loc.id) || [];
                  return (
                    <tr key={loc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-semibold">{loc.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 uppercase">
                        {loc.code || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span>{loc.building || 'General'}</span>
                        {loc.floor && <span className="text-slate-400"> • {loc.floor}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {loc.room || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setLocationForAssetsModal(loc)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium cursor-pointer transition-colors"
                        >
                          <Monitor className="w-3 h-3" />
                          <span>{locAssets.length}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={loc.status === 'active' ? 'success' : 'neutral'}>
                          {loc.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLocation(loc);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Location"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setLocationToDelete(loc)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove Location"
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
        </div>
      )}

      {/* Add / Edit Location Modal */}
      {isModalOpen && (
        <LocationModal
          location={selectedLocation}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedLocation(null);
          }}
        />
      )}

      {/* Confirm Delete Dialog */}
      {locationToDelete && (
        <ConfirmDialog
          isOpen={Boolean(locationToDelete)}
          onClose={() => setLocationToDelete(null)}
          onConfirm={confirmDelete}
          title="Remove Physical Location"
          message={
            (locationAssetMap.get(locationToDelete.id) || []).length > 0
              ? `Warning: There are currently ${(locationAssetMap.get(locationToDelete.id) || []).length} computer asset(s) stationed at "${locationToDelete.name}". Are you sure you want to remove this location?`
              : `Are you sure you want to remove physical location "${locationToDelete.name}"? This action cannot be undone.`
          }
          confirmLabel={isDeleting ? 'Removing...' : 'Remove Location'}
          isDestructive={true}
          isLoading={isDeleting}
        />
      )}

      {/* View Assets Stationed at Location Modal */}
      {locationForAssetsModal && (
        <Modal
          isOpen={Boolean(locationForAssetsModal)}
          onClose={() => setLocationForAssetsModal(null)}
          title={`Assets at ${locationForAssetsModal.name}`}
          subtitle={`${locationForAssetsModal.building || 'Building'} ${locationForAssetsModal.floor ? `• ${locationForAssetsModal.floor}` : ''} ${locationForAssetsModal.room ? `• ${locationForAssetsModal.room}` : ''}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {(() => {
              const assets = locationAssetMap.get(locationForAssetsModal.id) || [];
              if (assets.length === 0) {
                return (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Monitor className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No computer assets are currently registered at this physical location.</p>
                  </div>
                );
              }
              return (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {asset.assetTag}
                            </span>
                            <Badge variant={asset.status === 'assigned' ? 'primary' : asset.status === 'available' ? 'success' : 'neutral'}>
                              {asset.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 truncate">
                            {asset.brand} {asset.model} • S/N: {asset.serialNumber || 'N/A'}
                          </p>
                          {(asset.assetUserName || asset.assignedEmployeeName) && (
                            <p className="text-[11px] text-slate-500">
                              User: <span className="font-medium text-slate-700">{asset.assetUserName || asset.assignedEmployeeName}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {onSelectComputer && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocationForAssetsModal(null);
                            onSelectComputer(asset);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 text-xs font-medium text-slate-700 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setLocationForAssetsModal(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
