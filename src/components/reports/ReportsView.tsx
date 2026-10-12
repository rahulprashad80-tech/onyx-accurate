import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Ticket, Computer, Employee, Company, Department } from '../../types';
import {
  BarChart3,
  Download,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Laptop,
  HardDrive,
  FileSpreadsheet,
  Users,
  Building,
  Layers,
  Calendar,
  AlertCircle,
  HelpCircle,
  History,
  TrendingUp,
  Cpu,
  Search,
  Check,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { tickets, computers, employees, companies, departments, organizationAuditLog } = useData();
  const { activeRole } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'helpdesk' | 'inventory' | 'employees' | 'audit' | 'exports'>('helpdesk');
  const [auditSearch, setAuditSearch] = useState('');
  const [deviceEmployeeSearch, setDeviceEmployeeSearch] = useState('');

  const now = new Date();

  // ==========================================
  // HELPDESK & SLA METRICS
  // ==========================================
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const resolvedTickets = tickets.filter(
    (t) => t.status === 'resolved' || t.status === 'closed'
  );
  const resolutionRate = totalTickets ? Math.round((resolvedTickets.length / totalTickets) * 100) : 0;

  // Average resolution time (hours)
  const avgResolutionHours = useMemo(() => {
    const withDuration = resolvedTickets.filter((t) => t.resolvedAt || t.updatedAt);
    if (withDuration.length === 0) return 0;
    const totalHours = withDuration.reduce((acc, t) => {
      const end = new Date(t.resolvedAt || t.updatedAt).getTime();
      const start = new Date(t.createdAt).getTime();
      const hrs = Math.max(0, (end - start) / (1000 * 3600));
      return acc + hrs;
    }, 0);
    return Math.round((totalHours / withDuration.length) * 10) / 10;
  }, [resolvedTickets]);

  // Overdue tickets and SLA check
  const isTicketOverdue = (t: Ticket) => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    if (t.dueDate) {
      return new Date(t.dueDate).getTime() < now.getTime();
    }
    // Default standard SLA: 48 hours
    return now.getTime() - new Date(t.createdAt).getTime() > 48 * 3600 * 1000;
  };

  const overdueTicketsList = useMemo(() => {
    return tickets.filter(isTicketOverdue);
  }, [tickets, now]);

  const slaComplianceRate = useMemo(() => {
    if (totalTickets === 0) return 100;
    const breachedCount = overdueTicketsList.length;
    return Math.max(0, Math.round(((totalTickets - breachedCount) / totalTickets) * 100));
  }, [totalTickets, overdueTicketsList]);

  // Open tickets by priority
  const openByPriority = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    openTickets.forEach((t) => {
      const p = t.priority === 'urgent' ? 'critical' : t.priority;
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [openTickets]);

  // Open tickets by category
  const openByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    openTickets.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [openTickets]);

  // Most common categories overall (ranked)
  const commonCategoriesRanked = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, count]) => ({
        category: cat,
        count,
        percentage: totalTickets ? Math.round((count / totalTickets) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [tickets, totalTickets]);

  // Open tickets by company
  const openByCompany = useMemo(() => {
    const counts: Record<string, number> = {};
    openTickets.forEach((t) => {
      const coId = t.companyId || 'unassigned';
      const co = companies.find((c) => c.id === coId);
      const name = co ? co.name : 'Unassigned Org';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [openTickets, companies]);

  // Open tickets by department
  const openByDepartment = useMemo(() => {
    const counts: Record<string, number> = {};
    openTickets.forEach((t) => {
      const deptId = t.departmentId || 'unassigned';
      const dept = departments.find((d) => d.id === deptId);
      const name = dept ? dept.name : 'General IT';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [openTickets, departments]);

  // Technician Workload
  const technicianWorkload = useMemo(() => {
    const itStaff = employees.filter((e) => e.role === 'admin' || e.role === 'technician');
    return itStaff.map((tech) => {
      const assigned = tickets.filter((t) => t.assignedTechId === tech.id);
      const open = assigned.filter((t) => t.status === 'open');
      const inProgress = assigned.filter((t) => t.status === 'in_progress');
      const resolved = assigned.filter((t) => t.status === 'resolved' || t.status === 'closed');
      const overdue = assigned.filter(isTicketOverdue);
      return {
        id: tech.id,
        name: tech.fullName,
        email: tech.email,
        role: tech.role,
        totalAssigned: assigned.length,
        openCount: open.length,
        inProgressCount: inProgress.length,
        resolvedCount: resolved.length,
        overdueCount: overdue.length,
        activeWorkload: open.length + inProgress.length,
      };
    }).sort((a, b) => b.activeWorkload - a.activeWorkload);
  }, [employees, tickets, now]);

  // ==========================================
  // INVENTORY & ASSET INTELLIGENCE
  // ==========================================
  const totalAssets = computers.length;

  // Assets by Status
  const assetsByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      available: 0,
      assigned: 0,
      in_use: 0,
      under_repair: 0,
      maintenance: 0,
      retired: 0,
      lost: 0,
    };
    computers.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [computers]);

  // Assets by Type
  const assetsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    computers.forEach((c) => {
      counts[c.type] = (counts[c.type] || 0) + 1;
    });
    return counts;
  }, [computers]);

  // Assets by Company
  const assetsByCompany = useMemo(() => {
    const counts: Record<string, number> = {};
    computers.forEach((c) => {
      const co = companies.find((co) => co.id === c.companyId);
      const name = co ? co.name : 'Unassigned Company';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [computers, companies]);

  // Assets by Department
  const assetsByDepartment = useMemo(() => {
    const counts: Record<string, number> = {};
    computers.forEach((c) => {
      const dept = departments.find((d) => d.id === c.departmentId);
      const name = dept ? dept.name : 'Unassigned Dept';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [computers, departments]);

  // Assets by Physical Location
  const assetsByLocation = useMemo(() => {
    const counts: Record<string, number> = {};
    computers.forEach((c) => {
      const loc = c.location || 'HQ Main Office';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return counts;
  }, [computers]);

  // Devices Under Repair, Retired, or Lost
  const repairOrProblemAssets = useMemo(() => {
    return computers.filter(
      (c) =>
        c.status === 'under_repair' ||
        c.status === 'maintenance' ||
        c.status === 'retired' ||
        c.status === 'lost'
    );
  }, [computers]);

  // Warranty Forecast & Thresholds
  const expiredWarranties = useMemo(() => {
    return computers.filter((c) => {
      if (!c.warrantyExpiration) return false;
      return new Date(c.warrantyExpiration).getTime() < now.getTime();
    });
  }, [computers, now]);

  const expiringIn30Days = useMemo(() => {
    return computers.filter((c) => {
      if (!c.warrantyExpiration) return false;
      const exp = new Date(c.warrantyExpiration).getTime();
      const diff = (exp - now.getTime()) / (1000 * 3600 * 24);
      return diff >= 0 && diff <= 30;
    });
  }, [computers, now]);

  const expiringIn60Days = useMemo(() => {
    return computers.filter((c) => {
      if (!c.warrantyExpiration) return false;
      const exp = new Date(c.warrantyExpiration).getTime();
      const diff = (exp - now.getTime()) / (1000 * 3600 * 24);
      return diff > 30 && diff <= 60;
    });
  }, [computers, now]);

  const expiringIn90Days = useMemo(() => {
    return computers.filter((c) => {
      if (!c.warrantyExpiration) return false;
      const exp = new Date(c.warrantyExpiration).getTime();
      const diff = (exp - now.getTime()) / (1000 * 3600 * 24);
      return diff > 60 && diff <= 90;
    });
  }, [computers, now]);

  // Asset Age and Replacement Planning
  const assetAgingAndReplacement = useMemo(() => {
    let under1Year = 0;
    let oneToThreeYears = 0;
    let threeToFiveYears = 0;
    let over5Years = 0;
    let replacementCandidates: {
      computer: Computer;
      ageYears: number;
      reason: string;
      estCost: number;
    }[] = [];

    computers.forEach((c) => {
      let ageYears = 2.5; // fallback average
      if (c.purchaseDate) {
        const purchase = new Date(c.purchaseDate).getTime();
        ageYears = Math.max(0, (now.getTime() - purchase) / (1000 * 3600 * 24 * 365));
      }

      if (ageYears < 1) under1Year++;
      else if (ageYears <= 3) oneToThreeYears++;
      else if (ageYears <= 5) threeToFiveYears++;
      else over5Years++;

      // Candidate for replacement if age > 3.5 yrs or condition damaged or status retired/repair
      if (ageYears >= 3.5 || c.condition === 'damaged' || c.status === 'under_repair') {
        const rawCost = c.purchaseCost ? parseFloat(c.purchaseCost.replace(/[^0-9.]/g, '')) : 1500;
        replacementCandidates.push({
          computer: c,
          ageYears: Math.round(ageYears * 10) / 10,
          reason:
            c.condition === 'damaged'
              ? 'Physical Damage'
              : ageYears >= 4
              ? 'Exceeded 4-year lifecycle'
              : 'Repeated maintenance overhead',
          estCost: isNaN(rawCost) || rawCost <= 0 ? 1500 : rawCost,
        });
      }
    });

    const totalEstReplacementBudget = replacementCandidates.reduce(
      (sum, item) => sum + item.estCost,
      0
    );

    return {
      under1Year,
      oneToThreeYears,
      threeToFiveYears,
      over5Years,
      replacementCandidates,
      totalEstReplacementBudget,
    };
  }, [computers, now]);

  // Devices assigned to each employee
  const employeeDeviceDirectory = useMemo(() => {
    const list = employees.map((emp) => {
      const assigned = computers.filter(
        (c) =>
          c.assignedEmployeeId === emp.id ||
          (emp.fullName && c.assignedEmployeeName === emp.fullName)
      );
      const co = companies.find((co) => co.id === emp.companyId);
      const dept = departments.find((d) => d.id === emp.departmentId);
      return {
        employee: emp,
        companyName: co?.name || 'Unassigned',
        deptName: dept?.name || 'Unassigned',
        devices: assigned,
      };
    });

    if (!deviceEmployeeSearch.trim()) return list;
    const q = deviceEmployeeSearch.toLowerCase();
    return list.filter(
      (item) =>
        item.employee.fullName.toLowerCase().includes(q) ||
        item.employee.email.toLowerCase().includes(q) ||
        item.employee.jobTitle.toLowerCase().includes(q) ||
        item.devices.some((d) => d.assetTag.toLowerCase().includes(q) || d.model.toLowerCase().includes(q))
    );
  }, [employees, computers, companies, departments, deviceEmployeeSearch]);

  // Combined Audit Trail
  const unifiedAuditLogs = useMemo(() => {
    const logs: {
      id: string;
      category: 'ticket' | 'asset' | 'organization' | 'employee';
      actor: string;
      role: string;
      action: string;
      timestamp: string;
      details?: string;
    }[] = [];

    // Tickets timeline
    tickets.forEach((t) => {
      (t.timeline || []).forEach((ev) => {
        logs.push({
          id: `tck-log-${ev.id}`,
          category: 'ticket',
          actor: ev.actorName,
          role: ev.actorRole,
          action: `${t.ticketNumber}: ${ev.message}`,
          timestamp: ev.timestamp,
          details: ev.oldValue && ev.newValue ? `Changed from ${ev.oldValue} to ${ev.newValue}` : undefined,
        });
      });
    });

    // Computer audit
    computers.forEach((c) => {
      (c.auditHistory || []).forEach((entry) => {
        logs.push({
          id: `comp-log-${entry.id}`,
          category: 'asset',
          actor: entry.actorName,
          role: entry.actorRole,
          action: `${c.assetTag} (${c.brand} ${c.model}): ${entry.message}`,
          timestamp: entry.timestamp,
          details: entry.oldValue && entry.newValue ? `From ${entry.oldValue} -> ${entry.newValue}` : undefined,
        });
      });
    });

    // Organization audit
    (organizationAuditLog || []).forEach((org) => {
      logs.push({
        id: `org-log-${org.id}`,
        category: 'organization',
        actor: org.actorName,
        role: org.actorRole,
        action: org.message,
        timestamp: org.timestamp,
        details: org.details,
      });
    });

    // Sort newest first
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (!auditSearch.trim()) return logs;
    const q = auditSearch.toLowerCase();
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
    );
  }, [tickets, computers, organizationAuditLog, auditSearch]);

  // ==========================================
  // CSV EXPORT HELPERS
  // ==========================================
  const triggerCSVDownload = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({
      title: 'Report Export Complete',
      message: `Downloaded ${filename}.csv successfully`,
      type: 'success',
    });
  };

  const exportTicketsCSV = () => {
    const headers = [
      'Ticket Number',
      'Title',
      'Category',
      'Priority',
      'Status',
      'Requester Name',
      'Requester Email',
      'Assigned Tech',
      'Asset Tag',
      'Company',
      'Department',
      'Due Date',
      'Created At',
      'Resolved At',
      'Resolution Notes',
    ];
    const rows = tickets.map((t) => {
      const co = companies.find((c) => c.id === t.companyId)?.name || '';
      const dept = departments.find((d) => d.id === t.departmentId)?.name || '';
      return [
        t.ticketNumber,
        `"${t.title.replace(/"/g, '""')}"`,
        t.category,
        t.priority,
        t.status,
        `"${t.requesterName.replace(/"/g, '""')}"`,
        t.requesterEmail,
        `"${(t.assignedTechName || 'Unassigned').replace(/"/g, '""')}"`,
        t.assetTag || '',
        `"${co.replace(/"/g, '""')}"`,
        `"${dept.replace(/"/g, '""')}"`,
        t.dueDate || '',
        t.createdAt,
        t.resolvedAt || '',
        `"${(t.resolutionNotes || '').replace(/"/g, '""')}"`,
      ];
    });
    triggerCSVDownload('it_support_tickets_full_report', headers, rows);
  };

  const exportInventoryCSV = () => {
    const headers = [
      'Asset Tag',
      'Serial Number',
      'Brand',
      'Model',
      'Hostname',
      'Type',
      'OS',
      'CPU',
      'RAM',
      'Storage',
      'Condition',
      'Status',
      'Assigned Employee',
      'Company',
      'Department',
      'Physical Location',
      'Purchase Date',
      'Purchase Cost',
      'Warranty Expiration',
      'Vendor',
      'Notes',
    ];
    const rows = computers.map((c) => {
      const co = companies.find((co) => co.id === c.companyId)?.name || '';
      const dept = departments.find((d) => d.id === c.departmentId)?.name || '';
      return [
        c.assetTag,
        c.serialNumber,
        `"${c.brand.replace(/"/g, '""')}"`,
        `"${c.model.replace(/"/g, '""')}"`,
        `"${(c.hostname || '').replace(/"/g, '""')}"`,
        c.type,
        `"${(c.os || '').replace(/"/g, '""')}"`,
        `"${(c.cpu || '').replace(/"/g, '""')}"`,
        `"${(c.ram || '').replace(/"/g, '""')}"`,
        `"${(c.storage || '').replace(/"/g, '""')}"`,
        c.condition,
        c.status,
        `"${(c.assignedEmployeeName || 'Unassigned').replace(/"/g, '""')}"`,
        `"${co.replace(/"/g, '""')}"`,
        `"${dept.replace(/"/g, '""')}"`,
        `"${(c.location || '').replace(/"/g, '""')}"`,
        c.purchaseDate || '',
        `"${(c.purchaseCost || '').replace(/"/g, '""')}"`,
        c.warrantyExpiration || '',
        `"${(c.vendor || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
      ];
    });
    triggerCSVDownload('it_hardware_inventory_audit', headers, rows);
  };

  const exportCompaniesCSV = () => {
    const headers = [
      'Company Name',
      'Company Code',
      'Status',
      'Contact Person',
      'Email',
      'Phone',
      'Address',
      'City',
      'Country',
      'Total Departments',
      'Total Employees',
      'Assigned Assets',
      'Open Tickets',
      'Created Date',
    ];
    const rows = companies.map((co) => {
      const deptCount = departments.filter((d) => d.companyId === co.id).length;
      const empCount = employees.filter((e) => e.companyId === co.id).length;
      const assetCount = computers.filter((c) => c.companyId === co.id).length;
      const openTckCount = tickets.filter(
        (t) => t.companyId === co.id && (t.status === 'open' || t.status === 'in_progress')
      ).length;
      return [
        `"${co.name.replace(/"/g, '""')}"`,
        co.code,
        co.status,
        `"${(co.contactPerson || '').replace(/"/g, '""')}"`,
        co.contactEmail,
        co.phone,
        `"${co.address.replace(/"/g, '""')}"`,
        `"${(co.city || '').replace(/"/g, '""')}"`,
        `"${(co.country || '').replace(/"/g, '""')}"`,
        deptCount,
        empCount,
        assetCount,
        openTckCount,
        co.createdAt,
      ];
    });
    triggerCSVDownload('companies_directory_report', headers, rows);
  };

  const exportDepartmentsCSV = () => {
    const headers = [
      'Department Name',
      'Department Code',
      'Parent Company',
      'Status',
      'Manager',
      'Email',
      'Phone',
      'Physical Location',
      'Employee Count',
      'Assigned Assets',
      'Open Tickets',
      'Created Date',
    ];
    const rows = departments.map((d) => {
      const parentCo = companies.find((c) => c.id === d.companyId)?.name || 'N/A';
      const empCount = employees.filter((e) => e.departmentId === d.id).length;
      const assetCount = computers.filter((c) => c.departmentId === d.id).length;
      const openTckCount = tickets.filter(
        (t) => t.departmentId === d.id && (t.status === 'open' || t.status === 'in_progress')
      ).length;
      return [
        `"${d.name.replace(/"/g, '""')}"`,
        d.code || '',
        `"${parentCo.replace(/"/g, '""')}"`,
        d.status,
        `"${(d.managerName || d.headName || '').replace(/"/g, '""')}"`,
        d.email || '',
        d.phone || '',
        `"${(d.location || d.floorLocation || '').replace(/"/g, '""')}"`,
        empCount,
        assetCount,
        openTckCount,
        d.createdAt,
      ];
    });
    triggerCSVDownload('departments_directory_report', headers, rows);
  };

  const exportTechnicianWorkloadCSV = () => {
    const headers = [
      'Technician Name',
      'Email',
      'Role',
      'Total Assigned',
      'Open Tickets',
      'In Progress Tickets',
      'Resolved Tickets',
      'Overdue Tickets',
      'Active Workload Score',
    ];
    const rows = technicianWorkload.map((t) => [
      `"${t.name.replace(/"/g, '""')}"`,
      t.email,
      t.role,
      t.totalAssigned,
      t.openCount,
      t.inProgressCount,
      t.resolvedCount,
      t.overdueCount,
      t.activeWorkload,
    ]);
    triggerCSVDownload('technician_workload_metrics', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Quick Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              IT Operations Intelligence & Compliance Reports
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics, SLA performance, technician capacity, hardware lifecycle, and CSV data exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportTicketsCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Tickets CSV</span>
          </button>
          <button
            type="button"
            onClick={exportInventoryCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Inventory CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exports')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Center</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          { id: 'helpdesk', label: 'Helpdesk & SLA Performance', icon: Clock },
          { id: 'inventory', label: 'Hardware Lifecycle & Aging', icon: Monitor },
          { id: 'employees', label: 'Device Allocation Directory', icon: Users },
          { id: 'audit', label: 'System Audit Logs', icon: History },
          { id: 'exports', label: 'Export Downloads', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: HELPDESK & SLA PERFORMANCE */}
      {/* ========================================================= */}
      {activeTab === 'helpdesk' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">SLA Compliance Rate</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{slaComplianceRate}%</span>
                <span className="text-xs font-medium text-emerald-600">target: 95%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {overdueTicketsList.length} tickets currently past SLA due date
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Avg Resolution Time</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-indigo-600">{avgResolutionHours} hrs</span>
                <span className="text-xs font-medium text-slate-500">mean time</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Based on {resolvedTickets.length} closed inquiries
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Critical & High Inquiries</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-600">
                  {openByPriority['critical'] + openByPriority['high']}
                </span>
                <span className="text-xs font-medium text-rose-700">active blockers</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {openByPriority['critical']} critical, {openByPriority['high']} high urgency
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Total Resolution Rate</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600">{resolutionRate}%</span>
                <span className="text-xs font-medium text-slate-500">completed</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {resolvedTickets.length} of {totalTickets} total inquiries resolved
              </p>
            </div>
          </div>

          {/* Breakdown Grid: Open tickets by Priority, Category, Company, Department */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Open by Priority */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Open Tickets by Priority
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'critical', label: 'Critical / Urgent', color: 'bg-rose-500', count: openByPriority['critical'] },
                  { key: 'high', label: 'High Priority', color: 'bg-amber-500', count: openByPriority['high'] },
                  { key: 'medium', label: 'Medium Priority', color: 'bg-sky-500', count: openByPriority['medium'] },
                  { key: 'low', label: 'Low / Routine', color: 'bg-slate-400', count: openByPriority['low'] },
                ].map((item) => {
                  const pct = openTickets.length ? Math.round((item.count / openTickets.length) * 100) : 0;
                  return (
                    <div key={item.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="text-slate-900 font-semibold">{item.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Most Common Ticket Categories */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Most Common Ticket Categories (Volume & Share)
              </h3>
              <div className="space-y-2.5">
                {commonCategoriesRanked.map((item) => (
                  <div key={item.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 capitalize">{item.category}</span>
                      <span className="text-slate-900 font-semibold">{item.count} tickets ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open by Company */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Open Tickets by Company Entity
              </h3>
              {Object.keys(openByCompany).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No open tickets across companies.</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(openByCompany).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-semibold text-slate-800">{name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                        {count} open
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open by Department */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Open Tickets by Department
              </h3>
              {Object.keys(openByDepartment).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No open tickets across departments.</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(openByDepartment).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-semibold text-slate-800">{name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                        {count} open
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Technician Workload Matrix */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Technician Workload & Assignment Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live ticket balance across IT support specialists
                </p>
              </div>
              <button
                type="button"
                onClick={exportTechnicianWorkloadCSV}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Workload CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                    <th className="py-2.5 px-3">Technician</th>
                    <th className="py-2.5 px-3">System Role</th>
                    <th className="py-2.5 px-3 text-center">Unassigned/Open</th>
                    <th className="py-2.5 px-3 text-center">In Progress</th>
                    <th className="py-2.5 px-3 text-center">Resolved</th>
                    <th className="py-2.5 px-3 text-center">Overdue</th>
                    <th className="py-2.5 px-3 text-right">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicianWorkload.map((tech) => (
                    <tr key={tech.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{tech.name}</p>
                        <p className="text-[11px] text-slate-400">{tech.email}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tech.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{tech.openCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-600">{tech.inProgressCount}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{tech.resolvedCount}</td>
                      <td className="py-3 px-3 text-center">
                        {tech.overdueCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[11px]">
                            {tech.overdueCount} breached
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {tech.activeWorkload >= 5 ? (
                          <span className="px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px]">
                            Heavy ({tech.activeWorkload} active)
                          </span>
                        ) : tech.activeWorkload >= 2 ? (
                          <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-[11px]">
                            Moderate ({tech.activeWorkload} active)
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                            Available ({tech.activeWorkload} active)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overdue Tickets Table */}
          {overdueTicketsList.length > 0 && (
            <div className="p-5 rounded-xl bg-rose-50/50 border border-rose-200 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  Overdue Tickets & SLA Breaches ({overdueTicketsList.length})
                </h3>
              </div>
              <div className="overflow-x-auto bg-white rounded-lg border border-rose-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-rose-100 bg-rose-50/70 text-rose-900 font-semibold">
                      <th className="py-2.5 px-3">Ticket</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Requester</th>
                      <th className="py-2.5 px-3">Assigned Tech</th>
                      <th className="py-2.5 px-3">Due / Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {overdueTicketsList.map((t) => (
                      <tr key={t.id} className="hover:bg-rose-50/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{t.ticketNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{t.title}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{t.requesterName}</td>
                        <td className="py-2.5 px-3 text-slate-700">{t.assignedTechName || 'Unassigned'}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {t.dueDate || new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HARDWARE LIFECYCLE & AGING */}
      {/* ========================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Top Asset Distribution Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Total Registered Fleet</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{totalAssets}</span>
                <span className="text-xs font-medium text-indigo-600">devices</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {assetsByStatus['in_use'] + assetsByStatus['assigned']} in active employee hands
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Available Shelf Spares</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-cyan-700">{assetsByStatus['available']}</span>
                <span className="text-xs font-medium text-slate-500">ready to issue</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Immediate onboarding inventory reserve
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Under Repair / Maintenance</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-600">
                  {assetsByStatus['under_repair'] + assetsByStatus['maintenance']}
                </span>
                <span className="text-xs font-medium text-amber-700">bench units</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {assetsByStatus['lost']} reported lost, {assetsByStatus['retired']} retired
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Est. Refresh Budget</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  ${assetAgingAndReplacement.totalEstReplacementBudget.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {assetAgingAndReplacement.replacementCandidates.length} assets flagged for renewal
              </p>
            </div>
          </div>

          {/* Asset Breakdown Matrices: Location, Type, Company, Department */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By Type */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Hardware Fleet by Asset Type
              </h3>
              <div className="space-y-2.5">
                {Object.entries(assetsByType).map(([type, count]) => {
                  const pct = totalAssets ? Math.round((count / totalAssets) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 capitalize">{type}</span>
                        <span className="text-slate-900 font-semibold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Physical Location */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Assets by Physical Location & Site
              </h3>
              <div className="space-y-2.5">
                {Object.entries(assetsByLocation).map(([loc, count]) => (
                  <div key={loc} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-800">{loc}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                      {count} assets
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Company */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Assets by Company Allocation
              </h3>
              <div className="space-y-2.5">
                {Object.entries(assetsByCompany).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-800">{name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                      {count} units
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Department */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Assets by Department
              </h3>
              <div className="space-y-2.5">
                {Object.entries(assetsByDepartment).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-800">{name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                      {count} units
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Warranty Forecasting Alert Cards */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Warranty Forecast & OEM Protection Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <p className="text-xs font-bold text-rose-900">Expired Warranty</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">{expiredWarranties.length}</p>
                <p className="text-[11px] text-rose-600 mt-1">Requires third-party or salvage coverage</p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold text-amber-900">Expiring &le; 30 Days</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{expiringIn30Days.length}</p>
                <p className="text-[11px] text-amber-600 mt-1">Immediate renewal action required</p>
              </div>

              <div className="p-3.5 rounded-xl bg-yellow-50 border border-yellow-200">
                <p className="text-xs font-bold text-yellow-900">Expiring 31-60 Days</p>
                <p className="text-2xl font-bold text-yellow-700 mt-1">{expiringIn60Days.length}</p>
                <p className="text-[11px] text-yellow-600 mt-1">Upcoming renewal cycle</p>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                <p className="text-xs font-bold text-sky-900">Expiring 61-90 Days</p>
                <p className="text-2xl font-bold text-sky-700 mt-1">{expiringIn90Days.length}</p>
                <p className="text-[11px] text-sky-600 mt-1">Budget planning window</p>
              </div>
            </div>
          </div>

          {/* Asset Age & Replacement Planning Table */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Asset Age & Hardware Replacement Planning
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Devices approaching end of operational lifecycle or flagged for hardware replacement
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                {assetAgingAndReplacement.replacementCandidates.length} Replacement Candidates
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                    <th className="py-2.5 px-3">Asset Tag</th>
                    <th className="py-2.5 px-3">Device Model</th>
                    <th className="py-2.5 px-3">Calculated Age</th>
                    <th className="py-2.5 px-3">Condition & Status</th>
                    <th className="py-2.5 px-3">Replacement Justification</th>
                    <th className="py-2.5 px-3 text-right">Est. Replacement Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assetAgingAndReplacement.replacementCandidates.map((item) => (
                    <tr key={item.computer.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        {item.computer.assetTag}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900">
                          {item.computer.brand} {item.computer.model}
                        </span>
                        <span className="block text-[10px] text-slate-400 capitalize">
                          {item.computer.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {item.ageYears} years
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 mr-1.5">
                          {item.computer.condition}
                        </span>
                        <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          {item.computer.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{item.reason}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ${item.estCost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Under Repair, Retired, or Lost Details */}
          {repairOrProblemAssets.length > 0 && (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Devices Under Repair, Retired, or Reported Lost ({repairOrProblemAssets.length})
              </h3>
              <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Serial</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3">Current Location</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repairOrProblemAssets.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{c.assetTag}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{c.serialNumber}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.status === 'lost'
                                ? 'bg-rose-100 text-rose-800'
                                : c.status === 'retired'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-700">{c.condition}</td>
                        <td className="py-2.5 px-3 text-slate-600">{c.location || 'IT Depot'}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                          {c.notes || 'None logged'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DEVICE ALLOCATION DIRECTORY */}
      {/* ========================================================= */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Employee-to-Device Allocation Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of hardware custody and peripheral devices assigned to each staff member
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deviceEmployeeSearch}
                onChange={(e) => setDeviceEmployeeSearch(e.target.value)}
                placeholder="Search staff or assigned asset tag..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Organization & Dept</th>
                    <th className="py-3 px-4">Assigned Devices</th>
                    <th className="py-3 px-4 text-center">Device Count</th>
                    <th className="py-3 px-4 text-right">Custody Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeDeviceDirectory.map((item) => (
                    <tr key={item.employee.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{item.employee.fullName}</p>
                        <p className="text-[11px] text-slate-500">{item.employee.jobTitle} • {item.employee.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-800 font-medium">{item.companyName}</p>
                        <p className="text-[11px] text-slate-500">{item.deptName}</p>
                      </td>
                      <td className="py-3 px-4">
                        {item.devices.length === 0 ? (
                          <span className="text-slate-400 italic">No assigned devices</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {item.devices.map((d) => (
                              <span
                                key={d.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                              >
                                {d.type === 'laptop' ? <Laptop className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                                {d.assetTag} ({d.model})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {item.devices.length}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.devices.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Equipped
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Unprovisioned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SYSTEM AUDIT LOGS */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Comprehensive IT Governance & Audit Logs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full chronological ledger of ticket lifecycle updates, inventory status modifications, and company changes
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit actions or actors..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-500 font-medium">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Module Category</th>
                    <th className="py-2.5 px-3">Actor & Role</th>
                    <th className="py-2.5 px-3">Action Details</th>
                    <th className="py-2.5 px-3">Context Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unifiedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No audit records found matching query.
                      </td>
                    </tr>
                  ) : (
                    unifiedAuditLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`capitalize px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.category === 'ticket'
                                ? 'bg-indigo-50 text-indigo-700'
                                : log.category === 'asset'
                                ? 'bg-cyan-50 text-cyan-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {log.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900">{log.actor}</span>
                          <span className="block text-[10px] text-slate-400 capitalize">{log.role}</span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{log.action}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                          {log.details || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: EXPORT DOWNLOADS CENTER */}
      {/* ========================================================= */}
      {activeTab === 'exports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Tickets */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Support Tickets Full Dataset (CSV)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Exports all tickets with numbers, requester emails, assigned technicians, SLA dates, resolutions, and associated asset tags.
              </p>
            </div>
            <button
              type="button"
              onClick={exportTicketsCSV}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Tickets CSV ({tickets.length} records)</span>
            </button>
          </div>

          {/* Card 2: Inventory */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
                <Monitor className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Computer Inventory & Assets (CSV)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Exports comprehensive asset records including tags, serials, specs (CPU/RAM/storage), warranties, condition, and employee assignments.
              </p>
            </div>
            <button
              type="button"
              onClick={exportInventoryCSV}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-cyan-700 text-white hover:bg-cyan-800 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Inventory CSV ({computers.length} records)</span>
            </button>
          </div>

          {/* Card 3: Companies */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Building className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Corporate Companies Directory (CSV)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Exports registered enterprise entities with codes, contacts, physical addresses, department counts, staff totals, and hardware metrics.
              </p>
            </div>
            <button
              type="button"
              onClick={exportCompaniesCSV}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-purple-700 text-white hover:bg-purple-800 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Companies CSV ({companies.length} records)</span>
            </button>
          </div>

          {/* Card 4: Departments */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Departments Directory (CSV)</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Exports business departments mapped to parent corporate organizations with managers, phone, employee counts, and open tickets.
              </p>
            </div>
            <button
              type="button"
              onClick={exportDepartmentsCSV}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Departments CSV ({departments.length} records)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
