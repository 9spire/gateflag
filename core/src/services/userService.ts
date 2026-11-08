import { EmailSchema, FlagKeySchema, RoleSchema } from '../domain/schemas.js';
import type { User } from '../domain/types.js';
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

export async function listUsers(repo: Repository): Promise<User[]> {
  return repo.listUsers();
}

export async function getUserDetail(repo: Repository, email: string) {
  const normalized = parseOrThrow(EmailSchema, decodeURIComponent(email), 'Invalid email');
  const bundle = await repo.getUserBundle(normalized);
  const flags = await repo.listFlags();
  const gatedFlagsWithAccessRole: string[] = [];
  for (const flag of flags) {
    if (flag.universalState !== 'GATED') {
      continue;
    }
    const access = await repo.getFlagAccess(flag.key);
    if (access.roleGrants.some((grant) => grant.role === 'access')) {
      gatedFlagsWithAccessRole.push(flag.key);
    }
  }
  gatedFlagsWithAccessRole.sort((a, b) => a.localeCompare(b));
  return {
    ...bundle.user,
    memberships: bundle.memberships,
    userGrants: bundle.userGrants,
    developerDenies: bundle.developerDenies,
    gatedFlagsWithAccessRole,
  };
}

export async function createUser(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  body: unknown;
}): Promise<User> {
  const body = parseOrThrow(
    z.object({
      email: EmailSchema,
      role: RoleSchema,
    }),
    options.body,
    'Invalid user payload',
  );

  const at = options.now.toISOString();
  const user = await options.repo.createUser({
    email: body.email,
    role: body.role,
    isAdmin: false,
    createdAt: at,
    updatedAt: at,
    version: 1,
  });

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'user.create',
    entityType: 'user',
    entityKey: user.email,
    summary: `Created user (${user.role})`,
    now: options.now,
    id: createAuditId(options.now, user.email),
  });

  return user;
}

export async function updateUser(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  email: string;
  body: unknown;
}): Promise<User> {
  const email = parseOrThrow(EmailSchema, decodeURIComponent(options.email), 'Invalid email');
  const body = parseOrThrow(
    z.object({
      role: RoleSchema,
      version: z.number().int().positive(),
    }),
    options.body,
    'Invalid user update payload',
  );

  const existing = await options.repo.getUser(email);
  if (!existing) {
    throw new NotFoundError('user', email);
  }

  const updated = await options.repo.updateUser(
    email,
    { role: body.role, updatedAt: options.now.toISOString() },
    body.version,
  );

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'user.update',
    entityType: 'user',
    entityKey: email,
    summary:
      existing.role === body.role
        ? 'Updated user'
        : `Role ${existing.role} → ${body.role}`,
    now: options.now,
    id: createAuditId(options.now, `${email}-update`),
  });

  return updated;
}

export async function deleteUser(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  email: string;
}): Promise<void> {
  const email = parseOrThrow(EmailSchema, decodeURIComponent(options.email), 'Invalid email');
  if (email === options.actor.email) {
    throw new BusinessRuleError('Admins cannot delete their own user');
  }
  await options.repo.deleteUserCascade(email);
  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'user.delete',
    entityType: 'user',
    entityKey: email,
    summary: 'Deleted user',
    now: options.now,
    id: createAuditId(options.now, `${email}-delete`),
  });
}

export async function denyFlagForDeveloper(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  email: string;
  body: unknown;
}): Promise<void> {
  const email = parseOrThrow(EmailSchema, decodeURIComponent(options.email), 'Invalid email');
  const body = parseOrThrow(
    z.object({ flagKey: FlagKeySchema }),
    options.body,
    'Invalid deny-flag payload',
  );

  const user = await options.repo.getUser(email);
  if (!user) {
    throw new NotFoundError('user', email);
  }
  if (user.role !== 'developer') {
    throw new BusinessRuleError('Developer denies apply only to users with the developer role');
  }
  const flag = await options.repo.getFlag(body.flagKey);
  if (!flag) {
    throw new NotFoundError('flag', body.flagKey);
  }
  if (flag.universalState !== 'GATED') {
    throw new BusinessRuleError('Developer denies apply only to GATED flags');
  }

  await options.repo.setDeveloperDeny(email, body.flagKey, {
    flagKey: body.flagKey,
    email,
    createdBy: options.actor.email,
    createdAt: options.now.toISOString(),
  });

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'user.deny_flag',
    entityType: 'user',
    entityKey: email,
    summary: `Denied ${body.flagKey}`,
    now: options.now,
    id: createAuditId(options.now, `${email}-deny-${body.flagKey}`),
  });
}

export async function allowFlagForDeveloper(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  email: string;
  body: unknown;
}): Promise<void> {
  const email = parseOrThrow(EmailSchema, decodeURIComponent(options.email), 'Invalid email');
  const body = parseOrThrow(
    z.object({ flagKey: FlagKeySchema }),
    options.body,
    'Invalid allow-flag payload',
  );

  if (!(await options.repo.getUser(email))) {
    throw new NotFoundError('user', email);
  }

  await options.repo.setDeveloperDeny(email, body.flagKey, null);

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'user.allow_flag',
    entityType: 'user',
    entityKey: email,
    summary: `Allowed ${body.flagKey}`,
    now: options.now,
    id: createAuditId(options.now, `${email}-allow-${body.flagKey}`),
  });
}
