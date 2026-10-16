import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const badgeStyles: Record<Variant, string> = {
  success: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  warning: 'bg-amber-50/80 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  danger: 'bg-rose-50/80 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
  info: 'bg-indigo-50/80 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50',
  neutral: 'bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

const dotStyles: Record<Variant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-indigo-500',
  neutral: 'bg-slate-400',
};

export function StatusBadge({
  variant = 'neutral',
  children,
  className,
  showDot = true,
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight transition-colors shadow-2xs',
        badgeStyles[variant],
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            dotStyles[variant],
            variant === 'success' || variant === 'info' ? 'animate-pulse' : ''
          )}
        />
      )}
      <span className="capitalize">{children}</span>
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
