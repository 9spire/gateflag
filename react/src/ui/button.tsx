import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn.js';

export function Button({
  className,
  variant = 'default',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <button
      type="button"
      className={cn(
        'gf:inline-flex gf:items-center gf:justify-center gf:rounded-md gf:px-3 gf:py-1.5 gf:text-sm gf:font-medium gf:disabled:opacity-50',
        variant === 'default' && 'gf:bg-[var(--color-gf-accent)] gf:text-white',
        variant === 'secondary' && 'gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-surface)]',
        variant === 'danger' && 'gf:bg-[var(--color-gf-danger)] gf:text-white',
        variant === 'ghost' && 'gf:bg-transparent gf:hover:bg-[var(--color-gf-bg)]',
        className,
      )}
      {...props}
    />
  );
}
