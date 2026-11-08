import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ALLOWED_ACCESS_CLIENTS } from '../domain/schemas.js';
import { loadSeed } from '../demo-data/loadSeed.js';
import { createPersonaIdentityResolver } from '../identity/personaResolver.js';
import { loadPersonas } from '../demo-data/loadSeed.js';
import { InMemoryRepository } from '../repository/InMemoryRepository.js';
import * as groupService from './groupService.js';
import * as userService from './userService.js';
import { getPermissions } from './permissionService.js';
import { BusinessRuleError } from './errors.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('service business rules', () => {
  let repo: InMemoryRepository;
  const identity = createPersonaIdentityResolver(loadPersonas());
  const alex = identity.resolve({ 'X-Demo-User': 'alex-admin' })!;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    await repo.resetTo(loadSeed(NOW));
  });

  it('refuses to add developers to groups', async () => {
    await expect(
      groupService.addGroupMember({
        repo,
        actor: alex,
        now: NOW,
        key: 'beta-testers',
        body: { email: 'dana@example.com' },
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('refuses self-delete for admins', async () => {
    await expect(
      userService.deleteUser({
        repo,
        actor: alex,
        now: NOW,
        email: 'alex@example.com',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('auto-creates unknown emails when adding members', async () => {
    const membership = await groupService.addGroupMember({
      repo,
      actor: alex,
      now: NOW,
      key: 'support-team',
      body: { email: 'newbie@example.com' },
    });
    expect(membership.email).toBe('newbie@example.com');
    expect(await repo.getUser('newbie@example.com')).toMatchObject({ role: 'none' });
  });

  it('provisions missing persona users on permissions load and syncs isAdmin', async () => {
    await repo.deleteUserCascade('alex@example.com');
    const permissions = await getPermissions({
      repo,
      identity: alex,
      now: NOW,
      accessClient: 'storefront',
      allowedAccessClients: DEFAULT_ALLOWED_ACCESS_CLIENTS,
    });
    expect(permissions.email).toBe('alex@example.com');
    expect(permissions.isAdmin).toBe(true);
    expect((await repo.getUser('alex@example.com'))?.isAdmin).toBe(true);
  });

  it('preserves grants when changing flag state', async () => {
    const flag = await repo.getFlag('PRODUCT_RECOMMENDATIONS');
    await repo.updateFlag(
      'PRODUCT_RECOMMENDATIONS',
      { universalState: 'RELEASED', updatedAt: NOW.toISOString() },
      flag!.version,
    );
    const access = await repo.getFlagAccess('PRODUCT_RECOMMENDATIONS');
    expect(access.roleGrants).toHaveLength(1);
  });
});
