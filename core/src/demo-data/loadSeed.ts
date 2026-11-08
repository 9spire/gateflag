import { z } from 'zod';
import { addDaysIso } from '../domain/evaluator.js';
import type {
  DeveloperDeny,
  Flag,
  Group,
  GroupGrant,
  Membership,
  RoleGrant,
  SeedSnapshot,
  User,
  UserGrant,
} from '../domain/types.js';
import {
  DescriptionSchema,
  EmailSchema,
  FlagKeySchema,
  GroupKeySchema,
  RoleSchema,
  UniversalStateSchema,
  accessClientsSchema,
  DefaultTtlDaysSchema,
} from '../domain/schemas.js';
import rawSeed from './seed.json' with { type: 'json' };
import rawPersonas from './personas.json' with { type: 'json' };

const RelativeExpirySchema = z.union([z.null(), z.number().int()]);

const SeedFileSchema = z.object({
  seedVersion: z.number().int().positive(),
  users: z.array(
    z.object({
      email: EmailSchema,
      role: RoleSchema,
    }),
  ),
  groups: z.array(
    z.object({
      key: GroupKeySchema,
      description: DescriptionSchema,
      defaultTtlDays: DefaultTtlDaysSchema,
    }),
  ),
  memberships: z.array(
    z.object({
      email: EmailSchema,
      groupKey: GroupKeySchema,
      expiresInDays: RelativeExpirySchema,
    }),
  ),
  flags: z.array(
    z.object({
      key: FlagKeySchema,
      description: DescriptionSchema,
      universalState: UniversalStateSchema,
      accessClients: accessClientsSchema(),
    }),
  ),
  roleGrants: z.array(
    z.object({
      flagKey: FlagKeySchema,
      role: z.literal('access'),
    }),
  ),
  groupGrants: z.array(
    z.object({
      flagKey: FlagKeySchema,
      groupKey: GroupKeySchema,
      expiresInDays: RelativeExpirySchema,
    }),
  ),
  userGrants: z.array(
    z.object({
      flagKey: FlagKeySchema,
      email: EmailSchema,
      expiresInDays: RelativeExpirySchema,
    }),
  ),
  developerDenies: z.array(
    z.object({
      flagKey: FlagKeySchema,
      email: EmailSchema,
      createdBy: EmailSchema,
    }),
  ),
});

const PersonasFileSchema = z.object({
  adminIdpGroup: z.string().min(1),
  personas: z.array(
    z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
      email: EmailSchema,
      idpGroups: z.array(z.string()),
      blurb: z.string(),
    }),
  ),
});

export type Persona = z.infer<typeof PersonasFileSchema>['personas'][number];
export type PersonasFile = z.infer<typeof PersonasFileSchema>;

function relativeToAbsolute(now: Date, expiresInDays: number | null): string | null {
  if (expiresInDays === null) {
    return null;
  }
  return addDaysIso(now, expiresInDays);
}

export function loadPersonas(data: unknown = rawPersonas): PersonasFile {
  return PersonasFileSchema.parse(data);
}

export function loadSeed(now: Date, data: unknown = rawSeed): SeedSnapshot {
  const parsed = SeedFileSchema.parse(data);
  const at = now.toISOString();

  const users: User[] = parsed.users.map((user) => ({
    email: user.email,
    role: user.role,
    isAdmin: false,
    createdAt: at,
    updatedAt: at,
    version: 1,
  }));

  const groups: Group[] = parsed.groups.map((group) => ({
    key: group.key,
    description: group.description,
    defaultTtlDays: group.defaultTtlDays,
    createdAt: at,
    updatedAt: at,
    version: 1,
  }));

  const flags: Flag[] = parsed.flags.map((flag) => ({
    key: flag.key,
    description: flag.description,
    universalState: flag.universalState,
    accessClients: flag.accessClients,
    createdAt: at,
    updatedAt: at,
    version: 1,
  }));

  const memberships: Membership[] = parsed.memberships.map((membership) => ({
    email: membership.email,
    groupKey: membership.groupKey,
    expiresAt: relativeToAbsolute(now, membership.expiresInDays),
    addedAt: at,
    addedBy: 'seed',
  }));

  const roleGrants: RoleGrant[] = parsed.roleGrants.map((grant) => ({
    flagKey: grant.flagKey,
    role: grant.role,
    createdAt: at,
  }));

  const groupGrants: GroupGrant[] = parsed.groupGrants.map((grant) => ({
    flagKey: grant.flagKey,
    groupKey: grant.groupKey,
    expiresAt: relativeToAbsolute(now, grant.expiresInDays),
    createdAt: at,
  }));

  const userGrants: UserGrant[] = parsed.userGrants.map((grant) => ({
    flagKey: grant.flagKey,
    email: grant.email,
    expiresAt: relativeToAbsolute(now, grant.expiresInDays),
    createdAt: at,
  }));

  const developerDenies: DeveloperDeny[] = parsed.developerDenies.map((deny) => ({
    flagKey: deny.flagKey,
    email: deny.email,
    createdBy: deny.createdBy,
    createdAt: at,
  }));

  return {
    seedVersion: parsed.seedVersion,
    users,
    groups,
    memberships,
    flags,
    roleGrants,
    groupGrants,
    userGrants,
    developerDenies,
  };
}
