import { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  category,
  children,
}: {
  title: string;
  description?: string;
  category?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {category && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            <span>Operations</span>
            <span className="text-slate-600">/</span>
            <span>{category}</span>
          </div>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm font-normal text-slate-400 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">{children}</div>}
    </div>
  );
}
