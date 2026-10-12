import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Department, Company, Employee, Computer, Ticket } from '../../types';
import { DepartmentModal } from './DepartmentModal';
import { DepartmentDetailModal } from './DepartmentDetailModal';
import { SafeDeleteDepartmentModal } from './SafeDeleteDepartmentModal';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  Archive,
  Eye,
  Building2,
  Users,
  Monitor,
  Ticket as TicketIcon,
  MapPin,
  Mail,
  Phone,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';

interface DepartmentsViewProps {
  onSelectTicket?: (ticket: Ticket) => void;
  onSelectComputer?: (comp: Computer) => void;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  onSelectTicket,
  onSelectComputer,
}) => {
  const { activeRole, userProfile } = useAuth();
  const {
    departments,
    companies,
    employees,
    computers,
    tickets,
    archiveDepartment,
    restoreDepartment,
  } = useData();

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'employees' | 'assets' | 'tickets'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [departmentForDetail, setDepartmentForDetail] = useState<Department | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  const isAdmin = activeRole === 'admin';

  // Overall Statistics
  const stats = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.status === 'active').length;
    const inactive = departments.filter((d) => d.status === 'inactive').length;
    const totalStaff = employees.length;
    const totalAssignedAssets = computers.filter((c) => c.departmentId).length;
    const totalDeptTickets = tickets.filter(
      (t) =>
        t.departmentId &&
        (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
    ).length;

    return { total, active, inactive, totalStaff, totalAssignedAssets, totalDeptTickets };
  }, [departments, employees, computers, tickets]);

  // Filtering & Sorting
  const filteredAndSortedDepartments = useMemo(() => {
    let result = departments.filter((d) => {
      // Company filter
      if (selectedCompanyId !== 'all' && d.companyId !== selectedCompanyId) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const co = companies.find((c) => c.id === d.companyId);
        const matchName = d.name.toLowerCase().includes(q);
        const matchCode = (d.code || '').toLowerCase().includes(q);
        const matchManager = (d.managerName || d.headName || '').toLowerCase().includes(q);
        const matchLocation = (d.location || d.floorLocation || '').toLowerCase().includes(q);
        const matchCompany = (co?.name || '').toLowerCase().includes(q);

        if (!matchName && !matchCode && !matchManager && !matchLocation && !matchCompany) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortBy === 'company') {
        const coA = companies.find((c) => c.id === a.companyId)?.name || '';
        const coB = companies.find((c) => c.id === b.companyId)?.name || '';
        comp = coA.localeCompare(coB);
      } else if (sortBy === 'employees') {
        const cA = employees.filter((e) => e.departmentId === a.id).length;
        const cB = employees.filter((e) => e.departmentId === b.id).length;
        comp = cA - cB;
      } else if (sortBy === 'assets') {
        const cA = computers.filter((c) => c.departmentId === a.id).length;
        const cB = computers.filter((c) => c.departmentId === b.id).length;
        comp = cA - cB;
      } else if (sortBy === 'tickets') {
        const cA = tickets.filter(
          (t) =>
            t.departmentId === a.id &&
            (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
        ).length;
        const cB = tickets.filter(
          (t) =>
            t.departmentId === b.id &&
            (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
        ).length;
        comp = cA - cB;
      }

      return sortOrder === 'asc' ? comp : -comp;
    });

    return result;
  }, [
    departments,
    companies,
    employees,
    computers,
    tickets,
    selectedCompanyId,
    statusFilter,
    searchTerm,
    sortBy,
    sortOrder,
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedDepartments.length / itemsPerPage));
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDepartments.slice(start, start + itemsPerPage);
  }, [filteredAndSortedDepartments, currentPage]);

  const handleToggleArchive = async (dept: Department) => {
    const actor = {
      name: userProfile?.displayName || 'Administrator',
      role: activeRole,
    };
    if (dept.status === 'active') {
      await archiveDepartment(dept.id, actor);
    } else {
      await restoreDepartment(dept.id, actor);
    }
  };

  const openDetails = (dept: Department) => {
    setDepartmentForDetail(dept);
    setDetailModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setDepartmentToEdit(dept);
    setIsFormModalOpen(true);
  };

  const openDelete = (dept: Department) => {
    setDepartmentToDelete(dept);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Departments
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Corporate business units</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Active Units
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{stats.active}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Operating departments</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Archived Units
          </div>
          <div className="text-xl font-bold text-slate-600 mt-0.5">{stats.inactive}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Inactive / Legacy</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Mapped Staff
          </div>
          <div className="text-xl font-bold text-blue-600 mt-0.5">{stats.totalStaff}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Assigned employees</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Assigned Assets
          </div>
          <div className="text-xl font-bold text-violet-600 mt-0.5">{stats.totalAssignedAssets}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Hardware & computers</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Open Tickets
          </div>
          <div className="text-xl font-bold text-amber-600 mt-0.5">{stats.totalDeptTickets}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Unresolved IT issues</div>
        </div>
      </div>

      {/* Filter & Action Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search departments by name, code, manager, company, or floor location..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by Parent Company */}
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 focus:outline-hidden focus:border-indigo-600"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 focus:outline-hidden focus:border-indigo-600"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Archived</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 focus:outline-hidden focus:border-indigo-600"
            >
              <option value="name">Sort: Name</option>
              <option value="company">Sort: Company</option>
              <option value="employees">Sort: Employee Count</option>
              <option value="assets">Sort: Asset Count</option>
              <option value="tickets">Sort: Open Tickets</option>
            </select>

            {/* Sort Order */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            {/* View Toggle */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 cursor-pointer transition-colors ${
                  viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-2 cursor-pointer transition-colors ${
                  viewMode === 'cards' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Cards Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add Department Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setDepartmentToEdit(null);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {filteredAndSortedDepartments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-2xs">
          <EmptyState
            icon={Layers}
            title="No departments found"
            description="No departments match your current filter criteria. Create functional departmental units to map personnel and IT hardware."
            actionLabel={isAdmin ? 'Add Department' : undefined}
            onAction={
              isAdmin
                ? () => {
                    setDepartmentToEdit(null);
                    setIsFormModalOpen(true);
                  }
                : undefined
            }
          />
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-medium">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Manager / Lead</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Staff Count</th>
                  <th className="py-3 px-4 text-center">Assigned Assets</th>
                  <th className="py-3 px-4 text-center">Open Tickets</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDepartments.map((dept) => {
                  const comp = companies.find((c) => c.id === dept.companyId);
                  const empCount = employees.filter((e) => e.departmentId === dept.id).length;
                  const assetCount = computers.filter((c) => c.departmentId === dept.id).length;
                  const openTicketCount = tickets.filter(
                    (t) =>
                      t.departmentId === dept.id &&
                      (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
                  ).length;

                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {dept.code || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDetails(dept)}
                          className="hover:text-indigo-600 transition-colors text-left cursor-pointer"
                        >
                          {dept.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        {comp ? (
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{comp.name}</span>
                            <span className="text-[10px] text-slate-400">({comp.code})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {dept.managerName || dept.headName || (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {dept.location || dept.floorLocation || (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          <Users className="w-3 h-3 text-slate-400" />
                          {empCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          <Monitor className="w-3 h-3 text-slate-400" />
                          {assetCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {openTicketCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded ring-1 ring-amber-200 text-[11px]">
                            <TicketIcon className="w-3 h-3 text-amber-500" />
                            {openTicketCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={dept.status === 'active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {dept.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetails(dept)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(dept)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                                title="Edit Department"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(dept)}
                                className="p-1 rounded text-slate-400 hover:text-amber-600 cursor-pointer"
                                title={dept.status === 'active' ? 'Archive Department' : 'Restore Department'}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDelete(dept)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Safe Remove / Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedDepartments.map((dept) => {
            const comp = companies.find((c) => c.id === dept.companyId);
            const empCount = employees.filter((e) => e.departmentId === dept.id).length;
            const assetCount = computers.filter((c) => c.departmentId === dept.id).length;
            const openTicketCount = tickets.filter(
              (t) =>
                t.departmentId === dept.id &&
                (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
            ).length;

            return (
              <div
                key={dept.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {dept.code && (
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded ring-1 ring-indigo-200">
                            {dept.code}
                          </span>
                        )}
                        <Badge
                          variant={dept.status === 'active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {dept.status}
                        </Badge>
                      </div>
                      <h3
                        onClick={() => openDetails(dept)}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer mt-1"
                      >
                        {dept.name}
                      </h3>
                      {comp && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {comp.name} ({comp.code})
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(dept)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md cursor-pointer hover:bg-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(dept)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md cursor-pointer hover:bg-slate-100"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(dept)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer hover:bg-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 pt-1">
                    {(dept.managerName || dept.headName) && (
                      <div>
                        Manager: <strong className="text-slate-800">{dept.managerName || dept.headName}</strong>
                      </div>
                    )}
                    {(dept.location || dept.floorLocation) && (
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{dept.location || dept.floorLocation}</span>
                      </div>
                    )}
                  </div>

                  {/* 3 Metrics */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-xs font-bold text-slate-800">{empCount}</div>
                      <div className="text-[10px] text-slate-400">Staff</div>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-xs font-bold text-slate-800">{assetCount}</div>
                      <div className="text-[10px] text-slate-400">Assets</div>
                    </div>
                    <div
                      className={`p-1.5 rounded-lg border ${
                        openTicketCount > 0
                          ? 'bg-amber-50/70 border-amber-200 text-amber-700'
                          : 'bg-slate-50 border-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{openTicketCount}</div>
                      <div className="text-[10px] text-slate-400">Tickets</div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => openDetails(dept)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Department Details</span>
                  </button>
                  <span className="text-[10px] text-slate-400">
                    Updated {new Date(dept.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="text-slate-500">
            Showing{' '}
            <strong className="text-slate-800">
              {(currentPage - 1) * itemsPerPage + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-800">
              {Math.min(currentPage * itemsPerPage, filteredAndSortedDepartments.length)}
            </strong>{' '}
            of <strong className="text-slate-800">{filteredAndSortedDepartments.length}</strong>{' '}
            departments
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPage(idx + 1)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  currentPage === idx + 1
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <DepartmentModal
        department={departmentToEdit}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setDepartmentToEdit(null);
        }}
      />

      <DepartmentDetailModal
        department={departmentForDetail}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDepartmentForDetail(null);
        }}
        onEdit={(dept) => {
          setDetailModalOpen(false);
          openEdit(dept);
        }}
        onDeleteRequest={(dept) => {
          setDetailModalOpen(false);
          openDelete(dept);
        }}
        onSelectComputer={onSelectComputer}
        onSelectTicket={onSelectTicket}
      />

      <SafeDeleteDepartmentModal
        department={departmentToDelete}
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDepartmentToDelete(null);
        }}
      />
    </div>
  );
};
