import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
  Ticket, 
  TicketStatus, 
  TicketPriority, 
  TicketCategory, 
  Computer 
} from '../../types';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { TicketDetailModal } from './TicketDetailModal';
import { CreateTicketModal } from './CreateTicketModal';
import {
  Search,
  Plus,
  Ticket as TicketIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  SlidersHorizontal,
  Users,
  AlertCircle,
  XCircle,
  BarChart3,
  ListFilter,
  Check,
  Calendar,
  Building,
  Layers,
  Flame,
  UserCheck,
  ArrowRight,
} from 'lucide-react';

interface TicketsViewProps {
  onSelectComputer?: (computer: Computer) => void;
  openCreateModalDirectly?: boolean;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ onSelectComputer }) => {
  const { activeRole, userProfile } = useAuth();
  const { tickets, employees, companies, departments } = useData();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [requesterFilter, setRequesterFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [onlyOverdueFilter, setOnlyOverdueFilter] = useState<boolean>(false);

  // View mode: 'all' or 'dashboard'
  const [showDashboardOverview, setShowDashboardOverview] = useState<boolean>(true);

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const isEmployee = activeRole === 'employee';
  const canManage = activeRole === 'admin' || activeRole === 'technician';

  // Base tickets based on RBAC
  const userVisibleTickets = useMemo(() => {
    if (isEmployee) {
      return tickets.filter(
        (t) =>
          t.requesterEmail === userProfile?.email ||
          t.requesterId === userProfile?.id ||
          (userProfile?.displayName && t.requesterName.toLowerCase() === userProfile.displayName.toLowerCase())
      );
    }
    return tickets;
  }, [tickets, isEmployee, userProfile]);

  // Technicians list
  const techList = useMemo(() => {
    return employees.filter((e) => e.role === 'admin' || e.role === 'technician');
  }, [employees]);

  // Requesters list
  const requesterList = useMemo(() => {
    const uniqueEmails = Array.from(new Set(tickets.map((t) => t.requesterEmail)));
    return uniqueEmails.map((email) => {
      const sample = tickets.find((t) => t.requesterEmail === email);
      return { email, name: sample?.requesterName || email };
    });
  }, [tickets]);

  // Helper for overdue check
  const isTicketOverdue = (t: Ticket) => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    if (t.dueDate) {
      return new Date(t.dueDate).getTime() < Date.now();
    }
    return Date.now() - new Date(t.createdAt).getTime() > 48 * 3600 * 1000;
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    const now = Date.now();

    return userVisibleTickets.filter((t) => {
      // Overdue quick filter
      if (onlyOverdueFilter && !isTicketOverdue(t)) return false;

      // Status
      if (statusFilter !== 'all') {
        const normalizedStatus = t.status === 'pending_user' ? 'waiting_user' : t.status;
        if (normalizedStatus !== statusFilter) return false;
      }

      // Priority
      if (priorityFilter !== 'all') {
        const normalizedPriority = t.priority === 'urgent' ? 'critical' : t.priority;
        if (normalizedPriority !== priorityFilter) return false;
      }

      // Category
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Technician
      if (techFilter !== 'all') {
        if (techFilter === 'unassigned') {
          if (t.assignedTechId || t.assignedTechName) return false;
        } else {
          if (t.assignedTechId !== techFilter && t.assignedTechName !== techFilter) return false;
        }
      }

      // Requester
      if (requesterFilter !== 'all' && t.requesterEmail !== requesterFilter) return false;

      // Company
      if (companyFilter !== 'all' && t.companyId !== companyFilter) return false;

      // Department
      if (departmentFilter !== 'all') {
        const selectedDept = departments.find((d) => d.id === departmentFilter);
        const deptName = selectedDept ? selectedDept.name.toLowerCase() : departmentFilter.toLowerCase();
        const ticketDept = departments.find((d) => d.id === t.departmentId);
        if (t.departmentId !== departmentFilter && (!ticketDept || ticketDept.name.toLowerCase() !== deptName)) {
          return false;
        }
      }

      // Date Range
      if (dateRangeFilter !== 'all') {
        const ticketTime = new Date(t.createdAt).getTime();
        const oneDay = 24 * 3600 * 1000;
        if (dateRangeFilter === 'today' && now - ticketTime > oneDay) return false;
        if (dateRangeFilter === 'week' && now - ticketTime > 7 * oneDay) return false;
        if (dateRangeFilter === 'month' && now - ticketTime > 30 * oneDay) return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNumber = t.ticketNumber.toLowerCase().includes(query);
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchDesc = t.description.toLowerCase().includes(query);
        const matchRequester = t.requesterName.toLowerCase().includes(query) || t.requesterEmail.toLowerCase().includes(query);
        const matchTech = (t.assignedTechName || '').toLowerCase().includes(query);
        const matchAsset = (t.assetTag || '').toLowerCase().includes(query);
        if (!matchNumber && !matchTitle && !matchDesc && !matchRequester && !matchTech && !matchAsset) {
          return false;
        }
      }

      return true;
    });
  }, [
    userVisibleTickets, 
    statusFilter, 
    priorityFilter, 
    categoryFilter, 
    techFilter, 
    requesterFilter, 
    companyFilter, 
    departmentFilter, 
    dateRangeFilter, 
    onlyOverdueFilter, 
    searchTerm
  ]);

  // Dashboard Metrics
  const openCount = userVisibleTickets.filter((t) => t.status === 'open').length;
  const inProgressCount = userVisibleTickets.filter((t) => t.status === 'in_progress').length;
  const waitingUserCount = userVisibleTickets.filter((t) => t.status === 'waiting_user' || t.status === 'pending_user').length;
  const resolvedCount = userVisibleTickets.filter((t) => t.status === 'resolved').length;
  const closedCount = userVisibleTickets.filter((t) => t.status === 'closed').length;

  const criticalAndHighCount = userVisibleTickets.filter(
    (t) => (t.priority === 'critical' || t.priority === 'urgent' || t.priority === 'high') && t.status !== 'resolved' && t.status !== 'closed'
  ).length;

  const overdueCount = userVisibleTickets.filter(isTicketOverdue).length;

  // Technician workload statistics
  const techWorkload = useMemo(() => {
    return techList.map((tech) => {
      const activeTickets = tickets.filter(
        (t) => (t.assignedTechId === tech.id || t.assignedTechName === tech.fullName) &&
               t.status !== 'resolved' && t.status !== 'closed'
      );
      const criticalCount = activeTickets.filter(
        (t) => t.priority === 'critical' || t.priority === 'urgent' || t.priority === 'high'
      ).length;
      return {
        tech,
        activeCount: activeTickets.length,
        criticalCount,
      };
    });
  }, [techList, tickets]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setTechFilter('all');
    setRequesterFilter('all');
    setCompanyFilter('all');
    setDepartmentFilter('all');
    setDateRangeFilter('all');
    setOnlyOverdueFilter(false);
  };

  const hasActiveFilters = 
    searchTerm !== '' || 
    statusFilter !== 'all' || 
    priorityFilter !== 'all' || 
    categoryFilter !== 'all' || 
    techFilter !== 'all' || 
    requesterFilter !== 'all' || 
    companyFilter !== 'all' || 
    departmentFilter !== 'all' || 
    dateRangeFilter !== 'all' || 
    onlyOverdueFilter;

  return (
    <div className="space-y-5">
      {/* Employee Mode Banner */}
      {isEmployee && (
        <div className="p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
          <span>
            Logged in as <strong>Employee</strong>. You can submit new tickets and track status updates for your reported issues.
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Self-Service View
          </span>
        </div>
      )}

      {/* Ticket Dashboard Metric Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Helpdesk Ticket Dashboard
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowDashboardOverview(!showDashboardOverview)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            {showDashboardOverview ? 'Collapse Analytics' : 'Expand Analytics'}
          </button>
        </div>

        {showDashboardOverview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 animate-in fade-in duration-150">
            {/* Card 1: Open & In-Progress */}
            <div 
              onClick={() => {
                setStatusFilter('open');
                setOnlyOverdueFilter(false);
              }}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Open Tickets</span>
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <TicketIcon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{openCount + inProgressCount}</span>
                <span className="text-xs text-slate-500">active</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {openCount} unassigned / {inProgressCount} in progress
              </p>
            </div>

            {/* Card 2: Critical & High Priority */}
            <div 
              onClick={() => {
                setPriorityFilter('critical');
                setOnlyOverdueFilter(false);
              }}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-rose-700">Critical & High</span>
                <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-700">{criticalAndHighCount}</span>
                <span className="text-xs text-rose-600 font-medium">high urgency</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Requires rapid response under SLA
              </p>
            </div>

            {/* Card 3: Overdue Tickets */}
            <div 
              onClick={() => {
                setOnlyOverdueFilter(!onlyOverdueFilter);
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs group ${
                onlyOverdueFilter ? 'border-rose-600 bg-rose-50/50' : 'bg-white border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-rose-800">Overdue SLA</span>
                <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-800">{overdueCount}</span>
                <span className="text-xs text-rose-700 font-medium">breached</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {onlyOverdueFilter ? 'Showing overdue tickets only' : 'Click to filter overdue tickets'}
              </p>
            </div>

            {/* Card 4: Resolved & Closed */}
            <div 
              onClick={() => {
                setStatusFilter('resolved');
                setOnlyOverdueFilter(false);
              }}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-300 transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Resolved / Closed</span>
                <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{resolvedCount + closedCount}</span>
                <span className="text-xs text-purple-700 font-medium">completed</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {waitingUserCount} pending confirmation
              </p>
            </div>
          </div>
        )}

        {/* Technician Workload Breakdown (Only for Technicians & Admins) */}
        {!isEmployee && showDashboardOverview && (
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Technician Assignment Workload
              </span>
              <span className="text-[11px] text-slate-400">
                Click any technician below to filter their assigned queue
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {techWorkload.map(({ tech, activeCount, criticalCount }) => {
                const isSelected = techFilter === tech.id || techFilter === tech.fullName;
                return (
                  <div
                    key={tech.id}
                    onClick={() => {
                      setTechFilter(isSelected ? 'all' : tech.id);
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {tech.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-slate-900 truncate">{tech.fullName}</p>
                          <p className="text-[10px] text-slate-400">{tech.jobTitle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xs text-slate-900">{activeCount}</span>
                        <span className="text-[10px] text-slate-400 block">tickets</span>
                      </div>
                    </div>

                    {criticalCount > 0 && (
                      <div className="mt-2 text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                        {criticalCount} urgent priority
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Filter & Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Row 1: Search + Quick CTAs */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID (TCK-1001), subject, description, requester, or tech..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium rounded-lg transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </button>
          </div>
        </div>

        {/* Row 2: Comprehensive Multi-Field Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_user">Waiting for User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700"
          >
            <option value="all">All Categories</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="network">Network</option>
            <option value="access">Access</option>
            <option value="email">Email</option>
            <option value="other">Other</option>
          </select>

          {/* Technician */}
          {!isEmployee && (
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700"
            >
              <option value="all">All Technicians</option>
              <option value="unassigned">Unassigned Only</option>
              {techList.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.fullName}
                </option>
              ))}
            </select>
          )}

          {/* Requester */}
          {!isEmployee && (
            <select
              value={requesterFilter}
              onChange={(e) => setRequesterFilter(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700"
            >
              <option value="all">All Requesters</option>
              {requesterList.map((req) => (
                <option key={req.email} value={req.email}>
                  {req.name}
                </option>
              ))}
            </select>
          )}

          {/* Company */}
          <select
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setDepartmentFilter('all');
            }}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Department */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700"
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

          {/* Date Range */}
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Filters:</span>
          
          <button
            type="button"
            onClick={() => setOnlyOverdueFilter(!onlyOverdueFilter)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              onlyOverdueFilter
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            ⚠️ Overdue SLA ({overdueCount})
          </button>

          <button
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === 'critical' ? 'all' : 'critical')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              priorityFilter === 'critical'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🔥 Critical
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                const currentEmp = employees.find((e) => e.email === userProfile?.email);
                const myId = currentEmp ? currentEmp.id : userProfile?.id;
                setTechFilter(techFilter === myId ? 'all' : (myId || 'all'));
              }}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              👤 Assigned to Me
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => setTechFilter(techFilter === 'unassigned' ? 'all' : 'unassigned')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                techFilter === 'unassigned'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ⏳ Unassigned
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredTickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title="No support tickets found"
            description={
              hasActiveFilters
                ? 'No tickets match the selected combination of filters. Try clearing filters to see more.'
                : 'There are currently no tickets logged in this view.'
            }
            actionLabel="Submit a Support Ticket"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject & Affected Asset</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  {!isEmployee && <th className="py-3 px-4">Requester</th>}
                  {!isEmployee && <th className="py-3 px-4">Technician</th>}
                  <th className="py-3 px-4">SLA / Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((t) => {
                  const overdue = isTicketOverdue(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        overdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{t.ticketNumber}</span>
                          {overdue && (
                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" title="Overdue SLA" />
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <p className="font-semibold text-slate-900 truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {t.assetTag && (
                            <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-mono border border-indigo-100">
                              Asset: {t.assetTag}
                            </span>
                          )}
                          {t.attachments && t.attachments.length > 0 && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              📎 {t.attachments.length} files
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 capitalize whitespace-nowrap">
                        {t.category}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="priority" value={t.priority} size="sm" />
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="ticketStatus" value={t.status} size="sm" />
                      </td>

                      {!isEmployee && (
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                          <p className="font-medium text-slate-900">{t.requesterName}</p>
                          <p className="text-[10px] text-slate-400">{t.requesterEmail}</p>
                        </td>
                      )}

                      {!isEmployee && (
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {t.assignedTechName ? (
                            <span className="font-medium text-slate-800">{t.assignedTechName}</span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                      )}

                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {overdue ? (
                          <span className="text-rose-600 font-semibold block text-[11px]">
                            Overdue SLA
                          </span>
                        ) : (
                          <span className="text-slate-400 block text-[11px]">
                            {new Date(t.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                        {t.resolvedAt && (
                          <span className="text-[10px] text-emerald-600 block">
                            Resolved {new Date(t.resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(t);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onSelectComputer={onSelectComputer}
        />
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
};
