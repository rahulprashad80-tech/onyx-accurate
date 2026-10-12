import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Company, Department, Employee, Computer, Ticket } from '../../types';
import { CompanyModal } from './CompanyModal';
import { CompanyDetailModal } from './CompanyDetailModal';
import { SafeDeleteCompanyModal } from './SafeDeleteCompanyModal';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Archive,
  Eye,
  Globe,
  Mail,
  Phone,
  Users,
  Monitor,
  Ticket as TicketIcon,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCw,
  LayoutGrid,
  List,
} from 'lucide-react';

interface CompaniesViewProps {
  onSelectTicket?: (ticket: Ticket) => void;
  onSelectComputer?: (comp: Computer) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  onSelectTicket,
  onSelectComputer,
}) => {
  const { activeRole, userProfile } = useAuth();
  const {
    companies,
    departments,
    employees,
    computers,
    tickets,
    archiveCompany,
    restoreCompany,
  } = useData();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<
    'name' | 'code' | 'departments' | 'employees' | 'assets' | 'tickets'
  >('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [companyForDetail, setCompanyForDetail] = useState<Company | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const isAdmin = activeRole === 'admin';

  // Overall Statistics
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.status === 'active').length;
    const inactive = companies.filter((c) => c.status === 'inactive').length;
    const totalDepts = departments.length;
    const totalStaff = employees.length;
    const totalHardware = computers.length;

    return { total, active, inactive, totalDepts, totalStaff, totalHardware };
  }, [companies, departments, employees, computers]);

  // Filtering & Sorting
  const filteredAndSortedCompanies = useMemo(() => {
    let result = companies.filter((c) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (c.status !== statusFilter) return false;
      }

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        const matchEmail = (c.contactEmail || '').toLowerCase().includes(q);
        const matchPerson = (c.contactPerson || '').toLowerCase().includes(q);
        const matchCity = (c.city || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);

        if (!matchName && !matchCode && !matchEmail && !matchPerson && !matchCity && !matchPhone) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'code') {
        comparison = a.code.localeCompare(b.code);
      } else if (sortBy === 'departments') {
        const countA = departments.filter((d) => d.companyId === a.id).length;
        const countB = departments.filter((d) => d.companyId === b.id).length;
        comparison = countA - countB;
      } else if (sortBy === 'employees') {
        const countA = employees.filter((e) => e.companyId === a.id).length;
        const countB = employees.filter((e) => e.companyId === b.id).length;
        comparison = countA - countB;
      } else if (sortBy === 'assets') {
        const countA = computers.filter((c) => c.companyId === a.id).length;
        const countB = computers.filter((c) => c.companyId === b.id).length;
        comparison = countA - countB;
      } else if (sortBy === 'tickets') {
        const countA = tickets.filter(
          (t) =>
            t.companyId === a.id &&
            (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
        ).length;
        const countB = tickets.filter(
          (t) =>
            t.companyId === b.id &&
            (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
        ).length;
        comparison = countA - countB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [companies, departments, employees, computers, tickets, statusFilter, searchTerm, sortBy, sortOrder]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedCompanies.length / itemsPerPage));
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedCompanies.slice(start, start + itemsPerPage);
  }, [filteredAndSortedCompanies, currentPage]);

  // Toggle Archive status helper
  const handleToggleArchive = async (company: Company) => {
    const actor = {
      name: userProfile?.displayName || 'Administrator',
      role: activeRole,
    };
    if (company.status === 'active') {
      await archiveCompany(company.id, actor);
    } else {
      await restoreCompany(company.id, actor);
    }
  };

  const openDetails = (comp: Company) => {
    setCompanyForDetail(comp);
    setDetailModalOpen(true);
  };

  const openEdit = (comp: Company) => {
    setCompanyToEdit(comp);
    setIsFormModalOpen(true);
  };

  const openDelete = (comp: Company) => {
    setCompanyToDelete(comp);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Overview Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Entities
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Corporate business units</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Active Status
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{stats.active}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Operational companies</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Archived
          </div>
          <div className="text-xl font-bold text-slate-600 mt-0.5">{stats.inactive}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Inactive entities</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Departments
          </div>
          <div className="text-xl font-bold text-indigo-600 mt-0.5">{stats.totalDepts}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Mapped functional units</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Staff
          </div>
          <div className="text-xl font-bold text-blue-600 mt-0.5">{stats.totalStaff}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Corporate workforce</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            IT Hardware
          </div>
          <div className="text-xl font-bold text-violet-600 mt-0.5">{stats.totalHardware}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Company computers & assets</div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sorting, View Toggle & Add Button */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search companies by name, code, contact person, email, or city..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
          </div>

          {/* Action & Filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
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

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 focus:outline-hidden focus:border-indigo-600"
            >
              <option value="name">Sort by: Name</option>
              <option value="code">Sort by: Code</option>
              <option value="departments">Sort by: Most Departments</option>
              <option value="employees">Sort by: Most Staff</option>
              <option value="assets">Sort by: Most IT Assets</option>
              <option value="tickets">Sort by: Most Open Tickets</option>
            </select>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title={`Sorting: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-2 cursor-pointer transition-colors ${
                  viewMode === 'cards' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
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
            </div>

            {/* Add Company Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setCompanyToEdit(null);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Company</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Card Grid or Table */}
      {filteredAndSortedCompanies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-2xs">
          <EmptyState
            icon={Building2}
            title={companies.length === 0 ? "No companies found" : "No corporate entities found"}
            description={companies.length === 0 ? "There are no company entities registered yet. Click below to create the first organization." : "No companies match the current search filters or criteria. Try modifying your search or add a new entity."}
            actionLabel={isAdmin ? 'Add Company' : undefined}
            onAction={
              isAdmin
                ? () => {
                    setCompanyToEdit(null);
                    setIsFormModalOpen(true);
                  }
                : undefined
            }
          />
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCompanies.map((comp) => {
            const deptsCount = departments.filter((d) => d.companyId === comp.id).length;
            const empCount = employees.filter((e) => e.companyId === comp.id).length;
            const assetCount = computers.filter((c) => c.companyId === comp.id).length;
            const openTicketCount = tickets.filter(
              (t) =>
                t.companyId === comp.id &&
                (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
            ).length;

            return (
              <div
                key={comp.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded ring-1 ring-indigo-200">
                          {comp.code}
                        </span>
                        <Badge
                          variant={comp.status === 'active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {comp.status === 'active' ? 'Active' : 'Archived'}
                        </Badge>
                      </div>
                      <h3
                        onClick={() => openDetails(comp)}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        {comp.name}
                      </h3>
                    </div>

                    {/* Quick actions top-right */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(comp)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md cursor-pointer hover:bg-slate-100"
                          title="Edit Company"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(comp)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md cursor-pointer hover:bg-slate-100"
                          title={comp.status === 'active' ? 'Archive Company' : 'Restore Company'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(comp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer hover:bg-slate-100"
                          title="Safe Remove / Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-slate-600 pt-1">
                    {comp.contactPerson && (
                      <div className="text-[11px] text-slate-500 font-medium">
                        Contact: <span className="text-slate-800">{comp.contactPerson}</span>
                      </div>
                    )}

                    {comp.contactEmail && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{comp.contactEmail}</span>
                      </div>
                    )}

                    {comp.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{comp.phone}</span>
                      </div>
                    )}

                    {(comp.city || comp.country) && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{[comp.city, comp.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* 4 Metrics Strip */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-xs font-bold text-slate-800">{deptsCount}</div>
                      <div className="text-[10px] text-slate-400">Depts</div>
                    </div>
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

                {/* Card Footer Button */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => openDetails(comp)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Entity Details</span>
                  </button>

                  <span className="text-[10px] text-slate-400">
                    Updated {new Date(comp.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-medium">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Email & Phone</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Depts</th>
                  <th className="py-3 px-4 text-center">Staff</th>
                  <th className="py-3 px-4 text-center">Assets</th>
                  <th className="py-3 px-4 text-center">Open Tickets</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCompanies.map((comp) => {
                  const deptsCount = departments.filter((d) => d.companyId === comp.id).length;
                  const empCount = employees.filter((e) => e.companyId === comp.id).length;
                  const assetCount = computers.filter((c) => c.companyId === comp.id).length;
                  const openTicketCount = tickets.filter(
                    (t) =>
                      t.companyId === comp.id &&
                      (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_user')
                  ).length;

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {comp.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDetails(comp)}
                          className="hover:text-indigo-600 transition-colors text-left cursor-pointer"
                        >
                          {comp.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {comp.contactPerson || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div>{comp.contactEmail}</div>
                        <div className="text-[11px] text-slate-400">{comp.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {[comp.city, comp.country].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {deptsCount}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {empCount}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {assetCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {openTicketCount > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded ring-1 ring-amber-200">
                            {openTicketCount}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={comp.status === 'active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {comp.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetails(comp)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(comp)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(comp)}
                                className="p-1 rounded text-slate-400 hover:text-amber-600 cursor-pointer"
                                title={comp.status === 'active' ? 'Archive' : 'Restore'}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDelete(comp)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Safe Delete"
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
              {Math.min(currentPage * itemsPerPage, filteredAndSortedCompanies.length)}
            </strong>{' '}
            of <strong className="text-slate-800">{filteredAndSortedCompanies.length}</strong>{' '}
            companies
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
      <CompanyModal
        company={companyToEdit}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setCompanyToEdit(null);
        }}
      />

      <CompanyDetailModal
        company={companyForDetail}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setCompanyForDetail(null);
        }}
        onEdit={(comp) => {
          setDetailModalOpen(false);
          openEdit(comp);
        }}
        onDeleteRequest={(comp) => {
          setDetailModalOpen(false);
          openDelete(comp);
        }}
        onSelectComputer={onSelectComputer}
        onSelectTicket={onSelectTicket}
      />

      <SafeDeleteCompanyModal
        company={companyToDelete}
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCompanyToDelete(null);
        }}
      />
    </div>
  );
};
