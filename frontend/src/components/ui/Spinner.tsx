import * as React from 'react';
import { cx } from '../../lib/cx';

export function Spinner({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink',
        className,
      )}
      {...props}
    />
  );
}

