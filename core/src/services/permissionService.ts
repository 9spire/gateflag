import { evaluateFlag, filterFlagsByAccessClient } from '../domain/evaluator.js';
import type { FlagEvaluation } from '../domain/permissions.js';
import type { Role } from '../domain/types.js';
import type { ResolvedIdentity } from '../identity/types.js';
import type { Repository } from '../repository/Repository.js';
import { ValidationAppError } from './errors.js';

export interface PermissionsResponse {
  email: string;
  role: Role;
  isAdmin: boolean;
  isAdminManagedByIdp: true;
  flags: string[];
  evaluations: Record<string, FlagEvaluation>;
  evaluatedAt: string;
}

export async function getPermissions(options: {
  repo: Repository;
  identity: ResolvedIdentity;
  now: Date;
  accessClient: string | undefined;
  allowedAccessClients: readonly string[];
}): Promise<PermissionsResponse> {
  const { repo, identity, now, accessClient, allowedAccessClients } = options;

  if (accessClient !== undefined && accessClient !== '') {
    if (!allowedAccessClients.includes(accessClient)) {
      throw new ValidationAppError(`Access client "${accessClient}" is not allowed`);
    }
  }

  let user = await repo.getUser(identity.email);
  if (!user) {
    user = await repo.createUser({
      email: identity.email,
      role: 'none',
      isAdmin: identity.isAdmin,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      version: 1,
    });
  } else if (user.isAdmin !== identity.isAdmin) {
    user = await repo.updateUser(
      identity.email,
      { isAdmin: identity.isAdmin, updatedAt: now.toISOString() },
      user.version,
    );
  }

  const bundle = await repo.getUserBundle(identity.email);
  const flags = filterFlagsByAccessClient(await repo.listFlags(), accessClient || undefined);
  const groups = await repo.listGroups();
  const existingGroupKeys = new Set(groups.map((group) => group.key));

  const evaluations: Record<string, FlagEvaluation> = {};
  const granted: string[] = [];

  for (const flag of flags) {
    const access = await repo.getFlagAccess(flag.key);
    const userGrant =
      bundle.userGrants.find((grant) => grant.flagKey === flag.key) ?? null;
    const developerDeny = bundle.developerDenies.some((deny) => deny.flagKey === flag.key);
    const result = evaluateFlag(
      flag,
      {
        role: user.role,
        memberships: bundle.memberships.map((membership) => ({
          groupKey: membership.groupKey,
          expiresAt: membership.expiresAt,
        })),
        existingGroupKeys,
        userGrant,
        developerDeny,
        hasAccessRoleGrant: access.roleGrants.some((grant) => grant.role === 'access'),
        groupGrants: access.groupGrants.map((grant) => ({
          groupKey: grant.groupKey,
          expiresAt: grant.expiresAt,
        })),
      },
      now,
    );
    evaluations[flag.key] = {
      ...result,
      universalState: flag.universalState,
    };
    if (result.granted) {
      granted.push(flag.key);
    }
  }

  granted.sort((a, b) => a.localeCompare(b));

  return {
    email: identity.email,
    role: user.role,
    isAdmin: identity.isAdmin,
    isAdminManagedByIdp: true,
    flags: granted,
    evaluations,
    evaluatedAt: now.toISOString(),
  };
}

export async function checkFlag(options: {
  repo: Repository;
  identity: ResolvedIdentity;
  now: Date;
  flagKey: string;
  accessClient: string | undefined;
  allowedAccessClients: readonly string[];
}): Promise<{ flag: string; hasAccess: boolean; reason: string; groupKey?: string }> {
  const permissions = await getPermissions(options);
  const evaluation = permissions.evaluations[options.flagKey];
  if (!evaluation) {
    throw new ValidationAppError(`Flag "${options.flagKey}" is out of scope or unknown`);
  }
  return {
    flag: options.flagKey,
    hasAccess: evaluation.granted,
    reason: evaluation.reason,
    ...(evaluation.groupKey ? { groupKey: evaluation.groupKey } : {}),
  };
}
