import { describe, expect, it } from 'vitest';
import type { Repository } from './Repository.js';
import { AlreadyExistsError, NotFoundError, VersionConflictError } from './errors.js';

export function runRepositoryContract(
  name: string,
  makeRepo: () => Promise<Repository> | Repository,
): void {
  describe(`repository contract: ${name}`, () => {
    async function repo(): Promise<Repository> {
      return makeRepo();
    }

    it('creates and reads users, flags, and groups', async () => {
      const r = await repo();
      const at = '2026-01-01T00:00:00.000Z';
      await r.createUser({
        email: 'a@example.com',
        role: 'none',
        isAdmin: false,
        createdAt: at,
        updatedAt: at,
        version: 1,
      });
      await r.createFlag({
        key: 'FEATURE_A',
        description: 'A',
        universalState: 'GATED',
        accessClients: ['storefront'],
        createdAt: at,
        updatedAt: at,
        version: 1,
      });
      await r.createGroup({
        key: 'crew',
        description: 'Crew',
        defaultTtlDays: 7,
        createdAt: at,
        updatedAt: at,
        version: 1,
      });

      expect((await r.getUser('a@example.com'))?.email).toBe('a@example.com');
      expect((await r.getFlag('FEATURE_A'))?.key).toBe('FEATURE_A');
      expect((await r.getGroup('crew'))?.key).toBe('crew');
    });

    it('rejects duplicate creates and version conflicts', async () => {
      const r = await repo();
      const at = '2026-01-01T00:00:00.000Z';
      await r.createUser({
        email: 'dup@example.com',
        role: 'access',
        isAdmin: false,
        createdAt: at,
        updatedAt: at,
        version: 1,
      });
      await expect(
        r.createUser({
          email: 'dup@example.com',
          role: 'none',
          isAdmin: false,
          createdAt: at,
          updatedAt: at,
          version: 1,
        }),
      ).rejects.toBeInstanceOf(AlreadyExistsError);

      await expect(
        r.updateUser('dup@example.com', { role: 'developer', updatedAt: at }, 99),
      ).rejects.toBeInstanceOf(VersionConflictError);

      const updated = await r.updateUser(
        'dup@example.com',
        { role: 'developer', updatedAt: at },
        1,
      );
      expect(updated.version).toBe(2);
      expect(updated.role).toBe('developer');
    });

    it('cascades flag, group, and user deletes', async () => {
      const r = await repo();
      const at = '2026-01-01T00:00:00.000Z';
      await r.createUser({
        email: 'u@example.com',
        role: 'none',
        isAdmin: false,
        createdAt: at,
        updatedAt: at,
        version: 1,
      });
      await r.createFlag({
        key: 'FEATURE_B',
        description: 'B',
        universalState: 'GATED',
        accessClients: ['storefront'],
        createdAt: at,
        updatedAt: at,
        version: 1,
      });
      await r.createGroup({
        key: 'beta',
        description: 'Beta',
        defaultTtlDays: null,
        createdAt: at,
        updatedAt: at,
        version: 1,
      });
      await r.setMembership('beta', 'u@example.com', {
        email: 'u@example.com',
        groupKey: 'beta',
        expiresAt: null,
        addedAt: at,
        addedBy: 'admin@example.com',
      });
      await r.setRoleGrant('FEATURE_B', {
        flagKey: 'FEATURE_B',
        role: 'access',
        createdAt: at,
      });
      await r.setGroupGrant('FEATURE_B', 'beta', {
        flagKey: 'FEATURE_B',
        groupKey: 'beta',
        expiresAt: null,
        createdAt: at,
      });
      await r.setUserGrant('FEATURE_B', 'u@example.com', {
        flagKey: 'FEATURE_B',
        email: 'u@example.com',
        expiresAt: null,
        createdAt: at,
      });
      await r.setDeveloperDeny('u@example.com', 'FEATURE_B', {
        flagKey: 'FEATURE_B',
        email: 'u@example.com',
        createdBy: 'admin@example.com',
        createdAt: at,
      });

      await r.deleteFlagCascade('FEATURE_B');
      await expect(r.getFlagAccess('FEATURE_B')).rejects.toBeInstanceOf(NotFoundError);

      await r.createFlag({
        key: 'FEATURE_C',
        description: 'C',
        universalState: 'GATED',
        accessClients: ['storefront'],
        createdAt: at,
        updatedAt: at,
        version: 1,
      });
      await r.setGroupGrant('FEATURE_C', 'beta', {
        flagKey: 'FEATURE_C',
        groupKey: 'beta',
        expiresAt: null,
        createdAt: at,
      });
      await r.deleteGroupCascade('beta');
      expect(await r.getGroup('beta')).toBeNull();
      const access = await r.getFlagAccess('FEATURE_C');
      expect(access.groupGrants).toHaveLength(0);

      await r.deleteUserCascade('u@example.com');
      expect(await r.getUser('u@example.com')).toBeNull();
    });

    it('paginates audit newest first', async () => {
      const r = await repo();
      await r.appendAudit({
        id: '1',
        at: '2026-01-01T00:00:00.000Z',
        actorEmail: 'a@example.com',
        action: 'x',
        entityType: 'flag',
        entityKey: 'A',
        summary: 'one',
        accessClients: ['storefront'],
      });
      await r.appendAudit({
        id: '2',
        at: '2026-01-02T00:00:00.000Z',
        actorEmail: 'a@example.com',
        action: 'y',
        entityType: 'flag',
        entityKey: 'B',
        summary: 'two',
        accessClients: ['checkout'],
      });
      const page1 = await r.listAudit({ limit: 1 });
      expect(page1.items[0]?.id).toBe('2');
      expect(page1.nextCursor).toBe('2026-01-02T00:00:00.000Z#2');
      const page2 = await r.listAudit({ limit: 1, cursor: page1.nextCursor! });
      expect(page2.items[0]?.id).toBe('1');
      expect(page2.nextCursor).toBeNull();
    });

    it('filters audit by accessClient and includes platform-wide entries', async () => {
      const r = await repo();
      await r.appendAudit({
        id: 'store',
        at: '2026-01-03T00:00:00.000Z',
        actorEmail: 'a@example.com',
        action: 'flag.update',
        entityType: 'flag',
        entityKey: 'A',
        summary: 'storefront only',
        accessClients: ['storefront'],
      });
      await r.appendAudit({
        id: 'checkout',
        at: '2026-01-02T00:00:00.000Z',
        actorEmail: 'a@example.com',
        action: 'flag.update',
        entityType: 'flag',
        entityKey: 'B',
        summary: 'checkout only',
        accessClients: ['checkout'],
      });
      await r.appendAudit({
        id: 'global',
        at: '2026-01-01T00:00:00.000Z',
        actorEmail: 'a@example.com',
        action: 'user.create',
        entityType: 'user',
        entityKey: 'u@example.com',
        summary: 'platform-wide',
        accessClients: [],
      });
      const page = await r.listAudit({ limit: 10, accessClient: 'storefront' });
      expect(page.items.map((entry) => entry.id)).toEqual(['store', 'global']);
    });
  });
}
