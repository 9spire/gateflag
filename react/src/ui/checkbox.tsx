import type { InputHTMLAttributes } from 'react';
import { cn } from './cn.js';

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        // Opt-in @tailwindcss/forms class — never applied globally to host pages.
        'form-checkbox',
        'gf:size-[18px] gf:rounded-[0.4rem] gf:border-[var(--color-gf-border)] gf:text-[var(--color-gf-accent)] gf:focus:ring-[var(--color-gf-accent)]',
        className,
      )}
      {...props}
    />
  );
}
