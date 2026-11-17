import {
  CreateUniversalStateSchema,
  DescriptionSchema,
  FlagKeySchema,
  GroupKeySchema,
  EmailSchema,
  UniversalStateSchema,
  accessClientsSchema,
} from '../domain/schemas.js';
import type { Flag, GroupGrant, RoleGrant, UserGrant } from '../domain/types.js';
import type { ResolvedIdentity } from '../identity/types.js';
import { NotFoundError } from '../repository/errors.js';
import type { Repository } from '../repository/Repository.js';
import { createAuditId, writeAudit } from './audit.js';
import { BusinessRuleError, ValidationAppError } from './errors.js';
import { z } from 'zod';

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationAppError(message, result.error.issues);
  }
  return result.data;
}

export async function listFlags(repo: Repository): Promise<Flag[]> {
  return repo.listFlags();
}

export async function getFlagDetail(repo: Repository, key: string) {
  const flag = await repo.getFlag(key);
  if (!flag) {
    throw new NotFoundError('flag', key);
  }
  const access = await repo.getFlagAccess(key);
  return { ...flag, ...access };
}

export async function createFlag(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  body: unknown;
  allowedAccessClients: readonly string[];
}): Promise<Flag> {
  const body = parseOrThrow(
    z.object({
      key: FlagKeySchema,
      description: DescriptionSchema,
      universalState: CreateUniversalStateSchema,
      accessClients: accessClientsSchema(options.allowedAccessClients),
    }),
    options.body,
    'Invalid flag payload',
  );

  const at = options.now.toISOString();
  const flag = await options.repo.createFlag({
    key: body.key,
    description: body.description,
    universalState: body.universalState,
    accessClients: body.accessClients,
    createdAt: at,
    updatedAt: at,
    version: 1,
  });

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'flag.create',
    entityType: 'flag',
    entityKey: flag.key,
    summary: `Created flag (${flag.universalState})`,
    now: options.now,
    id: createAuditId(options.now, flag.key),
    accessClients: flag.accessClients,
  });

  return flag;
}

export async function updateFlag(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
  body: unknown;
  allowedAccessClients: readonly string[];
}): Promise<Flag> {
  const body = parseOrThrow(
    z.object({
      description: DescriptionSchema.optional(),
      universalState: UniversalStateSchema.optional(),
      accessClients: accessClientsSchema(options.allowedAccessClients).optional(),
      version: z.number().int().positive(),
    }),
    options.body,
    'Invalid flag update payload',
  );

  const existing = await options.repo.getFlag(options.key);
  if (!existing) {
    throw new NotFoundError('flag', options.key);
  }

  const updated = await options.repo.updateFlag(
    options.key,
    {
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.universalState !== undefined ? { universalState: body.universalState } : {}),
      ...(body.accessClients !== undefined ? { accessClients: body.accessClients } : {}),
      updatedAt: options.now.toISOString(),
    },
    body.version,
  );

  const summaryParts: string[] = [];
  if (body.universalState !== undefined && body.universalState !== existing.universalState) {
    summaryParts.push(`State ${existing.universalState} → ${body.universalState}`);
  }
  if (body.description !== undefined && body.description !== existing.description) {
    summaryParts.push('Updated description');
  }
  if (body.accessClients !== undefined) {
    summaryParts.push('Updated access clients');
  }

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'flag.update',
    entityType: 'flag',
    entityKey: options.key,
    summary: summaryParts.join('; ') || 'Updated flag',
    now: options.now,
    id: createAuditId(options.now, `${options.key}-update`),
    accessClients: updated.accessClients,
  });

  return updated;
}

export async function deleteFlag(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
}): Promise<void> {
  const existing = await options.repo.getFlag(options.key);
  await options.repo.deleteFlagCascade(options.key);
  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'flag.delete',
    entityType: 'flag',
    entityKey: options.key,
    summary: 'Deleted flag',
    now: options.now,
    id: createAuditId(options.now, `${options.key}-delete`),
    accessClients: existing?.accessClients ?? [],
  });
}

