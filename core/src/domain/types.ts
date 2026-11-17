export type UniversalState = 'DISABLED' | 'GATED' | 'RELEASED';
export type Role = 'developer' | 'access' | 'none';
export type ISO = string;

export type Reason =
  | 'RELEASED'
  | 'DISABLED'
  | 'DEVELOPER'
  | 'DEVELOPER_DENIED'
  | 'USER_GRANT'
  | 'GROUP_GRANT'
  | 'ROLE_GRANT'
  | 'NO_GRANT';

export interface User {
  email: string;
  role: Role;
  isAdmin: boolean;
  createdAt: ISO;
  updatedAt: ISO;
  version: number;
}

export interface Flag {
  key: string;
  description: string;
  universalState: UniversalState;
  accessClients: string[];
  createdAt: ISO;
  updatedAt: ISO;
  version: number;
}

export interface Group {
  key: string;
  description: string;
  defaultTtlDays: number | null;
  createdAt: ISO;
  updatedAt: ISO;
  version: number;
}

export interface Membership {
  email: string;
  groupKey: string;
  expiresAt: ISO | null;
  addedAt: ISO;
  addedBy: string;
}

export interface RoleGrant {
  flagKey: string;
  role: 'access';
  createdAt: ISO;
}

export interface GroupGrant {
  flagKey: string;
  groupKey: string;
  expiresAt: ISO | null;
  createdAt: ISO;
}

export interface UserGrant {
  flagKey: string;
  email: string;
  expiresAt: ISO | null;
  createdAt: ISO;
}

export interface DeveloperDeny {
  flagKey: string;
  email: string;
  createdBy: string;
  createdAt: ISO;
}

export interface AuditEntry {
  id: string;
  at: ISO;
  actorEmail: string;
  action: string;
  entityType: 'flag' | 'user' | 'group';
  entityKey: string;
  summary: string;
  /** Empty = platform-wide (not scoped to an access client / app). */
  accessClients: string[];
}

export interface EvaluationResult {
  granted: boolean;
  reason: Reason;
  groupKey?: string;
}

export interface EvaluateFlagInput {
  flag: Pick<Flag, 'universalState'>;
  role: Role;
  /** Memberships for the subject; expiry checked against `now`. */
  memberships: Array<{ groupKey: string; expiresAt: ISO | null }>;
  /** Group keys that still exist in the catalog. */
  existingGroupKeys: ReadonlySet<string>;
  /** User grant for this flag, if any. */
  userGrant: { expiresAt: ISO | null } | null;
  /** Developer deny for this flag, if any (no expiry). */
  developerDeny: boolean;
  /** Whether the flag has an access role grant. */
  hasAccessRoleGrant: boolean;
  /** Group grants on this flag. */
  groupGrants: Array<{ groupKey: string; expiresAt: ISO | null }>;
}

export interface SeedSnapshot {
  seedVersion: number;
  users: User[];
  groups: Group[];
  memberships: Membership[];
  flags: Flag[];
  roleGrants: RoleGrant[];
  groupGrants: GroupGrant[];
  userGrants: UserGrant[];
  developerDenies: DeveloperDeny[];
  audit: AuditEntry[];
}
