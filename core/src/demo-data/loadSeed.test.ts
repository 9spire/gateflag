import { describe, expect, it } from 'vitest';
import { loadPersonas, loadSeed } from './loadSeed.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('loadSeed', () => {
  it('converts relative expiries to absolute ISO timestamps', () => {
    const snapshot = loadSeed(NOW);
    expect(snapshot.seedVersion).toBe(1);
    expect(snapshot.memberships.find((m) => m.email === 'pat@example.com')?.expiresAt).toBe(
      '2026-01-31T00:00:00.000Z',
    );
    expect(snapshot.memberships.find((m) => m.email === 'jordan@example.com')?.expiresAt).toBeNull();
    expect(snapshot.userGrants[0]?.expiresAt).toBe('2026-01-08T00:00:00.000Z');
    expect(snapshot.users).toHaveLength(5);
    expect(snapshot.flags).toHaveLength(6);
  });
});

describe('loadPersonas', () => {
  it('loads the demo personas and admin IdP group', () => {
    const personas = loadPersonas();
    expect(personas.adminIdpGroup).toBe('gateflag-admins');
    expect(personas.personas.map((persona) => persona.id)).toEqual([
      'alex-admin',
      'dana-dev',
      'pat-beta',
      'jordan-support',
      'sam-none',
    ]);
  });
});
