import type { IdentityResolver, ResolvedIdentity } from '../identity/types.js';
import type { Repository } from '../repository/Repository.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface CoreRequest {
  method: HttpMethod;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string | undefined>;
  body: unknown;
}

export interface CoreResponse {
  status: number;
  body: unknown;
}

export interface CoreConfig {
  allowedAccessClients: readonly string[];
  storage: 'memory' | 'dynamo';
  databaseStatus: 'available' | 'unavailable';
}

export interface HandlerContext {
  repo: Repository;
  identity: IdentityResolver;
  clock: () => Date;
  config: CoreConfig;
  actor: ResolvedIdentity | null;
}

export interface RouteDef {
  method: HttpMethod;
  path: string;
  auth: 'none' | 'user' | 'admin';
  handler: (req: CoreRequest, ctx: HandlerContext) => Promise<CoreResponse>;
}

export interface CreateRoutesDeps {
  repo: Repository;
  identity: IdentityResolver;
  clock: () => Date;
  config: CoreConfig;
}
