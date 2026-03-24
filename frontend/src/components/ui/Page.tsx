import * as React from 'react';
import { cx } from '../../lib/cx';

export function Page({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8', className)} {...props} />;
}

export function PageHeader({
  right,
}: {
  title?: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="space-y-1">
        {/* <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="text-sm text-ink/60">{description}</p> : null} */}
      </div>
      {right ? <div className="flex items-end justify-start sm:justify-end gap-3">{right}</div> : null}
    </div>
  );
}

export function Callout({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'danger' | 'success';
  children: React.ReactNode;
}) {
  const styles =
    tone === 'danger'
      ? 'bg-red-50 border border-red-200 text-red-800'
      : tone === 'success'
        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        : 'bg-brand-soft/50 border border-brand/20 text-brand-dark';

  return <div className={cx('rounded-xl px-4 py-3 text-sm', styles)}>{children}</div>;
}
