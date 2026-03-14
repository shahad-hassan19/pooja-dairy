import * as React from 'react';
import { cx } from '../../lib/cx';

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-ink">{label}</label>
        {hint ? <span className="text-xs text-ink/50">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export const inputClass =
  'h-10 w-full rounded-xl border border-cream-dark bg-white px-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand';
