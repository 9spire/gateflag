import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ALLOWED_ACCESS_CLIENTS } from '../domain/schemas.js';
import { loadPersonas, loadSeed } from '../demo-data/loadSeed.js';
import { createPersonaIdentityResolver } from '../identity/personaResolver.js';
import { InMemoryRepository } from '../repository/InMemoryRepository.js';
import { createRoutes, findRoute } from './createRoutes.js';
import type { CoreRequest, CoreResponse, RouteDef } from './types.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('route handlers', () => {
  let routes: RouteDef[];
  let repo: InMemoryRepository;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    await repo.resetTo(loadSeed(NOW));
    routes = createRoutes({
      repo,
      identity: createPersonaIdentityResolver(loadPersonas()),
      clock: () => NOW,
      config: {
        allowedAccessClients: DEFAULT_ALLOWED_ACCESS_CLIENTS,
        storage: 'memory',
        databaseStatus: 'available',
      },
    });
  });

  async function invoke(
    method: CoreRequest['method'],
    path: string,
    options: Partial<CoreRequest> = {},
  ): Promise<CoreResponse> {
    const route = findRoute(routes, method, path);
    if (!route) {
      throw new Error(`Missing route ${method} ${path}`);
    }
    return route.handler(
      {
        method,
        params: options.params ?? {},
        query: options.query ?? {},
        headers: options.headers ?? {},
        body: options.body ?? null,
      },
      {
        repo,
        identity: createPersonaIdentityResolver(loadPersonas()),
        clock: () => NOW,
        config: {
          allowedAccessClients: DEFAULT_ALLOWED_ACCESS_CLIENTS,
          storage: 'memory',
          databaseStatus: 'available',
        },
        actor: null,
      },
    );
  }

  it('returns 401 without X-Demo-User on permissions', async () => {
    const res = await invoke('GET', '/api/v1/permissions');
    expect(res.status).toBe(401);
  });

  it('returns 403 when a non-admin hits admin routes', async () => {
    const res = await invoke('GET', '/api/v1/admin/flags', {
      headers: { 'X-Demo-User': 'pat-beta' },
    });
    expect(res.status).toBe(403);
  });

  it('returns 409 on version conflict', async () => {
    const res = await invoke('PUT', '/api/v1/admin/flags/:key', {
      headers: { 'X-Demo-User': 'alex-admin' },
      params: { key: 'DARK_MODE' },
      body: { description: 'Nope', version: 999 },
    });
    expect(res.status).toBe(409);
    expect((res.body as { error: { code: string } }).error.code).toBe('VERSION_CONFLICT');
  });

  it('returns 422 when adding a developer to a group', async () => {
    const res = await invoke('POST', '/api/v1/admin/groups/:key/members', {
      headers: { 'X-Demo-User': 'alex-admin' },
      params: { key: 'beta-testers' },
      body: { email: 'dana@example.com' },
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: { code: string } }).error.code).toBe('BUSINESS_RULE');
  });

  it('returns Sam permissions for storefront', async () => {
    const res = await invoke('GET', '/api/v1/permissions', {
      headers: { 'X-Demo-User': 'sam-none', 'X-Access-Client': 'storefront' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { flags: string[] }).flags).toEqual(['DARK_MODE']);
  });

  it('releases a flag for everyone', async () => {
    const flag = await repo.getFlag('PRODUCT_RECOMMENDATIONS');
    const update = await invoke('PUT', '/api/v1/admin/flags/:key', {
      headers: { 'X-Demo-User': 'alex-admin' },
      params: { key: 'PRODUCT_RECOMMENDATIONS' },
      body: { universalState: 'RELEASED', version: flag!.version },
    });
    expect(update.status).toBe(200);

    const sam = await invoke('GET', '/api/v1/permissions', {
      headers: { 'X-Demo-User': 'sam-none', 'X-Access-Client': 'storefront' },
    });
    expect((sam.body as { flags: string[] }).flags).toContain('PRODUCT_RECOMMENDATIONS');
  });
});
