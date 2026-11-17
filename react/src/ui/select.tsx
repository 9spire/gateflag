import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn.js';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        // Opt-in @tailwindcss/forms class — never applied globally to host pages.
        'form-select',
        'gf:w-full gf:rounded-[0.4rem] gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-surface)] gf:py-2 gf:pl-2.5 gf:pr-10 gf:text-sm gf:text-[var(--color-gf-fg)] gf:shadow-none gf:focus:border-[var(--color-gf-accent)] gf:focus:ring-[var(--color-gf-accent)]',
        className,
      )}
      {...props}
    />
  );
}
