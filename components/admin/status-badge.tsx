import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const styles: Record<Variant, string> = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function StatusBadge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function integrityToVariant(status: string): Variant {
  switch (status) {
    case 'trusted': return 'success';
    case 'review_required': return 'warning';
    case 'high_risk': return 'danger';
    default: return 'neutral';
  }
}

export function attendanceToVariant(status: string): Variant {
  switch (status) {
    case 'active': return 'info';
    case 'completed': return 'success';
    case 'auto_completed': return 'warning';
    case 'cancelled': return 'danger';
    default: return 'neutral';
  }
}

export function reviewToVariant(status: string): Variant {
  switch (status) {
    case 'pending': return 'warning';
    case 'reviewed': return 'success';
    case 'flagged': return 'danger';
    case 'resolved': return 'success';
    case 'open': return 'warning';
    case 'reviewing': return 'info';
    case 'resolved_legitimate': return 'success';
    case 'resolved_fraud': return 'danger';
    case 'escalated': return 'danger';
    default: return 'neutral';
  }
}

export function severityToVariant(severity: string): Variant {
  switch (severity) {
    case 'low': return 'neutral';
    case 'medium': return 'info';
    case 'high': return 'warning';
    case 'critical': return 'danger';
    default: return 'neutral';
  }
}
