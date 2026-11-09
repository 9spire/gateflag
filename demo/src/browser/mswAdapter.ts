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
import { setupWorker, type SetupWorker } from 'msw/browser';
import { clearSnapshot, loadSnapshot, saveSnapshot } from './persistence.js';

function matchRoute(
  routes: RouteDef[],
  method: HttpMethod,
  pathname: string,
): { route: RouteDef; params: Record<string, string> } | null {
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

export async function startBrowserApi(): Promise<{
  worker: SetupWorker;
  repo: InMemoryRepository;
  seedVersion: number;
}> {
  const seed = loadSeed(new Date());
  const seedVersion = seed.seedVersion;
  const repo = new InMemoryRepository();
  const snapshot = loadSnapshot(seedVersion);
  await repo.resetTo(snapshot ?? seed);

  const routes = createRoutes({
    repo,
    identity: createPersonaIdentityResolver(loadPersonas()),
    clock: () => new Date(),
    config: {
      allowedAccessClients: DEFAULT_ALLOWED_ACCESS_CLIENTS,
      storage: 'memory',
      databaseStatus: 'available',
    },
  });

  const persist = () => saveSnapshot(repo, seedVersion);

  const handler = async ({ request }: { request: Request }) => {
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
    if (method !== 'GET') {
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
      clock: () => new Date(),
      config: {
        allowedAccessClients: DEFAULT_ALLOWED_ACCESS_CLIENTS,
        storage: 'memory',
        databaseStatus: 'available',
      },
      actor: null,
    });

    if (method === 'POST' && url.pathname === '/api/v1/demo/reset') {
      clearSnapshot(seedVersion);
    } else if (method !== 'GET') {
      persist();
    }

    if (response.status === 204) {
      return new HttpResponse(null, { status: 204 });
    }
    return HttpResponse.json(response.body as Record<string, unknown>, {
      status: response.status,
    });
  };

  const worker = setupWorker(
    http.get('/health', handler),
    http.get('/api/v1/*', handler),
    http.post('/api/v1/*', handler),
    http.put('/api/v1/*', handler),
    http.delete('/api/v1/*', handler),
  );

  await worker.start({
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
    onUnhandledRequest: 'bypass',
  });

  return { worker, repo, seedVersion };
}
