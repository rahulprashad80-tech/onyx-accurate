import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface AuditInfoProps {
  createdAt: string;
  updatedAt?: string;
  className?: string;
}

export const AuditInfo: React.FC<AuditInfoProps> = ({ createdAt, updatedAt, className = '' }) => {
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? isoString : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1.5 ${className}`}>
      <span className="inline-flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-medium text-slate-600">Created:</span> {formatDate(createdAt)}
      </span>
      {updatedAt && updatedAt !== createdAt && (
        <span className="inline-flex items-center gap-1 border-l border-slate-200 pl-3">
          <RefreshCw className="w-3 h-3 text-slate-400" />
          <span className="font-medium text-slate-600">Updated:</span> {formatDate(updatedAt)}
        </span>
      )}
    </div>
  );
};
