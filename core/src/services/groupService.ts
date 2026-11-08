import {
  DefaultTtlDaysSchema,
  DescriptionSchema,
  EmailSchema,
  GroupKeySchema,
} from '../domain/schemas.js';
import { addDaysIso } from '../domain/evaluator.js';
import type { Group, Membership } from '../domain/types.js';
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

export async function listGroups(repo: Repository) {
  const groups = await repo.listGroups();
  const withCounts = await Promise.all(
    groups.map(async (group) => {
      const detail = await repo.getGroupDetail(group.key);
      return { ...group, memberCount: detail.members.length };
    }),
  );
  return withCounts;
}

export async function getGroupDetail(repo: Repository, key: string) {
  const normalized = parseOrThrow(GroupKeySchema, key, 'Invalid group key');
  const detail = await repo.getGroupDetail(normalized);
  return {
    ...detail.group,
    members: detail.members,
    flagGrants: detail.flagGrants,
  };
}

export async function createGroup(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  body: unknown;
}): Promise<Group> {
  const body = parseOrThrow(
    z.object({
      key: GroupKeySchema,
      description: DescriptionSchema,
      defaultTtlDays: DefaultTtlDaysSchema,
    }),
    options.body,
    'Invalid group payload',
  );

  const at = options.now.toISOString();
  const group = await options.repo.createGroup({
    key: body.key,
    description: body.description,
    defaultTtlDays: body.defaultTtlDays,
    createdAt: at,
    updatedAt: at,
    version: 1,
  });

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'group.create',
    entityType: 'group',
    entityKey: group.key,
    summary: `Created group (${group.defaultTtlDays === null ? 'evergreen' : `${group.defaultTtlDays}d`})`,
    now: options.now,
    id: createAuditId(options.now, group.key),
  });

  return group;
}

export async function updateGroup(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
  body: unknown;
}): Promise<Group> {
  const key = parseOrThrow(GroupKeySchema, options.key, 'Invalid group key');
  const body = parseOrThrow(
    z.object({
      description: DescriptionSchema.optional(),
      defaultTtlDays: DefaultTtlDaysSchema.optional(),
      version: z.number().int().positive(),
    }),
    options.body,
    'Invalid group update payload',
  );

  const updated = await options.repo.updateGroup(
    key,
    {
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.defaultTtlDays !== undefined ? { defaultTtlDays: body.defaultTtlDays } : {}),
      updatedAt: options.now.toISOString(),
    },
    body.version,
  );

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'group.update',
    entityType: 'group',
    entityKey: key,
    summary: 'Updated group',
    now: options.now,
    id: createAuditId(options.now, `${key}-update`),
  });

  return updated;
}

export async function deleteGroup(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
}): Promise<void> {
  const key = parseOrThrow(GroupKeySchema, options.key, 'Invalid group key');
  await options.repo.deleteGroupCascade(key);
  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'group.delete',
    entityType: 'group',
    entityKey: key,
    summary: 'Deleted group',
    now: options.now,
    id: createAuditId(options.now, `${key}-delete`),
  });
}

export async function addGroupMember(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
  body: unknown;
}): Promise<Membership> {
  const groupKey = parseOrThrow(GroupKeySchema, options.key, 'Invalid group key');
  const body = parseOrThrow(
    z.object({
      email: EmailSchema,
      expiresAt: z.string().datetime().nullable().optional(),
    }),
    options.body,
    'Invalid membership payload',
  );

  const group = await options.repo.getGroup(groupKey);
  if (!group) {
    throw new NotFoundError('group', groupKey);
  }

  let user = await options.repo.getUser(body.email);
  if (!user) {
    user = await options.repo.createUser({
      email: body.email,
      role: 'none',
      isAdmin: false,
      createdAt: options.now.toISOString(),
      updatedAt: options.now.toISOString(),
      version: 1,
    });
  }

  if (user.role === 'developer') {
    throw new BusinessRuleError(
      'Developers have automatic access to all GATED flags and cannot be added to groups.',
    );
  }

  let expiresAt: string | null;
  if (body.expiresAt !== undefined) {
    expiresAt = body.expiresAt;
    if (expiresAt !== null) {
      const expiry = new Date(expiresAt);
      if (expiry.getTime() <= options.now.getTime()) {
        throw new ValidationAppError('Membership expiry must be after now');
      }
      if (group.defaultTtlDays !== null) {
        const max = new Date(addDaysIso(options.now, group.defaultTtlDays));
        if (expiry.getTime() > max.getTime()) {
          throw new ValidationAppError(
            `Membership expiry cannot exceed the group default TTL of ${group.defaultTtlDays} days`,
          );
        }
      }
    }
  } else {
    expiresAt =
      group.defaultTtlDays === null ? null : addDaysIso(options.now, group.defaultTtlDays);
  }

  const membership: Membership = {
    email: body.email,
    groupKey,
    expiresAt,
    addedAt: options.now.toISOString(),
    addedBy: options.actor.email,
  };
  await options.repo.setMembership(groupKey, body.email, membership);

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'group.add_member',
    entityType: 'group',
    entityKey: groupKey,
    summary: `Added member ${body.email}`,
    now: options.now,
    id: createAuditId(options.now, `${groupKey}-add-${body.email}`),
  });

  return membership;
}

export async function removeGroupMember(options: {
  repo: Repository;
  actor: ResolvedIdentity;
  now: Date;
  key: string;
  email: string;
}): Promise<void> {
  const groupKey = parseOrThrow(GroupKeySchema, options.key, 'Invalid group key');
  const email = parseOrThrow(EmailSchema, decodeURIComponent(options.email), 'Invalid email');

  if (!(await options.repo.getGroup(groupKey))) {
    throw new NotFoundError('group', groupKey);
  }

  await options.repo.setMembership(groupKey, email, null);

  await writeAudit(options.repo, {
    actorEmail: options.actor.email,
    action: 'group.remove_member',
    entityType: 'group',
    entityKey: groupKey,
    summary: `Removed member ${email}`,
    now: options.now,
    id: createAuditId(options.now, `${groupKey}-remove-${email}`),
  });
}
