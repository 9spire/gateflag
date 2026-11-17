import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from './cn.js';
import { Button } from './button.js';

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function DialogContent({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="gf:fixed gf:inset-0 gf:z-50 gf:bg-[rgb(21_32_43_/_45%)]" />
      <DialogPrimitive.Content
        className={cn(
          'gf-gateflag-root gf:fixed gf:left-1/2 gf:top-1/2 gf:z-50 gf:flex gf:max-h-[90vh] gf:w-[min(40rem,94vw)] gf:-translate-x-1/2 gf:-translate-y-1/2 gf:flex-col gf:overflow-hidden gf:rounded-[0.75rem] gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-surface)] gf:shadow-[0_16px_40px_rgb(21_32_43_/_18%)]',
          className,
        )}
      >
        <div className="gf:flex gf:items-start gf:justify-between gf:gap-3 gf:border-b gf:border-[var(--color-gf-border)] gf:px-6 gf:py-4">
          <div>
            <p className="gf:m-0 gf:text-[0.75rem] gf:font-semibold gf:uppercase gf:tracking-[0.04em] gf:text-[var(--color-gf-muted)]">
              Console
            </p>
            <DialogPrimitive.Title className="gf:m-0 gf:mt-1 gf:text-[1.25rem] gf:font-semibold gf:tracking-[-0.02em] gf:text-[var(--color-gf-fg)]">
              {title}
            </DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="secondary" size="sm">
              Close
            </Button>
          </DialogPrimitive.Close>
        </div>
        <div className="gf:min-h-0 gf:flex-1 gf:overflow-auto gf:px-6 gf:py-4">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
