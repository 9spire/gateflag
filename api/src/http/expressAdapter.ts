import type { CoreRequest, CoreResponse, HttpMethod, RouteDef } from '@gateflag/core';
import type { Express, NextFunction, Request, Response } from 'express';

function toHeaders(req: Request): Record<string, string | undefined> {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key] = Array.isArray(value) ? value[0] : value;
  }
  return headers;
}

function toQuery(req: Request): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      query[key] = value;
    } else if (Array.isArray(value) && typeof value[0] === 'string') {
      query[key] = value[0];
    }
  }
  return query;
}

function toParams(req: Request): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.params)) {
    if (typeof value === 'string') {
      params[key] = value;
    }
  }
  return params;
}

async function sendCoreResponse(res: Response, response: CoreResponse): Promise<void> {
  if (response.status === 204) {
    res.status(204).end();
    return;
  }
  res.status(response.status).json(response.body);
}

export function registerRoutes(app: Express, routes: RouteDef[]): void {
  for (const route of routes) {
    const method = route.method.toLowerCase() as Lowercase<HttpMethod>;
    app[method](route.path, (req: Request, res: Response, next: NextFunction) => {
      const coreReq: CoreRequest = {
        method: route.method,
        params: toParams(req),
        query: toQuery(req),
        headers: toHeaders(req),
        body: req.body,
      };

      void route
        .handler(coreReq, {
          repo: undefined as never,
          identity: undefined as never,
          clock: undefined as never,
          config: undefined as never,
          actor: null,
        })
        .then((response) => sendCoreResponse(res, response))
        .catch(next);
    });
  }
}
