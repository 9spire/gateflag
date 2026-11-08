import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AdminModal } from '../admin/AdminModal.js';
import { useAccessControl } from '../context/AccessControlProvider.js';

export type AccessButtonProps = {
  label?: string;
  /** Called after the admin modal closes (in addition to permissions refresh). */
  onClose?: () => void;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export function AccessButton({
  label = 'Admin',
  onClose,
  onClick,
  children,
  ...rest
}: AccessButtonProps) {
  const { permissions } = useAccessControl();
  const [open, setOpen] = useState(false);

  if (!permissions?.isAdmin) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        {...rest}
        aria-haspopup="dialog"
        onClick={(event) => {
          onClick?.(event);
          setOpen(true);
        }}
        data-gateflag-access-button=""
      >
        {children ?? label}
      </button>
      <AdminModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            onClose?.();
          }
        }}
      />
    </>
  );
}

/** Call after the admin modal closes to refresh permissions. */
export function useAdminCloseHandler(onClose?: () => void): () => void {
  const { notifyAdminClosed } = useAccessControl();
  return () => {
    notifyAdminClosed();
    onClose?.();
  };
}
