import {
  createPersonaIdentityResolver,
  createRoutes,
  DEFAULT_ALLOWED_ACCESS_CLIENTS,
  InMemoryRepository,
  loadPersonas,
  loadSeed,
  type CoreRequest,
  type HttpMethod,
  type RouteDef,
} from '@gateflag/core';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

function matchRoute(routes: RouteDef[], method: HttpMethod, pathname: string): {
  route: RouteDef;
  params: Record<string, string>;
} | null {
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }
    const templateParts = route.path.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    if (templateParts.length !== pathParts.length) {
      continue;
    }
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < templateParts.length; i += 1) {
      const part = templateParts[i]!;
      const value = pathParts[i]!;
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(value);
      } else if (part !== value) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return { route, params };
    }
  }
  return null;
}

export async function createTestServer(now = new Date('2026-01-01T00:00:00.000Z')) {
  const repo = new InMemoryRepository();
  await repo.resetTo(loadSeed(now));
  const routes = createRoutes({
    repo,
    identity: createPersonaIdentityResolver(loadPersonas()),
    clock: () => now,
    config: {
      allowedAccessClients: DEFAULT_ALLOWED_ACCESS_CLIENTS,
      storage: 'memory',
      databaseStatus: 'available',
    },
  });

  const handler = async ({
    request,
  }: {
    request: Request;
  }) => {
    const url = new URL(request.url);
    const method = request.method.toUpperCase() as HttpMethod;
    const matched = matchRoute(routes, method, url.pathname);
    if (!matched) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Route not found', details: [] } },
        { status: 404 },
      );
    }

    const headers: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    let body: unknown = null;
    if (method !== 'GET' && method !== 'DELETE') {
      const text = await request.text();
      body = text ? JSON.parse(text) : null;
    }

    const coreReq: CoreRequest = {
      method,
      params: matched.params,
      query,
      headers,
      body,
    };

    const response = await matched.route.handler(coreReq, {
      repo,
      identity: createPersonaIdentityResolver(loadPersonas()),
      clock: () => now,
      config: {
        allowedAccessClients: DEFAULT_ALLOWED_ACCESS_CLIENTS,
        storage: 'memory',
        databaseStatus: 'available',
      },
      actor: null,
    });

    if (response.status === 204) {
      return new HttpResponse(null, { status: 204 });
    }
    return HttpResponse.json(response.body, { status: response.status });
  };

  const server = setupServer(
    http.get(/\/api\/v1\/.*/, handler),
    http.post(/\/api\/v1\/.*/, handler),
    http.put(/\/api\/v1\/.*/, handler),
    http.delete(/\/api\/v1\/.*/, handler),
    http.get(/\/health$/, handler),
  );

  return { server, repo, routes };
}
