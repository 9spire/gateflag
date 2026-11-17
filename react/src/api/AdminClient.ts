import type {
  AuditEntry,
  Flag,
  Group,
  Membership,
  User,
} from '@gateflag/core';
import { apiFetch } from './http.js';

export class AdminClient {
  constructor(private readonly apiBaseUrl: string) {}

  private pathEmail(email: string): string {
    return encodeURIComponent(email);
  }

  listFlags(headers: Record<string, string>): Promise<Flag[]> {
    return apiFetch(this.apiBaseUrl, '/api/v1/admin/flags', { headers });
  }

  getFlag(key: string, headers: Record<string, string>): Promise<Flag & Record<string, unknown>> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/flags/${encodeURIComponent(key)}`, {
      headers,
    });
  }

  createFlag(body: unknown, headers: Record<string, string>): Promise<Flag> {
    return apiFetch(this.apiBaseUrl, '/api/v1/admin/flags', {
      method: 'POST',
      headers,
      body,
    });
  }

  updateFlag(key: string, body: unknown, headers: Record<string, string>): Promise<Flag> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/flags/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers,
      body,
    });
  }

  deleteFlag(key: string, headers: Record<string, string>): Promise<void> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/flags/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers,
    });
  }

  setRoleAccess(key: string, body: unknown, headers: Record<string, string>): Promise<void> {
    return apiFetch(
      this.apiBaseUrl,
      `/api/v1/admin/flags/${encodeURIComponent(key)}/role-access`,
      { method: 'POST', headers, body },
    );
  }

  setGroupAccess(key: string, body: unknown, headers: Record<string, string>): Promise<void> {
    return apiFetch(
      this.apiBaseUrl,
      `/api/v1/admin/flags/${encodeURIComponent(key)}/group-access`,
      { method: 'POST', headers, body },
    );
  }

  setUserAccess(key: string, body: unknown, headers: Record<string, string>): Promise<void> {
    return apiFetch(
      this.apiBaseUrl,
      `/api/v1/admin/flags/${encodeURIComponent(key)}/user-access`,
      { method: 'POST', headers, body },
    );
  }

  listUsers(headers: Record<string, string>): Promise<User[]> {
    return apiFetch(this.apiBaseUrl, '/api/v1/admin/users', { headers });
  }

  getUser(email: string, headers: Record<string, string>): Promise<User & Record<string, unknown>> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/users/${this.pathEmail(email)}`, {
      headers,
    });
  }

  createUser(body: unknown, headers: Record<string, string>): Promise<User> {
    return apiFetch(this.apiBaseUrl, '/api/v1/admin/users', {
      method: 'POST',
      headers,
      body,
    });
  }

  updateUser(email: string, body: unknown, headers: Record<string, string>): Promise<User> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/users/${this.pathEmail(email)}`, {
      method: 'PUT',
      headers,
      body,
    });
  }

  deleteUser(email: string, headers: Record<string, string>): Promise<void> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/users/${this.pathEmail(email)}`, {
      method: 'DELETE',
      headers,
    });
  }

  denyFlag(email: string, body: unknown, headers: Record<string, string>): Promise<void> {
    return apiFetch(
      this.apiBaseUrl,
      `/api/v1/admin/users/${this.pathEmail(email)}/deny-flag`,
      { method: 'POST', headers, body },
    );
  }

  allowFlag(email: string, body: unknown, headers: Record<string, string>): Promise<void> {
    return apiFetch(
      this.apiBaseUrl,
      `/api/v1/admin/users/${this.pathEmail(email)}/allow-flag`,
      { method: 'POST', headers, body },
    );
  }

  listGroups(headers: Record<string, string>): Promise<Array<Group & { memberCount: number }>> {
    return apiFetch(this.apiBaseUrl, '/api/v1/admin/groups', { headers });
  }

  getGroup(key: string, headers: Record<string, string>): Promise<Group & Record<string, unknown>> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/groups/${encodeURIComponent(key)}`, {
      headers,
    });
  }

  createGroup(body: unknown, headers: Record<string, string>): Promise<Group> {
    return apiFetch(this.apiBaseUrl, '/api/v1/admin/groups', {
      method: 'POST',
      headers,
      body,
    });
  }

  updateGroup(key: string, body: unknown, headers: Record<string, string>): Promise<Group> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/groups/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers,
      body,
    });
  }

  deleteGroup(key: string, headers: Record<string, string>): Promise<void> {
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/groups/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers,
    });
  }

  addMember(key: string, body: unknown, headers: Record<string, string>): Promise<Membership> {
    return apiFetch(
      this.apiBaseUrl,
      `/api/v1/admin/groups/${encodeURIComponent(key)}/members`,
      { method: 'POST', headers, body },
    );
  }

  removeMember(key: string, email: string, headers: Record<string, string>): Promise<void> {
    return apiFetch(
      this.apiBaseUrl,
      `/api/v1/admin/groups/${encodeURIComponent(key)}/members/${this.pathEmail(email)}`,
      { method: 'DELETE', headers },
    );
  }

  listAudit(
    headers: Record<string, string>,
    query: { limit?: number; cursor?: string; accessClient?: string } = {},
  ): Promise<{ items: AuditEntry[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (query.limit !== undefined) {
      params.set('limit', String(query.limit));
    }
    if (query.cursor) {
      params.set('cursor', query.cursor);
    }
    if (query.accessClient) {
      params.set('accessClient', query.accessClient);
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(this.apiBaseUrl, `/api/v1/admin/audit${suffix}`, { headers });
  }
}
