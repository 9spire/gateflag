import { useMemo } from 'react';
import { useAccessControl } from '../context/AccessControlProvider.js';
import { AdminClient } from '../api/AdminClient.js';
import { ApiError } from '../api/http.js';

export function useAdminApi() {
  const { config } = useAccessControl();
  const client = useMemo(() => new AdminClient(config.apiBaseUrl), [config.apiBaseUrl]);

  const authHeaders = useMemo(() => {
    return async (): Promise<Record<string, string>> => {
      if (config.getAdminAuthHeaders) {
        return config.getAdminAuthHeaders();
      }
      if (config.getAuthHeaders) {
        return config.getAuthHeaders();
      }
      if (!config.userId) {
        return {};
      }
      return { 'X-Demo-User': config.userId };
    };
  }, [config]);

  return { client, authHeaders, accessClientId: config.accessClientId };
}

export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
