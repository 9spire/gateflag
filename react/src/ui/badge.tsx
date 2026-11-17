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
        'gf:inline-flex gf:rounded-[0.3rem] gf:px-[0.35rem] gf:py-[0.1rem] gf:text-[0.72rem] gf:font-semibold gf:tracking-[0.02em]',
        tone === 'default' && 'gf:bg-[var(--color-gf-bg)] gf:text-[var(--color-gf-muted)]',
        tone === 'danger' && 'gf:bg-[var(--color-gf-danger-bg)] gf:text-[var(--color-gf-danger)]',
        tone === 'success' &&
          'gf:bg-[var(--color-gf-accent-soft)] gf:text-[var(--color-gf-accent)]',
        className,
      )}
      {...props}
    />
  );
}
