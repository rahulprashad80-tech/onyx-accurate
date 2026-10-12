import React from 'react';
import { 
  TicketPriority, 
  TicketStatus, 
  ComputerStatus, 
  ComputerCondition,
  UserRole 
} from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?:
    | 'priority'
    | 'ticketStatus'
    | 'computerStatus'
    | 'computerCondition'
    | 'role'
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'primary';
  value?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  value, 
  size = 'md' 
}) => {
  const content = children || value;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  // Ticket Priority Styling
  if (
    variant === 'priority' || 
    (value && ['critical', 'urgent', 'high', 'medium', 'low'].includes(value.toLowerCase()))
  ) {
    const rawVal = (value || String(content)).toLowerCase();
    const val: 'critical' | 'high' | 'medium' | 'low' = 
      rawVal === 'urgent' || rawVal === 'critical' ? 'critical' : (rawVal as any);

    const styles = {
      critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/90 font-semibold',
      high: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 font-medium',
      medium: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/80 font-medium',
      low: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 font-medium',
    };
    const labels = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return (
      <span className={`inline-flex items-center rounded-md ${styles[val] || styles.low} ${sizeClasses}`}>
        <span 
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            val === 'critical' 
              ? 'bg-rose-600 animate-pulse' 
              : val === 'high' 
              ? 'bg-amber-500' 
              : val === 'medium' 
              ? 'bg-sky-500' 
              : 'bg-slate-400'
          }`}
        />
        {labels[val] || content}
      </span>
    );
  }

  // Ticket Status Styling
  if (
    variant === 'ticketStatus' || 
    (value && ['open', 'in_progress', 'waiting_user', 'pending_user', 'resolved', 'closed'].includes(value.toLowerCase()))
  ) {
    const rawVal = (value || String(content)).toLowerCase();
    const val = rawVal === 'pending_user' ? 'waiting_user' : rawVal;

    const styles: Record<string, string> = {
      open: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 font-medium',
      in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/80 font-medium',
      waiting_user: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 font-medium',
      resolved: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80 font-medium',
      closed: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 font-medium',
    };
    const labels: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      waiting_user: 'Waiting for User',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return (
      <span className={`inline-flex items-center rounded-md ${styles[val] || styles.open} ${sizeClasses}`}>
        <span 
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            val === 'open' 
              ? 'bg-emerald-500' 
              : val === 'in_progress' 
              ? 'bg-blue-500' 
              : val === 'waiting_user' 
              ? 'bg-amber-500' 
              : val === 'resolved' 
              ? 'bg-purple-500' 
              : 'bg-slate-400'
          }`}
        />
        {labels[val] || content}
      </span>
    );
  }

  // Computer Status Styling
  if (
    variant === 'computerStatus' || 
    (value && ['in_use', 'assigned', 'available', 'maintenance', 'under_repair', 'retired', 'lost'].includes(value.toLowerCase()))
  ) {
    const rawVal = (value || String(content)).toLowerCase();
    const val: ComputerStatus = 
      rawVal === 'maintenance' ? 'under_repair' : 
      rawVal === 'in_use' ? 'assigned' : (rawVal as any);

    const styles: Record<string, string> = {
      available: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 font-semibold',
      assigned: 'bg-amber-50 text-amber-900 ring-1 ring-amber-300 font-semibold',
      in_use: 'bg-amber-50 text-amber-900 ring-1 ring-amber-300 font-semibold',
      under_repair: 'bg-rose-50 text-rose-800 ring-1 ring-rose-300 font-semibold',
      maintenance: 'bg-rose-50 text-rose-800 ring-1 ring-rose-300 font-semibold',
      retired: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300 font-medium',
      lost: 'bg-red-100 text-red-900 ring-1 ring-red-400 font-semibold',
    };
    const labels: Record<string, string> = {
      available: 'In Stock',
      assigned: 'Assigned',
      in_use: 'In Use',
      under_repair: 'Under Repair',
      maintenance: 'Under Repair',
      retired: 'Retired',
      lost: 'Lost',
    };
    return (
      <span className={`inline-flex items-center rounded-md ${styles[val] || styles.available} ${sizeClasses}`}>
        <span 
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            val === 'assigned' || val === 'in_use'
              ? 'bg-amber-500' 
              : val === 'available' 
              ? 'bg-emerald-500' 
              : val === 'under_repair' || val === 'maintenance'
              ? 'bg-rose-500' 
              : val === 'lost'
              ? 'bg-red-600'
              : 'bg-slate-400'
          }`}
        />
        {labels[val] || content}
      </span>
    );
  }

  // Computer Condition Styling
  if (
    variant === 'computerCondition' || 
    (value && ['new', 'good', 'fair', 'damaged'].includes(value.toLowerCase()))
  ) {
    const val = (value || String(content)).toLowerCase() as ComputerCondition;
    const styles: Record<string, string> = {
      new: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 font-medium',
      good: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 font-medium',
      fair: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-medium',
      damaged: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 font-medium',
    };
    const labels: Record<string, string> = {
      new: 'New',
      good: 'Good',
      fair: 'Fair',
      damaged: 'Damaged',
    };
    return (
      <span className={`inline-flex items-center rounded-md ${styles[val] || styles.good} ${sizeClasses}`}>
        {labels[val] || content}
      </span>
    );
  }

  // Role Styling
  if (variant === 'role' || (value && ['admin', 'technician', 'employee'].includes(value.toLowerCase()))) {
    const val = (value || String(content)).toLowerCase() as UserRole;
    const styles = {
      admin: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 font-semibold',
      technician: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 font-semibold',
      employee: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 font-medium',
    };
    const labels: Record<string, string> = {
      admin: 'Admin',
      technician: 'IT Technician',
      employee: 'Employee',
    };
    return (
      <span className={`inline-flex items-center rounded-md ${styles[val] || styles.employee} ${sizeClasses}`}>
        {labels[val] || content}
      </span>
    );
  }

  if (variant === 'success') {
    return (
      <span className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 font-medium ${sizeClasses}`}>
        {content}
      </span>
    );
  }

  if (variant === 'warning') {
    return (
      <span className={`inline-flex items-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 font-medium ${sizeClasses}`}>
        {content}
      </span>
    );
  }

  if (variant === 'danger') {
    return (
      <span className={`inline-flex items-center rounded-md bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 font-medium ${sizeClasses}`}>
        {content}
      </span>
    );
  }

  if (variant === 'primary') {
    return (
      <span className={`inline-flex items-center rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80 font-medium ${sizeClasses}`}>
        {content}
      </span>
    );
  }

  if (variant === 'neutral') {
    return (
      <span className={`inline-flex items-center rounded-md bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 font-medium ${sizeClasses}`}>
        {content}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 ring-1 ring-slate-200 ${sizeClasses}`}>
      {content}
    </span>
  );
};
