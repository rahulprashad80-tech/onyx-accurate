import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Ticket, Computer, Company, Department, Employee } from '../../types';
import {
  Search,
  Ticket as TicketIcon,
  Monitor,
  Building,
  Layers,
  Users,
  MapPin,
  ArrowRight,
  X,
  CornerDownLeft,
} from 'lucide-react';
import { NavigationTab } from '../layout/Sidebar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicket: (ticket: Ticket) => void;
  onSelectComputer: (computer: Computer) => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTicket,
  onSelectComputer,
  onNavigateTab,
}) => {
  const { tickets, computers, companies, departments, employees, locations } = useData();
  const { activeRole, userProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'tickets' | 'computers' | 'employees' | 'companies' | 'departments' | 'locations'
  >('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setActiveFilter('all');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isEmployee = activeRole === 'employee';

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        tickets: [],
        computers: [],
        employees: [],
        companies: [],
        departments: [],
        locations: [],
        totalCount: 0,
      };
    }

    // Role-filter tickets for employees
    const allowedTickets = isEmployee
      ? tickets.filter(
          (t) =>
            t.requesterEmail === userProfile?.email ||
            t.requesterId === userProfile?.id
        )
      : tickets;

    const matchedTickets = allowedTickets.filter((t) =>
      t.ticketNumber.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.requesterName.toLowerCase().includes(q) ||
      (t.assignedTechName && t.assignedTechName.toLowerCase().includes(q)) ||
      (t.assetTag && t.assetTag.toLowerCase().includes(q))
    );

    const matchedComputers = (isEmployee
      ? computers.filter(
          (c) =>
            (userProfile?.displayName && c.assignedEmployeeName === userProfile.displayName)
        )
      : computers
    ).filter((c) =>
      c.assetTag.toLowerCase().includes(q) ||
      c.serialNumber.toLowerCase().includes(q) ||
      (c.hostname && c.hostname.toLowerCase().includes(q)) ||
      c.brand.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      (c.assignedEmployeeName && c.assignedEmployeeName.toLowerCase().includes(q)) ||
      (c.assetUserName && c.assetUserName.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q))
    );

    const matchedEmployees = isEmployee
      ? []
      : employees.filter((e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q)
        );

    const matchedCompanies = isEmployee
      ? []
      : companies.filter((c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q))
        );

    const matchedDepartments = isEmployee
      ? []
      : departments.filter((d) =>
          d.name.toLowerCase().includes(q) ||
          (d.code && d.code.toLowerCase().includes(q)) ||
          (d.managerName && d.managerName.toLowerCase().includes(q)) ||
          (d.headName && d.headName.toLowerCase().includes(q))
        );

    const matchedLocations = isEmployee
      ? []
      : locations.filter((loc) =>
          loc.name.toLowerCase().includes(q) ||
          (loc.code && loc.code.toLowerCase().includes(q)) ||
          (loc.building && loc.building.toLowerCase().includes(q)) ||
          (loc.floor && loc.floor.toLowerCase().includes(q)) ||
          (loc.room && loc.room.toLowerCase().includes(q)) ||
          (loc.address && loc.address.toLowerCase().includes(q)) ||
          (loc.description && loc.description.toLowerCase().includes(q))
        );

    const totalCount =
      matchedTickets.length +
      matchedComputers.length +
      matchedEmployees.length +
      matchedCompanies.length +
      matchedDepartments.length +
      matchedLocations.length;

    return {
      tickets: matchedTickets,
      computers: matchedComputers,
      employees: matchedEmployees,
      companies: matchedCompanies,
      departments: matchedDepartments,
      locations: matchedLocations,
      totalCount,
    };
  }, [query, tickets, computers, companies, departments, employees, locations, isEmployee, userProfile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-200 px-4 py-3 bg-white">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets, assets, employees, companies, departments, locations..."
            className="w-full text-sm placeholder-slate-400 text-slate-900 focus:outline-hidden bg-transparent"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          {[
            { id: 'all', label: 'All Results' },
            { id: 'tickets', label: `Tickets (${results.tickets.length})` },
            { id: 'computers', label: `Assets (${results.computers.length})` },
            ...(!isEmployee
              ? [
                  { id: 'locations', label: `Locations (${results.locations.length})` },
                  { id: 'employees', label: `Employees (${results.employees.length})` },
                  { id: 'companies', label: `Companies (${results.companies.length})` },
                  { id: 'departments', label: `Departments (${results.departments.length})` },
                ]
              : []),
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveFilter(item.id as any)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!query.trim() ? (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">Global IT Directory Search</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Type an asset tag, ticket number, serial code, staff name, or company.
              </p>
            </div>
          ) : results.totalCount === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-xs font-semibold text-slate-700">No results found for "{query}"</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try searching with a different keyword, tag, or serial number.
              </p>
            </div>
          ) : (
            <>
              {/* Tickets */}
              {(activeFilter === 'all' || activeFilter === 'tickets') &&
                results.tickets.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
                      <TicketIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Support Tickets ({results.tickets.length})
                    </div>
                    <div className="space-y-1">
                      {results.tickets.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            onSelectTicket(t);
                            onClose();
                          }}
                          className="p-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-600">
                                {t.ticketNumber}
                              </span>
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {t.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              Requester: {t.requesterName} • Priority: {t.priority} • Status: {t.status}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Computers */}
              {(activeFilter === 'all' || activeFilter === 'computers') &&
                results.computers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
                      <Monitor className="w-3.5 h-3.5 text-cyan-600" />
                      Hardware Assets ({results.computers.length})
                    </div>
                    <div className="space-y-1">
                      {results.computers.slice(0, 5).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            onSelectComputer(c);
                            onClose();
                          }}
                          className="p-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">
                                {c.assetTag}
                              </span>
                              <span className="text-xs font-semibold text-slate-900">
                                {c.brand} {c.model}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              S/N: {c.serialNumber} • Status: {c.status} • Assigned: {c.assignedEmployeeName || 'Unassigned'}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Employees */}
              {(activeFilter === 'all' || activeFilter === 'employees') &&
                results.employees.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      Employees ({results.employees.length})
                    </div>
                    <div className="space-y-1">
                      {results.employees.slice(0, 5).map((e) => (
                        <div
                          key={e.id}
                          onClick={() => {
                            onNavigateTab('employees');
                            onClose();
                          }}
                          className="p-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="text-xs font-semibold text-slate-900">
                              {e.fullName}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {e.jobTitle} • {e.email} • Role: {e.role}
                            </p>
                          </div>
                          <span className="text-[10px] text-indigo-600 font-medium">Directory →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Companies */}
              {(activeFilter === 'all' || activeFilter === 'companies') &&
                results.companies.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
                      <Building className="w-3.5 h-3.5 text-indigo-600" />
                      Companies ({results.companies.length})
                    </div>
                    <div className="space-y-1">
                      {results.companies.slice(0, 5).map((co) => (
                        <div
                          key={co.id}
                          onClick={() => {
                            onNavigateTab('companies');
                            onClose();
                          }}
                          className="p-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {co.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-900">
                                {co.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {co.city ? `${co.city}, ` : ''}{co.country || ''} • Contact: {co.contactPerson || 'N/A'}
                            </p>
                          </div>
                          <span className="text-[10px] text-indigo-600 font-medium">View →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Departments */}
              {(activeFilter === 'all' || activeFilter === 'departments') &&
                results.departments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      Departments ({results.departments.length})
                    </div>
                    <div className="space-y-1">
                      {results.departments.slice(0, 5).map((d) => (
                        <div
                          key={d.id}
                          onClick={() => {
                            onNavigateTab('departments');
                            onClose();
                          }}
                          className="p-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="text-xs font-semibold text-slate-900">
                              {d.name} {d.code ? `(${d.code})` : ''}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              Manager: {d.managerName || d.headName || 'N/A'} • Location: {d.location || 'HQ'}
                            </p>
                          </div>
                          <span className="text-[10px] text-indigo-600 font-medium">View →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Locations */}
              {(activeFilter === 'all' || activeFilter === 'locations') &&
                results.locations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Physical Locations ({results.locations.length})
                    </div>
                    <div className="space-y-1">
                      {results.locations.slice(0, 5).map((loc) => (
                        <div
                          key={loc.id}
                          onClick={() => {
                            onNavigateTab('locations');
                            onClose();
                          }}
                          className="p-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{loc.name}</span>
                              {loc.code && (
                                <span className="text-[10px] bg-slate-200/80 text-slate-700 font-mono px-1.5 py-0.2 rounded">
                                  {loc.code}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              Building: {loc.building || 'HQ'}{loc.floor ? ` • Floor ${loc.floor}` : ''}{loc.room ? ` • Room ${loc.room}` : ''}{loc.address ? ` • ${loc.address}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] text-indigo-600 font-medium">View →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">
                ↵
              </kbd>{' '}
              Select
            </span>
          </div>
          <span>Total matches: {results.totalCount}</span>
        </div>
      </div>
    </div>
  );
};
