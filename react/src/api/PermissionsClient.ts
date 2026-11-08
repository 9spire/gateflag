import type { PermissionsResponse } from '@gateflag/core';
import { apiFetch } from './http.js';

export class PermissionsClient {
  constructor(private readonly apiBaseUrl: string) {}

  async getPermissions(options: {
    headers: Record<string, string>;
    accessClientId?: string;
    signal?: AbortSignal;
  }): Promise<PermissionsResponse> {
    const headers = { ...options.headers };
    if (options.accessClientId) {
      headers['X-Access-Client'] = options.accessClientId;
    }
    return apiFetch<PermissionsResponse>(this.apiBaseUrl, '/api/v1/permissions', {
      headers,
      signal: options.signal,
    });
  }

  async checkFlag(options: {
    flag: string;
    headers: Record<string, string>;
    accessClientId?: string;
    signal?: AbortSignal;
  }): Promise<{ flag: string; hasAccess: boolean; reason: string; groupKey?: string }> {
    const headers = { ...options.headers };
    if (options.accessClientId) {
      headers['X-Access-Client'] = options.accessClientId;
    }
    const query = new URLSearchParams({ flag: options.flag });
    return apiFetch(this.apiBaseUrl, `/api/v1/check?${query.toString()}`, {
      headers,
      signal: options.signal,
    });
  }
}
