import type { PermissionsResponse } from '@gateflag/core';

export type { PermissionsResponse };

export interface AccessControlConfig {
  apiBaseUrl: string;
  userId: string | null;
  accessClientId?: string;
  pollIntervalMs?: number;
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  onError?: (error: Error) => void;
}

export interface AccessControlState {
  permissions: PermissionsResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  notifyAdminClosed: () => void;
  config: AccessControlConfig;
}
