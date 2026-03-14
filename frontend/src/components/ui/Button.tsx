import * as React from 'react';
import { cx } from '../../lib/cx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream';

  const sizes: Record<Size, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
  };

  const variants: Record<Variant, string> = {
    primary:
      'bg-brand text-white shadow-card hover:bg-brand-dark active:bg-brand-dark',
    secondary:
      'bg-cream-light border border-cream-dark text-ink hover:bg-cream-dark active:bg-cream-dark',
    danger:
      'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
    ghost:
      'bg-transparent text-ink/70 hover:bg-cream-dark active:bg-cream-dark',
  };

  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}
