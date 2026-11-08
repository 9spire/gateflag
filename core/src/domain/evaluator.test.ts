import { describe, expect, it } from 'vitest';
import { isActive } from './active.js';
import { addDaysIso, evaluateFlag, filterFlagsByAccessClient } from './evaluator.js';
import { reasonLabel } from './reasons.js';
import type { EvaluateFlagInput } from './types.js';

const now = new Date('2026-01-01T00:00:00.000Z');

function baseCtx(
  overrides: Partial<Omit<EvaluateFlagInput, 'flag'>> = {},
): Omit<EvaluateFlagInput, 'flag'> {
  return {
    role: 'none',
    memberships: [],
    existingGroupKeys: new Set<string>(),
    userGrant: null,
    developerDeny: false,
    hasAccessRoleGrant: false,
    groupGrants: [],
    ...overrides,
  };
}

describe('evaluateFlag', () => {
  it('returns DISABLED for universal DISABLED', () => {
    expect(evaluateFlag({ universalState: 'DISABLED' }, baseCtx({ role: 'developer' }), now)).toEqual(
      { granted: false, reason: 'DISABLED' },
    );
  });

  it('returns RELEASED for universal RELEASED', () => {
    expect(evaluateFlag({ universalState: 'RELEASED' }, baseCtx({ role: 'none' }), now)).toEqual({
      granted: true,
      reason: 'RELEASED',
    });
  });

  it('grants developers automatically when GATED', () => {
    expect(evaluateFlag({ universalState: 'GATED' }, baseCtx({ role: 'developer' }), now)).toEqual({
      granted: true,
      reason: 'DEVELOPER',
    });
  });

  it('denies developers with an active deny and does not fall through', () => {
    expect(
      evaluateFlag(
        { universalState: 'GATED' },
        baseCtx({
          role: 'developer',
          developerDeny: true,
          userGrant: { expiresAt: null },
          hasAccessRoleGrant: true,
        }),
        now,
      ),
    ).toEqual({ granted: false, reason: 'DEVELOPER_DENIED' });
  });

  it('grants via USER_GRANT before group and role', () => {
    expect(
      evaluateFlag(
        { universalState: 'GATED' },
        baseCtx({
          role: 'access',
          userGrant: { expiresAt: null },
          hasAccessRoleGrant: true,
          memberships: [{ groupKey: 'beta-testers', expiresAt: null }],
          existingGroupKeys: new Set(['beta-testers']),
          groupGrants: [{ groupKey: 'beta-testers', expiresAt: null }],
        }),
        now,
      ),
    ).toEqual({ granted: true, reason: 'USER_GRANT' });
  });

  it('grants via GROUP_GRANT and picks the first groupKey alphabetically', () => {
    expect(
      evaluateFlag(
        { universalState: 'GATED' },
        baseCtx({
          role: 'none',
          memberships: [
            { groupKey: 'zeta', expiresAt: null },
            { groupKey: 'alpha', expiresAt: null },
          ],
          existingGroupKeys: new Set(['alpha', 'zeta']),
          groupGrants: [
            { groupKey: 'zeta', expiresAt: null },
            { groupKey: 'alpha', expiresAt: null },
          ],
        }),
        now,
      ),
    ).toEqual({ granted: true, reason: 'GROUP_GRANT', groupKey: 'alpha' });
  });

  it('ignores group grants when the group no longer exists', () => {
    expect(
      evaluateFlag(
        { universalState: 'GATED' },
        baseCtx({
          role: 'none',
          memberships: [{ groupKey: 'gone', expiresAt: null }],
          existingGroupKeys: new Set(),
          groupGrants: [{ groupKey: 'gone', expiresAt: null }],
        }),
        now,
      ),
    ).toEqual({ granted: false, reason: 'NO_GRANT' });
  });

  it('grants via ROLE_GRANT for access role', () => {
    expect(
      evaluateFlag(
        { universalState: 'GATED' },
        baseCtx({ role: 'access', hasAccessRoleGrant: true }),
        now,
      ),
    ).toEqual({ granted: true, reason: 'ROLE_GRANT' });
  });

  it('returns NO_GRANT when nothing matches', () => {
    expect(evaluateFlag({ universalState: 'GATED' }, baseCtx(), now)).toEqual({
      granted: false,
      reason: 'NO_GRANT',
    });
  });

  it('treats expiresAt equal to now as expired', () => {
    const atNow = now.toISOString();
    expect(isActive(atNow, now)).toBe(false);
    expect(
      evaluateFlag(
        { universalState: 'GATED' },
        baseCtx({ role: 'none', userGrant: { expiresAt: atNow } }),
        now,
      ),
    ).toEqual({ granted: false, reason: 'NO_GRANT' });
  });

  it('treats expiresAt after now as active', () => {
    const later = addDaysIso(now, 1);
    expect(isActive(later, now)).toBe(true);
    expect(
      evaluateFlag(
        { universalState: 'GATED' },
        baseCtx({ role: 'none', userGrant: { expiresAt: later } }),
        now,
      ),
    ).toEqual({ granted: true, reason: 'USER_GRANT' });
  });

  it('requires active membership for GROUP_GRANT', () => {
    expect(
      evaluateFlag(
        { universalState: 'GATED' },
        baseCtx({
          role: 'none',
          memberships: [{ groupKey: 'beta-testers', expiresAt: now.toISOString() }],
          existingGroupKeys: new Set(['beta-testers']),
          groupGrants: [{ groupKey: 'beta-testers', expiresAt: null }],
        }),
        now,
      ),
    ).toEqual({ granted: false, reason: 'NO_GRANT' });
  });
});

describe('filterFlagsByAccessClient', () => {
  const flags = [
    { key: 'A', accessClients: ['storefront'] },
    { key: 'B', accessClients: ['support-portal'] },
    { key: 'C', accessClients: ['storefront', 'checkout'] },
  ];

  it('returns all flags when access client is absent', () => {
    expect(filterFlagsByAccessClient(flags, undefined)).toHaveLength(3);
    expect(filterFlagsByAccessClient(flags, '')).toHaveLength(3);
  });

  it('filters to the matching access client', () => {
    expect(filterFlagsByAccessClient(flags, 'storefront').map((flag) => flag.key)).toEqual([
      'A',
      'C',
    ]);
  });
});

describe('reasonLabel', () => {
  it('formats every reason', () => {
    expect(reasonLabel('RELEASED')).toBe('Released to everyone');
    expect(reasonLabel('DISABLED')).toBe('Disabled for everyone');
    expect(reasonLabel('DEVELOPER')).toBe('Automatic: developer role');
    expect(reasonLabel('DEVELOPER_DENIED')).toBe('Disabled for this developer by an admin');
    expect(reasonLabel('USER_GRANT')).toBe('Individual grant');
    expect(reasonLabel('GROUP_GRANT', 'beta-testers')).toBe('Group grant: beta-testers');
    expect(reasonLabel('ROLE_GRANT')).toBe('Access role grant');
    expect(reasonLabel('NO_GRANT')).toBe('No grant');
  });
});
