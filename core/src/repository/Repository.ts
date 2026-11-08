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

export interface UserBundle {
  user: User;
  memberships: Membership[];
  userGrants: UserGrant[];
  developerDenies: DeveloperDeny[];
}

export interface FlagAccess {
  roleGrants: RoleGrant[];
  groupGrants: GroupGrant[];
  userGrants: UserGrant[];
  developerDenies: DeveloperDeny[];
}

export interface GroupDetail {
  group: Group;
  members: Membership[];
  flagGrants: GroupGrant[];
}

export interface AuditPage {
  items: AuditEntry[];
  nextCursor: string | null;
}

export interface Repository {
  getUser(email: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  createUser(user: User): Promise<User>;
  updateUser(
    email: string,
    patch: Partial<Pick<User, 'role' | 'isAdmin' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<User>;
  deleteUserCascade(email: string): Promise<void>;
  getUserBundle(email: string): Promise<UserBundle>;

  getFlag(key: string): Promise<Flag | null>;
  listFlags(): Promise<Flag[]>;
  createFlag(flag: Flag): Promise<Flag>;
  updateFlag(
    key: string,
    patch: Partial<Pick<Flag, 'description' | 'universalState' | 'accessClients' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<Flag>;
  deleteFlagCascade(key: string): Promise<void>;
  getFlagAccess(key: string): Promise<FlagAccess>;

  setRoleGrant(flagKey: string, grant: RoleGrant | null): Promise<void>;
  setGroupGrant(flagKey: string, groupKey: string, grant: GroupGrant | null): Promise<void>;
  setUserGrant(flagKey: string, email: string, grant: UserGrant | null): Promise<void>;
  setDeveloperDeny(email: string, flagKey: string, deny: DeveloperDeny | null): Promise<void>;

  getGroup(key: string): Promise<Group | null>;
  listGroups(): Promise<Group[]>;
  createGroup(group: Group): Promise<Group>;
  updateGroup(
    key: string,
    patch: Partial<Pick<Group, 'description' | 'defaultTtlDays' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<Group>;
  deleteGroupCascade(key: string): Promise<void>;
  getGroupDetail(key: string): Promise<GroupDetail>;
  setMembership(groupKey: string, email: string, membership: Membership | null): Promise<void>;

  appendAudit(entry: AuditEntry): Promise<void>;
  listAudit(options: { limit: number; cursor?: string }): Promise<AuditPage>;
  resetTo(seed: SeedSnapshot): Promise<void>;
}
