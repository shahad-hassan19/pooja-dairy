import * as React from 'react';
import { cx } from '../../lib/cx';

export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('overflow-x-auto', className)} {...props} />;
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cx(
        'min-w-full text-sm',
        className,
      )}
      {...props}
    />
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cx(
        'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/50',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx('px-4 py-3 text-ink border-t border-cream-dark/50', className)} {...props} />;
}
