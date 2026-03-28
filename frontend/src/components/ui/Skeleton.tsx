import * as React from 'react';
import { cx } from '../../lib/cx';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('animate-pulse rounded-md bg-cream-dark/40', className)}
      {...props}
    />
  );
}

