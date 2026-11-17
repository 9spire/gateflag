import type { InputHTMLAttributes } from 'react';
import { cn } from './cn.js';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        // Opt-in @tailwindcss/forms class — never applied globally to host pages.
        'form-input',
        'gf:w-full gf:rounded-[0.4rem] gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-surface)] gf:px-2.5 gf:py-2 gf:text-sm gf:text-[var(--color-gf-fg)] gf:shadow-none gf:focus:border-[var(--color-gf-accent)] gf:focus:ring-[var(--color-gf-accent)]',
        className,
      )}
      {...props}
    />
  );
}
