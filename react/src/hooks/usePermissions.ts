import { useAccessControl } from '../context/AccessControlProvider.js';
import type { PermissionsResponse } from '../types.js';

export function usePermissions(): {
  permissions: PermissionsResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { permissions, loading, error, refresh } = useAccessControl();
  return { permissions, loading, error, refresh };
}
