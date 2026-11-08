import { evaluateFlag, filterFlagsByAccessClient } from './evaluator.js';
import type { EvaluationResult, Flag, Role, SeedSnapshot } from './types.js';

export interface FlagEvaluation extends EvaluationResult {
  universalState: Flag['universalState'];
}

export interface PermissionsEvaluation {
  email: string;
  role: Role;
  flags: string[];
  evaluations: Record<string, FlagEvaluation>;
  evaluatedAt: string;
}

export function evaluatePermissions(
  snapshot: SeedSnapshot,
  email: string,
  now: Date,
  accessClient?: string,
): PermissionsEvaluation {
  const user = snapshot.users.find((entry) => entry.email === email);
  const role: Role = user?.role ?? 'none';

  const inScopeFlags = filterFlagsByAccessClient(snapshot.flags, accessClient);
  const existingGroupKeys = new Set(snapshot.groups.map((group) => group.key));
  const memberships = snapshot.memberships
    .filter((membership) => membership.email === email)
    .map((membership) => ({
      groupKey: membership.groupKey,
      expiresAt: membership.expiresAt,
    }));

  const evaluations: Record<string, FlagEvaluation> = {};
  const granted: string[] = [];

  for (const flag of inScopeFlags) {
    const userGrant =
      snapshot.userGrants.find(
        (grant) => grant.flagKey === flag.key && grant.email === email,
      ) ?? null;
    const developerDeny = snapshot.developerDenies.some(
      (deny) => deny.flagKey === flag.key && deny.email === email,
    );
    const hasAccessRoleGrant = snapshot.roleGrants.some(
      (grant) => grant.flagKey === flag.key && grant.role === 'access',
    );
    const groupGrants = snapshot.groupGrants
      .filter((grant) => grant.flagKey === flag.key)
      .map((grant) => ({
        groupKey: grant.groupKey,
        expiresAt: grant.expiresAt,
      }));

    const result = evaluateFlag(
      flag,
      {
        role,
        memberships,
        existingGroupKeys,
        userGrant,
        developerDeny,
        hasAccessRoleGrant,
        groupGrants,
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
    email,
    role,
    flags: granted,
    evaluations,
    evaluatedAt: now.toISOString(),
  };
}
