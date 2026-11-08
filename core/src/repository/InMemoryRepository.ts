import type {
  AuditEntry,
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
import { AlreadyExistsError, NotFoundError, VersionConflictError } from './errors.js';
import type {
  AuditPage,
  FlagAccess,
  GroupDetail,
  Repository,
  UserBundle,
} from './Repository.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryRepository implements Repository {
  private users = new Map<string, User>();
  private flags = new Map<string, Flag>();
  private groups = new Map<string, Group>();
  private memberships = new Map<string, Membership>();
  private roleGrants = new Map<string, RoleGrant>();
  private groupGrants = new Map<string, GroupGrant>();
  private userGrants = new Map<string, UserGrant>();
  private developerDenies = new Map<string, DeveloperDeny>();
  private audit: AuditEntry[] = [];

  private membershipKey(email: string, groupKey: string): string {
    return `${email}::${groupKey}`;
  }

  private roleGrantKey(flagKey: string): string {
    return flagKey;
  }

  private groupGrantKey(flagKey: string, groupKey: string): string {
    return `${flagKey}::${groupKey}`;
  }

  private userGrantKey(email: string, flagKey: string): string {
    return `${email}::${flagKey}`;
  }

  private denyKey(email: string, flagKey: string): string {
    return `${email}::${flagKey}`;
  }

  async getUser(email: string): Promise<User | null> {
    const user = this.users.get(email);
    return user ? clone(user) : null;
  }

  async listUsers(): Promise<User[]> {
    return [...this.users.values()].map(clone).sort((a, b) => a.email.localeCompare(b.email));
  }

  async createUser(user: User): Promise<User> {
    if (this.users.has(user.email)) {
      throw new AlreadyExistsError('user', user.email);
    }
    this.users.set(user.email, clone(user));
    return clone(user);
  }

  async updateUser(
    email: string,
    patch: Partial<Pick<User, 'role' | 'isAdmin' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<User> {
    const existing = this.users.get(email);
    if (!existing) {
      throw new NotFoundError('user', email);
    }
    if (existing.version !== expectedVersion) {
      throw new VersionConflictError('user', email);
    }
    const updated: User = {
      ...existing,
      ...patch,
      version: existing.version + 1,
    };
    this.users.set(email, updated);
    return clone(updated);
  }

  async deleteUserCascade(email: string): Promise<void> {
    if (!this.users.has(email)) {
      throw new NotFoundError('user', email);
    }
    this.users.delete(email);
    for (const key of [...this.memberships.keys()]) {
      if (key.startsWith(`${email}::`)) {
        this.memberships.delete(key);
      }
    }
    for (const key of [...this.userGrants.keys()]) {
      if (key.startsWith(`${email}::`)) {
        this.userGrants.delete(key);
      }
    }
    for (const key of [...this.developerDenies.keys()]) {
      if (key.startsWith(`${email}::`)) {
        this.developerDenies.delete(key);
      }
    }
  }

  async getUserBundle(email: string): Promise<UserBundle> {
    const user = this.users.get(email);
    if (!user) {
      throw new NotFoundError('user', email);
    }
    const memberships = [...this.memberships.values()].filter((entry) => entry.email === email);
    const userGrants = [...this.userGrants.values()].filter((entry) => entry.email === email);
    const developerDenies = [...this.developerDenies.values()].filter(
      (entry) => entry.email === email,
    );
    return {
      user: clone(user),
      memberships: memberships.map(clone),
      userGrants: userGrants.map(clone),
      developerDenies: developerDenies.map(clone),
    };
  }

  async getFlag(key: string): Promise<Flag | null> {
    const flag = this.flags.get(key);
    return flag ? clone(flag) : null;
  }

  async listFlags(): Promise<Flag[]> {
    return [...this.flags.values()].map(clone).sort((a, b) => a.key.localeCompare(b.key));
  }

  async createFlag(flag: Flag): Promise<Flag> {
    if (this.flags.has(flag.key)) {
      throw new AlreadyExistsError('flag', flag.key);
    }
    this.flags.set(flag.key, clone(flag));
    return clone(flag);
  }

  async updateFlag(
    key: string,
    patch: Partial<Pick<Flag, 'description' | 'universalState' | 'accessClients' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<Flag> {
    const existing = this.flags.get(key);
    if (!existing) {
      throw new NotFoundError('flag', key);
    }
    if (existing.version !== expectedVersion) {
      throw new VersionConflictError('flag', key);
    }
    const updated: Flag = {
      ...existing,
      ...patch,
      version: existing.version + 1,
    };
    this.flags.set(key, updated);
    return clone(updated);
  }

  async deleteFlagCascade(key: string): Promise<void> {
    if (!this.flags.has(key)) {
      throw new NotFoundError('flag', key);
    }
    this.flags.delete(key);
    this.roleGrants.delete(this.roleGrantKey(key));
    for (const grantKey of [...this.groupGrants.keys()]) {
      if (grantKey.startsWith(`${key}::`)) {
        this.groupGrants.delete(grantKey);
      }
    }
    for (const grantKey of [...this.userGrants.keys()]) {
      if (grantKey.endsWith(`::${key}`)) {
        this.userGrants.delete(grantKey);
      }
    }
    for (const denyKey of [...this.developerDenies.keys()]) {
      if (denyKey.endsWith(`::${key}`)) {
        this.developerDenies.delete(denyKey);
      }
    }
  }

  async getFlagAccess(key: string): Promise<FlagAccess> {
    if (!this.flags.has(key)) {
      throw new NotFoundError('flag', key);
    }
    const roleGrant = this.roleGrants.get(this.roleGrantKey(key));
    const groupGrants = [...this.groupGrants.values()].filter((grant) => grant.flagKey === key);
    const userGrants = [...this.userGrants.values()].filter((grant) => grant.flagKey === key);
    const developerDenies = [...this.developerDenies.values()].filter(
      (deny) => deny.flagKey === key,
    );
    return {
      roleGrants: roleGrant ? [clone(roleGrant)] : [],
      groupGrants: groupGrants.map(clone),
      userGrants: userGrants.map(clone),
      developerDenies: developerDenies.map(clone),
    };
  }

  async setRoleGrant(flagKey: string, grant: RoleGrant | null): Promise<void> {
    if (!this.flags.has(flagKey)) {
      throw new NotFoundError('flag', flagKey);
    }
    const key = this.roleGrantKey(flagKey);
    if (grant === null) {
      this.roleGrants.delete(key);
      return;
    }
    this.roleGrants.set(key, clone(grant));
  }

  async setGroupGrant(
    flagKey: string,
    groupKey: string,
    grant: GroupGrant | null,
  ): Promise<void> {
    if (!this.flags.has(flagKey)) {
      throw new NotFoundError('flag', flagKey);
    }
    if (grant !== null && !this.groups.has(groupKey)) {
      throw new NotFoundError('group', groupKey);
    }
    const key = this.groupGrantKey(flagKey, groupKey);
    if (grant === null) {
      this.groupGrants.delete(key);
      return;
    }
    this.groupGrants.set(key, clone(grant));
  }

  async setUserGrant(flagKey: string, email: string, grant: UserGrant | null): Promise<void> {
    if (!this.flags.has(flagKey)) {
      throw new NotFoundError('flag', flagKey);
    }
    if (grant !== null && !this.users.has(email)) {
      throw new NotFoundError('user', email);
    }
    const key = this.userGrantKey(email, flagKey);
    if (grant === null) {
      this.userGrants.delete(key);
      return;
    }
    this.userGrants.set(key, clone(grant));
  }

  async setDeveloperDeny(
    email: string,
    flagKey: string,
    deny: DeveloperDeny | null,
  ): Promise<void> {
    if (!this.users.has(email)) {
      throw new NotFoundError('user', email);
    }
    if (deny !== null && !this.flags.has(flagKey)) {
      throw new NotFoundError('flag', flagKey);
    }
    const key = this.denyKey(email, flagKey);
    if (deny === null) {
      this.developerDenies.delete(key);
      return;
    }
    this.developerDenies.set(key, clone(deny));
  }

  async getGroup(key: string): Promise<Group | null> {
    const group = this.groups.get(key);
    return group ? clone(group) : null;
  }

  async listGroups(): Promise<Group[]> {
    return [...this.groups.values()].map(clone).sort((a, b) => a.key.localeCompare(b.key));
  }

  async createGroup(group: Group): Promise<Group> {
    if (this.groups.has(group.key)) {
      throw new AlreadyExistsError('group', group.key);
    }
    this.groups.set(group.key, clone(group));
    return clone(group);
  }

  async updateGroup(
    key: string,
    patch: Partial<Pick<Group, 'description' | 'defaultTtlDays' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<Group> {
    const existing = this.groups.get(key);
    if (!existing) {
      throw new NotFoundError('group', key);
    }
    if (existing.version !== expectedVersion) {
      throw new VersionConflictError('group', key);
    }
    const updated: Group = {
      ...existing,
      ...patch,
      version: existing.version + 1,
    };
    this.groups.set(key, updated);
    return clone(updated);
  }

  async deleteGroupCascade(key: string): Promise<void> {
    if (!this.groups.has(key)) {
      throw new NotFoundError('group', key);
    }
    this.groups.delete(key);
    for (const membershipKey of [...this.memberships.keys()]) {
      if (membershipKey.endsWith(`::${key}`)) {
        this.memberships.delete(membershipKey);
      }
    }
    for (const grantKey of [...this.groupGrants.keys()]) {
      if (grantKey.endsWith(`::${key}`)) {
        this.groupGrants.delete(grantKey);
      }
    }
  }

  async getGroupDetail(key: string): Promise<GroupDetail> {
    const group = this.groups.get(key);
    if (!group) {
      throw new NotFoundError('group', key);
    }
    const members = [...this.memberships.values()].filter((entry) => entry.groupKey === key);
    const flagGrants = [...this.groupGrants.values()].filter((grant) => grant.groupKey === key);
    return {
      group: clone(group),
      members: members.map(clone),
      flagGrants: flagGrants.map(clone),
    };
  }

  async setMembership(
    groupKey: string,
    email: string,
    membership: Membership | null,
  ): Promise<void> {
    if (!this.groups.has(groupKey)) {
      throw new NotFoundError('group', groupKey);
    }
    if (membership !== null && !this.users.has(email)) {
      throw new NotFoundError('user', email);
    }
    const key = this.membershipKey(email, groupKey);
    if (membership === null) {
      this.memberships.delete(key);
      return;
    }
    this.memberships.set(key, clone(membership));
  }

  async appendAudit(entry: AuditEntry): Promise<void> {
    this.audit.push(clone(entry));
  }

  async listAudit(options: { limit: number; cursor?: string }): Promise<AuditPage> {
    const sorted = [...this.audit].sort((a, b) => {
      const byAt = b.at.localeCompare(a.at);
      if (byAt !== 0) {
        return byAt;
      }
      return b.id.localeCompare(a.id);
    });
    let start = 0;
    if (options.cursor) {
      const index = sorted.findIndex((entry) => `${entry.at}#${entry.id}` === options.cursor);
      start = index >= 0 ? index + 1 : sorted.length;
    }
    const items = sorted.slice(start, start + options.limit).map(clone);
    const last = items[items.length - 1];
    const nextCursor =
      start + items.length < sorted.length && last ? `${last.at}#${last.id}` : null;
    return { items, nextCursor };
  }

  async resetTo(seed: SeedSnapshot): Promise<void> {
    this.users.clear();
    this.flags.clear();
    this.groups.clear();
    this.memberships.clear();
    this.roleGrants.clear();
    this.groupGrants.clear();
    this.userGrants.clear();
    this.developerDenies.clear();
    this.audit = [];

    for (const user of seed.users) {
      this.users.set(user.email, clone(user));
    }
    for (const flag of seed.flags) {
      this.flags.set(flag.key, clone(flag));
    }
    for (const group of seed.groups) {
      this.groups.set(group.key, clone(group));
    }
    for (const membership of seed.memberships) {
      this.memberships.set(
        this.membershipKey(membership.email, membership.groupKey),
        clone(membership),
      );
    }
    for (const grant of seed.roleGrants) {
      this.roleGrants.set(this.roleGrantKey(grant.flagKey), clone(grant));
    }
    for (const grant of seed.groupGrants) {
      this.groupGrants.set(this.groupGrantKey(grant.flagKey, grant.groupKey), clone(grant));
    }
    for (const grant of seed.userGrants) {
      this.userGrants.set(this.userGrantKey(grant.email, grant.flagKey), clone(grant));
    }
    for (const deny of seed.developerDenies) {
      this.developerDenies.set(this.denyKey(deny.email, deny.flagKey), clone(deny));
    }
  }
}
