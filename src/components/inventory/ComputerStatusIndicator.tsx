import React from 'react';
import { ComputerStatus } from '../../types';
import {
  CheckCircle2,
  UserCheck,
  Wrench,
  Archive,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export interface ComputerStatusIndicatorProps {
  status: ComputerStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showSubtext?: boolean;
  className?: string;
}

export interface StatusConfig {
  label: string;
  subtext: string;
  badgeClass: string;
  dotClass: string;
  borderAccent: string;
  bgLight: string;
  textColor: string;
  IconComponent: React.ComponentType<{ className?: string }>;
}

export const STATUS_CONFIGS: Record<ComputerStatus, StatusConfig> = {
  available: {
    label: 'In Stock',
    subtext: 'Available for immediate assignment',
    badgeClass: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 font-semibold',
    dotClass: 'bg-emerald-500 ring-2 ring-emerald-200',
    borderAccent: 'border-emerald-500',
    bgLight: 'bg-emerald-50/70',
    textColor: 'text-emerald-700',
    IconComponent: CheckCircle2,
  },
  assigned: {
    label: 'Assigned',
    subtext: 'Deployed to active employee',
    badgeClass: 'bg-amber-50 text-amber-900 ring-1 ring-amber-300 font-semibold',
    dotClass: 'bg-amber-500 ring-2 ring-amber-200',
    borderAccent: 'border-amber-500',
    bgLight: 'bg-amber-50/70',
    textColor: 'text-amber-800',
    IconComponent: UserCheck,
  },
  in_use: {
    label: 'Assigned',
    subtext: 'In active employee custody',
    badgeClass: 'bg-amber-50 text-amber-900 ring-1 ring-amber-300 font-semibold',
    dotClass: 'bg-amber-500 ring-2 ring-amber-200',
    borderAccent: 'border-amber-500',
    bgLight: 'bg-amber-50/70',
    textColor: 'text-amber-800',
    IconComponent: UserCheck,
  },
  under_repair: {
    label: 'Under Repair',
    subtext: 'In maintenance or service bench',
    badgeClass: 'bg-rose-50 text-rose-800 ring-1 ring-rose-300 font-semibold',
    dotClass: 'bg-rose-500 ring-2 ring-rose-200 animate-pulse',
    borderAccent: 'border-rose-500',
    bgLight: 'bg-rose-50/70',
    textColor: 'text-rose-700',
    IconComponent: Wrench,
  },
  maintenance: {
    label: 'Under Repair',
    subtext: 'Undergoing routine diagnostics',
    badgeClass: 'bg-rose-50 text-rose-800 ring-1 ring-rose-300 font-semibold',
    dotClass: 'bg-rose-500 ring-2 ring-rose-200 animate-pulse',
    borderAccent: 'border-rose-500',
    bgLight: 'bg-rose-50/70',
    textColor: 'text-rose-700',
    IconComponent: Clock,
  },
  retired: {
    label: 'Retired',
    subtext: 'Decommissioned lifecycle asset',
    badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300 font-medium',
    dotClass: 'bg-slate-400 ring-2 ring-slate-200',
    borderAccent: 'border-slate-400',
    bgLight: 'bg-slate-50',
    textColor: 'text-slate-600',
    IconComponent: Archive,
  },
  lost: {
    label: 'Lost',
    subtext: 'Missing or unaccounted hardware',
    badgeClass: 'bg-red-100 text-red-900 ring-1 ring-red-400 font-semibold',
    dotClass: 'bg-red-600 ring-2 ring-red-200 animate-pulse',
    borderAccent: 'border-red-600',
    bgLight: 'bg-red-50/80',
    textColor: 'text-red-800',
    IconComponent: AlertTriangle,
  },
};

export const ComputerStatusIndicator: React.FC<ComputerStatusIndicatorProps> = ({
  status,
  size = 'md',
  showIcon = true,
  showSubtext = false,
  className = '',
}) => {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.available;
  const { IconComponent } = config;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-medium',
    lg: 'px-3 py-1.5 text-xs font-semibold gap-2',
  }[size];

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span
        className={`inline-flex items-center rounded-full font-medium transition-colors ${config.badgeClass} ${sizeClasses}`}
        title={`${config.label} - ${config.subtext}`}
      >
        <span className={`rounded-full shrink-0 ${config.dotClass} ${dotSizeClasses}`} />
        {showIcon && <IconComponent className={`shrink-0 ${iconSizeClasses}`} />}
        <span>{config.label}</span>
      </span>
      {showSubtext && (
        <span className="text-[10px] text-slate-400 mt-0.5 ml-1">{config.subtext}</span>
      )}
    </div>
  );
};
