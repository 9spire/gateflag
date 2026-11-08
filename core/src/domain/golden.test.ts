import { describe, expect, it } from 'vitest';
import { loadSeed } from '../demo-data/loadSeed.js';
import { addDaysIso } from './evaluator.js';
import { evaluatePermissions } from './permissions.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('golden persona table (storefront)', () => {
  const snapshot = loadSeed(NOW);

  it('Alex gets five flags (developer + released)', () => {
    const result = evaluatePermissions(snapshot, 'alex@example.com', NOW, 'storefront');
    expect(result.flags).toEqual([
      'BETA_SEARCH',
      'DARK_MODE',
      'NEW_CHECKOUT_FLOW',
      'ORDER_HISTORY_V2',
      'PRODUCT_RECOMMENDATIONS',
    ]);
    expect(result.evaluations.NEW_CHECKOUT_FLOW).toMatchObject({
      granted: true,
      reason: 'DEVELOPER',
    });
    expect(result.evaluations.DARK_MODE).toMatchObject({ granted: true, reason: 'RELEASED' });
  });

  it('Dana is denied BETA_SEARCH and gets four flags', () => {
    const result = evaluatePermissions(snapshot, 'dana@example.com', NOW, 'storefront');
    expect(result.flags).toEqual([
      'DARK_MODE',
      'NEW_CHECKOUT_FLOW',
      'ORDER_HISTORY_V2',
      'PRODUCT_RECOMMENDATIONS',
    ]);
    expect(result.evaluations.BETA_SEARCH).toMatchObject({
      granted: false,
      reason: 'DEVELOPER_DENIED',
    });
  });

  it('Pat gets group, role, user, and released grants', () => {
    const result = evaluatePermissions(snapshot, 'pat@example.com', NOW, 'storefront');
    expect(result.flags).toEqual([
      'DARK_MODE',
      'NEW_CHECKOUT_FLOW',
      'ORDER_HISTORY_V2',
      'PRODUCT_RECOMMENDATIONS',
    ]);
    expect(result.evaluations.NEW_CHECKOUT_FLOW).toMatchObject({
      granted: true,
      reason: 'GROUP_GRANT',
      groupKey: 'beta-testers',
    });
    expect(result.evaluations.PRODUCT_RECOMMENDATIONS).toMatchObject({
      granted: true,
      reason: 'ROLE_GRANT',
    });
    expect(result.evaluations.ORDER_HISTORY_V2).toMatchObject({
      granted: true,
      reason: 'USER_GRANT',
    });
    expect(result.evaluations.DARK_MODE).toMatchObject({ granted: true, reason: 'RELEASED' });
  });

  it('Jordan gets support-team group grant and released', () => {
    const result = evaluatePermissions(snapshot, 'jordan@example.com', NOW, 'storefront');
    expect(result.flags).toEqual(['DARK_MODE', 'ORDER_HISTORY_V2']);
    expect(result.evaluations.ORDER_HISTORY_V2).toMatchObject({
      granted: true,
      reason: 'GROUP_GRANT',
      groupKey: 'support-team',
    });
  });

  it('Sam gets only RELEASED flags', () => {
    const result = evaluatePermissions(snapshot, 'sam@example.com', NOW, 'storefront');
    expect(result.flags).toEqual(['DARK_MODE']);
  });

  it('unknown user evaluates as role none with no grants', () => {
    const result = evaluatePermissions(snapshot, 'nobody@example.com', NOW, 'storefront');
    expect(result.role).toBe('none');
    expect(result.flags).toEqual(['DARK_MODE']);
  });
});

describe('access-client filtering', () => {
  const snapshot = loadSeed(NOW);

  it('support-portal scopes Jordan and keeps BULK_EXPORT disabled', () => {
    const result = evaluatePermissions(snapshot, 'jordan@example.com', NOW, 'support-portal');
    expect(result.flags).toEqual(['DARK_MODE', 'ORDER_HISTORY_V2']);
    expect(result.evaluations.BULK_EXPORT).toMatchObject({
      granted: false,
      reason: 'DISABLED',
    });
    expect(result.evaluations.NEW_CHECKOUT_FLOW).toBeUndefined();
  });

  it('without access client, all flags are evaluated', () => {
    const result = evaluatePermissions(snapshot, 'jordan@example.com', NOW);
    expect(result.evaluations.BULK_EXPORT).toBeDefined();
    expect(result.evaluations.NEW_CHECKOUT_FLOW).toBeDefined();
  });
});

describe('time-based expiry', () => {
  it('Pat loses ORDER_HISTORY_V2 after the user grant expires (+8 days)', () => {
    const snapshot = loadSeed(NOW);
    const later = new Date(addDaysIso(NOW, 8));
    const result = evaluatePermissions(snapshot, 'pat@example.com', later, 'storefront');
    expect(result.evaluations.ORDER_HISTORY_V2).toMatchObject({
      granted: false,
      reason: 'NO_GRANT',
    });
    expect(result.flags).toEqual(['DARK_MODE', 'NEW_CHECKOUT_FLOW', 'PRODUCT_RECOMMENDATIONS']);
  });
});
