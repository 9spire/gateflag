import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn.js';

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      className={cn(
        'gf:inline-flex gf:cursor-pointer gf:items-center gf:justify-center gf:rounded-[0.4rem] gf:border gf:text-sm gf:font-medium gf:disabled:cursor-not-allowed gf:disabled:opacity-60',
        size === 'md' && 'gf:px-[0.85rem] gf:py-2',
        size === 'sm' && 'gf:px-[0.55rem] gf:py-1 gf:text-[0.8rem]',
        variant === 'default' &&
          'gf:border-[var(--color-gf-accent)] gf:bg-[var(--color-gf-accent)] gf:text-white',
        variant === 'secondary' &&
          'gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-surface)] gf:text-[var(--color-gf-fg)]',
        variant === 'danger' &&
          'gf:border-[var(--color-gf-danger)] gf:bg-[var(--color-gf-danger)] gf:text-white',
        variant === 'ghost' &&
          'gf:border-[var(--color-gf-border)] gf:bg-transparent gf:text-[var(--color-gf-accent)] gf:hover:bg-[var(--color-gf-bg)]',
        className,
      )}
      {...props}
    />
  );
}
