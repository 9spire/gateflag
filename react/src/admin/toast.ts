import { toast } from 'sonner';

export function toastSuccess(message: string): void {
  toast.success(message, { duration: 5000 });
}

export function toastError(message: string): void {
  toast.error(message, { duration: 5000 });
}

export function toastConflict(): void {
  toast.error('This flag changed since you opened it. Reload to see the latest version.', {
    duration: 5000,
  });
}
