import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useAccessControl } from '../context/AccessControlProvider.js';

export type AccessButtonProps = {
  label?: string;
  /** Reserved for admin modal close wiring (Phase 6). Prefer `useAdminCloseHandler`. */
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

  if (!permissions?.isAdmin) {
    return null;
  }

  return (
    <button
      type="button"
      {...rest}
      aria-haspopup={onClose ? 'dialog' : rest['aria-haspopup']}
      onClick={(event) => {
        onClick?.(event);
      }}
      data-gateflag-access-button=""
    >
      {children ?? label}
    </button>
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
