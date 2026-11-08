import { loadPersonas, loadSeed } from '../demo-data/loadSeed.js';
import { FlagKeySchema } from '../domain/schemas.js';
import { ValidationAppError } from '../services/errors.js';
import * as flagService from '../services/flagService.js';
import * as groupService from '../services/groupService.js';
import { checkFlag, getPermissions } from '../services/permissionService.js';
import * as userService from '../services/userService.js';
import { forbidden, mapError, unauthenticated } from './errors.js';
import type {
  CoreRequest,
  CoreResponse,
  CreateRoutesDeps,
  HandlerContext,
  RouteDef,
} from './types.js';

function header(
  headers: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }
  return undefined;
}

function accessClientFrom(req: CoreRequest): string | undefined {
  return header(req.headers, 'x-access-client');
}

export function createRoutes(deps: CreateRoutesDeps): RouteDef[] {
  const personas = loadPersonas();

  const withDeps = (
    auth: RouteDef['auth'],
    handler: (req: CoreRequest, ctx: HandlerContext) => Promise<CoreResponse>,
  ): RouteDef['handler'] => {
    return async (req) => {
      try {
        if (auth === 'none') {
          return await handler(req, {
            repo: deps.repo,
            identity: deps.identity,
            clock: deps.clock,
            config: deps.config,
            actor: null,
          });
        }

        const actor = deps.identity.resolve(req.headers);
        if (!actor) {
          return unauthenticated();
        }
        if (auth === 'admin' && !actor.isAdmin) {
          return forbidden();
        }

        return await handler(req, {
          repo: deps.repo,
          identity: deps.identity,
          clock: deps.clock,
          config: deps.config,
          actor,
        });
      } catch (error) {
        return mapError(error);
      }
    };
  };

  return [
    {
      method: 'GET',
      path: '/health',
      auth: 'none',
      handler: withDeps('none', async (_req, ctx) => ({
        status: 200,
        body: {
          status: 'healthy',
          timestamp: ctx.clock().toISOString(),
          storage: ctx.config.storage,
          database: ctx.config.databaseStatus,
          apiVersion: 'v1',
        },
      })),
    },
    {
      method: 'GET',
      path: '/api/v1/demo/personas',
      auth: 'none',
      handler: withDeps('none', async () => ({
        status: 200,
        body: personas,
      })),
    },
    {
      method: 'POST',
      path: '/api/v1/demo/reset',
      auth: 'none',
      handler: withDeps('none', async (_req, ctx) => {
        const seed = loadSeed(ctx.clock());
        await ctx.repo.resetTo(seed);
        return { status: 200, body: { ok: true, seedVersion: seed.seedVersion } };
      }),
    },
    {
      method: 'GET',
      path: '/api/v1/permissions',
      auth: 'user',
      handler: withDeps('user', async (req, ctx) => ({
        status: 200,
        body: await getPermissions({
          repo: ctx.repo,
          identity: ctx.actor!,
          now: ctx.clock(),
          accessClient: accessClientFrom(req),
          allowedAccessClients: ctx.config.allowedAccessClients,
        }),
      })),
    },
    {
      method: 'GET',
      path: '/api/v1/check',
      auth: 'user',
      handler: withDeps('user', async (req, ctx) => {
        const flagKeyResult = FlagKeySchema.safeParse(req.query.flag ?? '');
        if (!flagKeyResult.success) {
          throw new ValidationAppError('Query param flag is required', flagKeyResult.error.issues);
        }
        return {
          status: 200,
          body: await checkFlag({
            repo: ctx.repo,
            identity: ctx.actor!,
            now: ctx.clock(),
            flagKey: flagKeyResult.data,
            accessClient: accessClientFrom(req),
            allowedAccessClients: ctx.config.allowedAccessClients,
          }),
        };
      }),
    },
    {
      method: 'GET',
      path: '/api/v1/admin/flags',
      auth: 'admin',
      handler: withDeps('admin', async (_req, ctx) => ({
        status: 200,
        body: await flagService.listFlags(ctx.repo),
      })),
    },
    {
      method: 'GET',
      path: '/api/v1/admin/flags/:key',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 200,
        body: await flagService.getFlagDetail(ctx.repo, req.params.key ?? ''),
      })),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/flags',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 201,
        body: await flagService.createFlag({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          body: req.body,
          allowedAccessClients: ctx.config.allowedAccessClients,
        }),
      })),
    },
    {
      method: 'PUT',
      path: '/api/v1/admin/flags/:key',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 200,
        body: await flagService.updateFlag({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
          body: req.body,
          allowedAccessClients: ctx.config.allowedAccessClients,
        }),
      })),
    },
    {
      method: 'DELETE',
      path: '/api/v1/admin/flags/:key',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await flagService.deleteFlag({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/flags/:key/role-access',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await flagService.setFlagRoleAccess({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
          body: req.body,
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/flags/:key/group-access',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await flagService.setFlagGroupAccess({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
          body: req.body,
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/flags/:key/user-access',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await flagService.setFlagUserAccess({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
          body: req.body,
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'GET',
      path: '/api/v1/admin/users',
      auth: 'admin',
      handler: withDeps('admin', async (_req, ctx) => ({
        status: 200,
        body: await userService.listUsers(ctx.repo),
      })),
    },
    {
      method: 'GET',
      path: '/api/v1/admin/users/:email',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 200,
        body: await userService.getUserDetail(ctx.repo, req.params.email ?? ''),
      })),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/users',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 201,
        body: await userService.createUser({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          body: req.body,
        }),
      })),
    },
    {
      method: 'PUT',
      path: '/api/v1/admin/users/:email',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 200,
        body: await userService.updateUser({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          email: req.params.email ?? '',
          body: req.body,
        }),
      })),
    },
    {
      method: 'DELETE',
      path: '/api/v1/admin/users/:email',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await userService.deleteUser({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          email: req.params.email ?? '',
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/users/:email/deny-flag',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await userService.denyFlagForDeveloper({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          email: req.params.email ?? '',
          body: req.body,
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/users/:email/allow-flag',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await userService.allowFlagForDeveloper({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          email: req.params.email ?? '',
          body: req.body,
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'GET',
      path: '/api/v1/admin/groups',
      auth: 'admin',
      handler: withDeps('admin', async (_req, ctx) => ({
        status: 200,
        body: await groupService.listGroups(ctx.repo),
      })),
    },
    {
      method: 'GET',
      path: '/api/v1/admin/groups/:key',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 200,
        body: await groupService.getGroupDetail(ctx.repo, req.params.key ?? ''),
      })),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/groups',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 201,
        body: await groupService.createGroup({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          body: req.body,
        }),
      })),
    },
    {
      method: 'PUT',
      path: '/api/v1/admin/groups/:key',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 200,
        body: await groupService.updateGroup({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
          body: req.body,
        }),
      })),
    },
    {
      method: 'DELETE',
      path: '/api/v1/admin/groups/:key',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await groupService.deleteGroup({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'POST',
      path: '/api/v1/admin/groups/:key/members',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => ({
        status: 201,
        body: await groupService.addGroupMember({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
          body: req.body,
        }),
      })),
    },
    {
      method: 'DELETE',
      path: '/api/v1/admin/groups/:key/members/:email',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        await groupService.removeGroupMember({
          repo: ctx.repo,
          actor: ctx.actor!,
          now: ctx.clock(),
          key: req.params.key ?? '',
          email: req.params.email ?? '',
        });
        return { status: 204, body: null };
      }),
    },
    {
      method: 'GET',
      path: '/api/v1/admin/audit',
      auth: 'admin',
      handler: withDeps('admin', async (req, ctx) => {
        const limit = Number(req.query.limit ?? '50');
        const page = await ctx.repo.listAudit({
          limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50,
          cursor: req.query.cursor || undefined,
        });
        return { status: 200, body: page };
      }),
    },
  ];
}

/** Find a route by method + exact path template (for tests and adapters). */
export function findRoute(
  routes: RouteDef[],
  method: CoreRequest['method'],
  path: string,
): RouteDef | undefined {
  return routes.find((route) => route.method === method && route.path === path);
}
