import type { InputHTMLAttributes } from 'react';
import { cn } from './cn.js';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'gf:w-full gf:rounded-md gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-surface)] gf:px-3 gf:py-1.5 gf:text-sm',
        className,
      )}
      {...props}
    />
  );
}
