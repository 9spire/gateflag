import type { HTMLAttributes } from 'react';
import { cn } from './cn.js';

export function Badge({
  className,
  tone = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'default' | 'danger' | 'success' }) {
  return (
    <span
      className={cn(
        'gf:inline-flex gf:rounded gf:px-1.5 gf:py-0.5 gf:text-xs gf:font-medium',
        tone === 'default' && 'gf:bg-[var(--color-gf-bg)] gf:text-[var(--color-gf-muted)]',
        tone === 'danger' && 'gf:bg-red-100 gf:text-[var(--color-gf-danger)]',
        tone === 'success' && 'gf:bg-emerald-100 gf:text-emerald-800',
        className,
      )}
      {...props}
    />
  );
}
