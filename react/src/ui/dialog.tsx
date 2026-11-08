import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from './cn.js';

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
      <DialogPrimitive.Overlay className="gf:fixed gf:inset-0 gf:z-50 gf:bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          'gf:fixed gf:left-1/2 gf:top-1/2 gf:z-50 gf:flex gf:max-h-[90vh] gf:w-[min(960px,94vw)] gf:-translate-x-1/2 gf:-translate-y-1/2 gf:flex-col gf:overflow-hidden gf:rounded-lg gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-surface)] gf:shadow-xl',
          className,
        )}
      >
        <div className="gf:flex gf:items-center gf:justify-between gf:border-b gf:border-[var(--color-gf-border)] gf:px-4 gf:py-3">
          <DialogPrimitive.Title className="gf:text-base gf:font-semibold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="gf:rounded gf:px-2 gf:py-1 gf:text-sm gf:hover:bg-[var(--color-gf-bg)]">
            Close
          </DialogPrimitive.Close>
        </div>
        <div className="gf:min-h-0 gf:flex-1 gf:overflow-auto gf:p-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