export async function setFlagRoleAccess(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
  body: unknown;
}): Promise<void> {
  const body = parseOrThrow(
    z.object({
      role: z.literal('access'),
      hasAccess: z.boolean(),
    }),
    options.body,
    'Invalid role-access payload',
  );

  const flag = await options.repo.getFlag(options.key);
  if (!flag) {
    throw new NotFoundError('flag', options.key);
  }

  const grant: RoleGrant | null = body.hasAccess
    ? { flagKey: options.key, role: 'access', createdAt: options.now.toISOString() }
    : null;
  await options.repo.setRoleGrant(options.key, grant);

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: body.hasAccess ? 'flag.role_grant' : 'flag.role_revoke',
    entityType: 'flag',
    entityKey: options.key,
    summary: body.hasAccess ? 'Granted access role' : 'Revoked access role',
    now: options.now,
    id: createAuditId(options.now, `${options.key}-role`),
    accessClients: flag.accessClients,
  });
}

export async function setFlagGroupAccess(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
  body: unknown;
}): Promise<void> {
  const body = parseOrThrow(
    z.object({
      groupKey: GroupKeySchema,
      hasAccess: z.boolean(),
      expiresAt: z.string().datetime().nullable().optional(),
    }),
    options.body,
    'Invalid group-access payload',
  );

  const flag = await options.repo.getFlag(options.key);
  if (!flag) {
    throw new NotFoundError('flag', options.key);
  }
  if (!(await options.repo.getGroup(body.groupKey))) {
    throw new NotFoundError('group', body.groupKey);
  }

  const grant: GroupGrant | null = body.hasAccess
    ? {
        flagKey: options.key,
        groupKey: body.groupKey,
        expiresAt: body.expiresAt ?? null,
        createdAt: options.now.toISOString(),
      }
    : null;
  await options.repo.setGroupGrant(options.key, body.groupKey, grant);

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: body.hasAccess ? 'flag.group_grant' : 'flag.group_revoke',
    entityType: 'flag',
    entityKey: options.key,
    summary: body.hasAccess
      ? `Granted group ${body.groupKey}`
      : `Revoked group ${body.groupKey}`,
    now: options.now,
    id: createAuditId(options.now, `${options.key}-group-${body.groupKey}`),
    accessClients: flag.accessClients,
  });
}

export async function setFlagUserAccess(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
  body: unknown;
}): Promise<void> {
  const body = parseOrThrow(
    z.object({
      email: EmailSchema,
      hasAccess: z.boolean(),
      expiresAt: z.string().datetime().nullable().optional(),
    }),
    options.body,
    'Invalid user-access payload',
  );

  const flag = await options.repo.getFlag(options.key);
  if (!flag) {
    throw new NotFoundError('flag', options.key);
  }

  let user = await options.repo.getUser(body.email);
  if (!user && body.hasAccess) {
    user = await options.repo.createUser({
      email: body.email,
      role: 'none',
      isAdmin: false,
      createdAt: options.now.toISOString(),
      updatedAt: options.now.toISOString(),
      version: 1,
    });
  }
  if (!user) {
    throw new NotFoundError('user', body.email);
  }
  if (user.role === 'developer' && body.hasAccess) {
    throw new BusinessRuleError(
      'Developers have automatic access to all GATED flags; use deny/allow instead of user grants.',
    );
  }

  const grant: UserGrant | null = body.hasAccess
    ? {
        flagKey: options.key,
        email: body.email,
        expiresAt: body.expiresAt ?? null,
        createdAt: options.now.toISOString(),
      }
    : null;
  await options.repo.setUserGrant(options.key, body.email, grant);

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: body.hasAccess ? 'flag.user_grant' : 'flag.user_revoke',
    entityType: 'flag',
    entityKey: options.key,
    summary: body.hasAccess
      ? `Granted user ${body.email}`
      : `Revoked user ${body.email}`,
    now: options.now,
    id: createAuditId(options.now, `${options.key}-user-${body.email}`),
    accessClients: flag.accessClients,
  });
}
