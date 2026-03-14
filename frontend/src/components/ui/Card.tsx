import * as React from 'react';
import { cx } from '../../lib/cx';

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-2xl bg-white border border-cream-dark/60 shadow-card',
        className,
      )}
      {...props}
    />
  );
}
