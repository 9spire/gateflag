import { isActive } from './active.js';
import type { EvaluateFlagInput, EvaluationResult, ISO } from './types.js';

export function evaluateFlag(
  flag: EvaluateFlagInput['flag'],
  ctx: Omit<EvaluateFlagInput, 'flag'>,
  now: Date,
): EvaluationResult {
  if (flag.universalState === 'DISABLED') {
    return { granted: false, reason: 'DISABLED' };
  }

  if (flag.universalState === 'RELEASED') {
    return { granted: true, reason: 'RELEASED' };
  }

  // GATED
  if (ctx.role === 'developer') {
    if (ctx.developerDeny) {
      return { granted: false, reason: 'DEVELOPER_DENIED' };
    }
    return { granted: true, reason: 'DEVELOPER' };
  }

  if (ctx.userGrant && isActive(ctx.userGrant.expiresAt, now)) {
    return { granted: true, reason: 'USER_GRANT' };
  }

  const matchingGroupKeys = ctx.groupGrants
    .filter((grant) => isActive(grant.expiresAt, now))
    .filter((grant) => ctx.existingGroupKeys.has(grant.groupKey))
    .filter((grant) =>
      ctx.memberships.some(
        (membership) =>
          membership.groupKey === grant.groupKey && isActive(membership.expiresAt, now),
      ),
    )
    .map((grant) => grant.groupKey)
    .sort((a, b) => a.localeCompare(b));

  const groupKey = matchingGroupKeys[0];
  if (groupKey !== undefined) {
    return { granted: true, reason: 'GROUP_GRANT', groupKey };
  }

  if (ctx.role === 'access' && ctx.hasAccessRoleGrant) {
    return { granted: true, reason: 'ROLE_GRANT' };
  }

  return { granted: false, reason: 'NO_GRANT' };
}

export function filterFlagsByAccessClient<T extends { accessClients: string[] }>(
  flags: readonly T[],
  accessClient: string | undefined,
): T[] {
  if (accessClient === undefined || accessClient === '') {
    return [...flags];
  }
  return flags.filter((flag) => flag.accessClients.includes(accessClient));
}

export function addDaysIso(now: Date, days: number): ISO {
  const date = new Date(now.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
