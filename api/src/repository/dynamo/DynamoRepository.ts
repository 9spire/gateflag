import {
  AlreadyExistsError,
  NotFoundError,
  VersionConflictError,
  type AuditEntry,
  type AuditPage,
  type DeveloperDeny,
  type Flag,
  type FlagAccess,
  type Group,
  type GroupDetail,
  type GroupGrant,
  type Membership,
  type Repository,
  type RoleGrant,
  type SeedSnapshot,
  type User,
  type UserBundle,
  type UserGrant,
} from '@gateflag/core';
import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import {
  META,
  auditSk,
  denySk,
  flagPk,
  groupPk,
  groupSk,
  membershipSk,
  roleSk,
  ttlFromExpiry,
  ttlFromNow,
  userGrantSk,
  userPk,
} from './keys.js';

type Item = Record<string, unknown>;

/**
 * Cascades above 100 TransactWrite items are chunked.
 * Chunked cascades are NOT atomic across chunks — documented decision.
 */
const TRANSACT_LIMIT = 100;

export class DynamoRepository implements Repository {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  private async getItem(pk: string, sk: string): Promise<Item | undefined> {
    const result = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      }),
    );
    return result.Item as Item | undefined;
  }

  private async queryPk(pk: string): Promise<Item[]> {
    const items: Item[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const result = await this.doc.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': pk },
          ExclusiveStartKey,
        }),
      );
      items.push(...((result.Items as Item[] | undefined) ?? []));
      ExclusiveStartKey = result.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  private async queryGsi1(gsi1pk: string): Promise<Item[]> {
    const items: Item[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const result = await this.doc.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': gsi1pk },
          ExclusiveStartKey,
        }),
      );
      items.push(...((result.Items as Item[] | undefined) ?? []));
      ExclusiveStartKey = result.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  private mapUser(item: Item): User {
    return {
      email: String(item.email),
      role: item.role as User['role'],
      isAdmin: Boolean(item.isAdmin),
      createdAt: String(item.createdAt),
      updatedAt: String(item.updatedAt),
      version: Number(item.version),
    };
  }

  private mapFlag(item: Item): Flag {
    return {
      key: String(item.key),
      description: String(item.description),
      universalState: item.universalState as Flag['universalState'],
      accessClients: item.accessClients as string[],
      createdAt: String(item.createdAt),
      updatedAt: String(item.updatedAt),
      version: Number(item.version),
    };
  }

  private mapGroup(item: Item): Group {
    return {
      key: String(item.key),
      description: String(item.description),
      defaultTtlDays: (item.defaultTtlDays as number | null) ?? null,
      createdAt: String(item.createdAt),
      updatedAt: String(item.updatedAt),
      version: Number(item.version),
    };
  }

  private async putCreate(item: Item): Promise<void> {
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new AlreadyExistsError(String(item.entityType), String(item.entityKey ?? item.PK));
      }
      throw error;
    }
  }

  private async transact(writes: object[]): Promise<void> {
    for (let i = 0; i < writes.length; i += TRANSACT_LIMIT) {
      const chunk = writes.slice(i, i + TRANSACT_LIMIT);
      try {
        await this.doc.send(
          new TransactWriteCommand({
            TransactItems: chunk,
          }),
        );
      } catch (error) {
        if (error instanceof TransactionCanceledException) {
          throw error;
        }
        throw error;
      }
    }
  }

  async getUser(email: string): Promise<User | null> {
    const item = await this.getItem(userPk(email), META);
    return item ? this.mapUser(item) : null;
  }

  async listUsers(): Promise<User[]> {
    const items = await this.queryGsi1('USERS');
    return items.map((item) => this.mapUser(item)).sort((a, b) => a.email.localeCompare(b.email));
  }

  async createUser(user: User): Promise<User> {
    await this.putCreate({
      PK: userPk(user.email),
      SK: META,
      GSI1PK: 'USERS',
      GSI1SK: user.email,
      entityType: 'user',
      entityKey: user.email,
      ...user,
    });
    return user;
  }

  async updateUser(
    email: string,
    patch: Partial<Pick<User, 'role' | 'isAdmin' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<User> {
    const existing = await this.getUser(email);
    if (!existing) {
      throw new NotFoundError('user', email);
    }
    if (existing.version !== expectedVersion) {
      throw new VersionConflictError('user', email);
    }
    const updated: User = { ...existing, ...patch, version: existing.version + 1 };
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: userPk(email),
            SK: META,
            GSI1PK: 'USERS',
            GSI1SK: email,
            entityType: 'user',
            entityKey: email,
            ...updated,
          },
          ConditionExpression: 'version = :expected',
          ExpressionAttributeValues: { ':expected': expectedVersion },
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new VersionConflictError('user', email);
      }
      throw error;
    }
    return updated;
  }

  async deleteUserCascade(email: string): Promise<void> {
    const items = await this.queryPk(userPk(email));
    if (!items.some((item) => item.SK === META)) {
      throw new NotFoundError('user', email);
    }
    // Also delete GSI1-only mirrors are same items. Collect related FLAG# grants via GSI1 later.
    const deletes = items.map((item) => ({
      Delete: { TableName: this.tableName, Key: { PK: item.PK, SK: item.SK } },
    }));
    await this.transact(deletes);
  }

  async getUserBundle(email: string): Promise<UserBundle> {
    const items = await this.queryPk(userPk(email));
    const meta = items.find((item) => item.SK === META);
    if (!meta) {
      throw new NotFoundError('user', email);
    }
    const memberships: Membership[] = [];
    const userGrants: UserGrant[] = [];
    const developerDenies: DeveloperDeny[] = [];
    for (const item of items) {
      const sk = String(item.SK);
      if (sk.startsWith('GROUP#')) {
        memberships.push({
          email: String(item.email),
          groupKey: String(item.groupKey),
          expiresAt: (item.expiresAt as string | null) ?? null,
          addedAt: String(item.addedAt),
          addedBy: String(item.addedBy),
        });
      } else if (sk.startsWith('FLAG_DENY#')) {
        developerDenies.push({
          flagKey: String(item.flagKey),
          email: String(item.email),
          createdBy: String(item.createdBy),
          createdAt: String(item.createdAt),
        });
      } else if (sk.startsWith('FLAG#')) {
        userGrants.push({
          flagKey: String(item.flagKey),
          email: String(item.email),
          expiresAt: (item.expiresAt as string | null) ?? null,
          createdAt: String(item.createdAt),
        });
      }
    }
    return {
      user: this.mapUser(meta),
      memberships,
      userGrants,
      developerDenies,
    };
  }

  async getFlag(key: string): Promise<Flag | null> {
    const item = await this.getItem(flagPk(key), META);
    return item ? this.mapFlag(item) : null;
  }

  async listFlags(): Promise<Flag[]> {
    const items = await this.queryGsi1('FLAGS');
    return items.map((item) => this.mapFlag(item)).sort((a, b) => a.key.localeCompare(b.key));
  }

  async createFlag(flag: Flag): Promise<Flag> {
    await this.putCreate({
      PK: flagPk(flag.key),
      SK: META,
      GSI1PK: 'FLAGS',
      GSI1SK: flag.key,
      entityType: 'flag',
      entityKey: flag.key,
      ...flag,
    });
    return flag;
  }

  async updateFlag(
    key: string,
    patch: Partial<Pick<Flag, 'description' | 'universalState' | 'accessClients' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<Flag> {
    const existing = await this.getFlag(key);
    if (!existing) {
      throw new NotFoundError('flag', key);
    }
    if (existing.version !== expectedVersion) {
      throw new VersionConflictError('flag', key);
    }
    const updated: Flag = { ...existing, ...patch, version: existing.version + 1 };
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: flagPk(key),
            SK: META,
            GSI1PK: 'FLAGS',
            GSI1SK: key,
            entityType: 'flag',
            entityKey: key,
            ...updated,
          },
          ConditionExpression: 'version = :expected',
          ExpressionAttributeValues: { ':expected': expectedVersion },
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new VersionConflictError('flag', key);
      }
      throw error;
    }
    return updated;
  }

  async deleteFlagCascade(key: string): Promise<void> {
    const underFlag = await this.queryPk(flagPk(key));
    if (!underFlag.some((item) => item.SK === META)) {
      throw new NotFoundError('flag', key);
    }
    const viaGsi = await this.queryGsi1(flagPk(key));
    const keys = new Map<string, { PK: string; SK: string }>();
    for (const item of [...underFlag, ...viaGsi]) {
      keys.set(`${item.PK}|${item.SK}`, { PK: String(item.PK), SK: String(item.SK) });
    }
    await this.transact(
      [...keys.values()].map((keyPair) => ({
        Delete: { TableName: this.tableName, Key: keyPair },
      })),
    );
  }

  async getFlagAccess(key: string): Promise<FlagAccess> {
    if (!(await this.getFlag(key))) {
      throw new NotFoundError('flag', key);
    }
    const underFlag = await this.queryPk(flagPk(key));
    const viaGsi = await this.queryGsi1(flagPk(key));
    const roleGrants: RoleGrant[] = [];
    const groupGrants: GroupGrant[] = [];
    for (const item of underFlag) {
      const sk = String(item.SK);
      if (sk === roleSk()) {
        roleGrants.push({
          flagKey: key,
          role: 'access',
          createdAt: String(item.createdAt),
        });
      } else if (sk.startsWith('GROUP#')) {
        groupGrants.push({
          flagKey: key,
          groupKey: String(item.groupKey),
          expiresAt: (item.expiresAt as string | null) ?? null,
          createdAt: String(item.createdAt),
        });
      }
    }
    const userGrants: UserGrant[] = [];
    const developerDenies: DeveloperDeny[] = [];
    for (const item of viaGsi) {
      const gsi1sk = String(item.GSI1SK);
      if (gsi1sk.startsWith('USER#')) {
        userGrants.push({
          flagKey: key,
          email: String(item.email),
          expiresAt: (item.expiresAt as string | null) ?? null,
          createdAt: String(item.createdAt),
        });
      } else if (gsi1sk.startsWith('DENY#')) {
        developerDenies.push({
          flagKey: key,
          email: String(item.email),
          createdBy: String(item.createdBy),
          createdAt: String(item.createdAt),
        });
      }
    }
    return { roleGrants, groupGrants, userGrants, developerDenies };
  }

  async setRoleGrant(flagKey: string, grant: RoleGrant | null): Promise<void> {
    if (!(await this.getFlag(flagKey))) {
      throw new NotFoundError('flag', flagKey);
    }
    if (grant === null) {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: flagPk(flagKey), SK: roleSk() },
        }),
      );
      return;
    }
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: flagPk(flagKey),
          SK: roleSk(),
          entityType: 'roleGrant',
          ...grant,
        },
      }),
    );
  }

  async setGroupGrant(
    flagKey: string,
    groupKey: string,
    grant: GroupGrant | null,
  ): Promise<void> {
    if (!(await this.getFlag(flagKey))) {
      throw new NotFoundError('flag', flagKey);
    }
    if (grant !== null && !(await this.getGroup(groupKey))) {
      throw new NotFoundError('group', groupKey);
    }
    if (grant === null) {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: flagPk(flagKey), SK: groupSk(groupKey) },
        }),
      );
      return;
    }
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: flagPk(flagKey),
          SK: groupSk(groupKey),
          GSI1PK: groupPk(groupKey),
          GSI1SK: flagPk(flagKey),
          entityType: 'groupGrant',
          ...grant,
          ttl: ttlFromExpiry(grant.expiresAt, 1),
        },
      }),
    );
  }

  async setUserGrant(flagKey: string, email: string, grant: UserGrant | null): Promise<void> {
    if (!(await this.getFlag(flagKey))) {
      throw new NotFoundError('flag', flagKey);
    }
    if (grant !== null && !(await this.getUser(email))) {
      throw new NotFoundError('user', email);
    }
    if (grant === null) {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: userPk(email), SK: userGrantSk(flagKey) },
        }),
      );
      return;
    }
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: userPk(email),
          SK: userGrantSk(flagKey),
          GSI1PK: flagPk(flagKey),
          GSI1SK: userPk(email),
          entityType: 'userGrant',
          ...grant,
          ttl: ttlFromExpiry(grant.expiresAt, 1),
        },
      }),
    );
  }

  async setDeveloperDeny(
    email: string,
    flagKey: string,
    deny: DeveloperDeny | null,
  ): Promise<void> {
    if (!(await this.getUser(email))) {
      throw new NotFoundError('user', email);
    }
    if (deny !== null && !(await this.getFlag(flagKey))) {
      throw new NotFoundError('flag', flagKey);
    }
    if (deny === null) {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: userPk(email), SK: denySk(flagKey) },
        }),
      );
      return;
    }
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: userPk(email),
          SK: denySk(flagKey),
          GSI1PK: flagPk(flagKey),
          GSI1SK: `DENY#${email}`,
          entityType: 'developerDeny',
          ...deny,
        },
      }),
    );
  }

  async getGroup(key: string): Promise<Group | null> {
    const item = await this.getItem(groupPk(key), META);
    return item ? this.mapGroup(item) : null;
  }

  async listGroups(): Promise<Group[]> {
    const items = await this.queryGsi1('GROUPS');
    return items.map((item) => this.mapGroup(item)).sort((a, b) => a.key.localeCompare(b.key));
  }

  async createGroup(group: Group): Promise<Group> {
    await this.putCreate({
      PK: groupPk(group.key),
      SK: META,
      GSI1PK: 'GROUPS',
      GSI1SK: group.key,
      entityType: 'group',
      entityKey: group.key,
      ...group,
    });
    return group;
  }

  async updateGroup(
    key: string,
    patch: Partial<Pick<Group, 'description' | 'defaultTtlDays' | 'updatedAt'>>,
    expectedVersion: number,
  ): Promise<Group> {
    const existing = await this.getGroup(key);
    if (!existing) {
      throw new NotFoundError('group', key);
    }
    if (existing.version !== expectedVersion) {
      throw new VersionConflictError('group', key);
    }
    const updated: Group = { ...existing, ...patch, version: existing.version + 1 };
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: groupPk(key),
            SK: META,
            GSI1PK: 'GROUPS',
            GSI1SK: key,
            entityType: 'group',
            entityKey: key,
            ...updated,
          },
          ConditionExpression: 'version = :expected',
          ExpressionAttributeValues: { ':expected': expectedVersion },
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new VersionConflictError('group', key);
      }
      throw error;
    }
    return updated;
  }

  async deleteGroupCascade(key: string): Promise<void> {
    if (!(await this.getGroup(key))) {
      throw new NotFoundError('group', key);
    }
    const meta = await this.getItem(groupPk(key), META);
    const related = await this.queryGsi1(groupPk(key));
    const keys = new Map<string, { PK: string; SK: string }>();
    if (meta) {
      keys.set(`${meta.PK}|${meta.SK}`, { PK: String(meta.PK), SK: String(meta.SK) });
    }
    for (const item of related) {
      keys.set(`${item.PK}|${item.SK}`, { PK: String(item.PK), SK: String(item.SK) });
    }
    await this.transact(
      [...keys.values()].map((keyPair) => ({
        Delete: { TableName: this.tableName, Key: keyPair },
      })),
    );
  }

  async getGroupDetail(key: string): Promise<GroupDetail> {
    const group = await this.getGroup(key);
    if (!group) {
      throw new NotFoundError('group', key);
    }
    const related = await this.queryGsi1(groupPk(key));
    const members: Membership[] = [];
    const flagGrants: GroupGrant[] = [];
    for (const item of related) {
      const gsi1sk = String(item.GSI1SK);
      if (gsi1sk.startsWith('USER#')) {
        members.push({
          email: String(item.email),
          groupKey: key,
          expiresAt: (item.expiresAt as string | null) ?? null,
          addedAt: String(item.addedAt),
          addedBy: String(item.addedBy),
        });
      } else if (gsi1sk.startsWith('FLAG#')) {
        flagGrants.push({
          flagKey: String(item.flagKey),
          groupKey: key,
          expiresAt: (item.expiresAt as string | null) ?? null,
          createdAt: String(item.createdAt),
        });
      }
    }
    return { group, members, flagGrants };
  }

  async setMembership(
    groupKey: string,
    email: string,
    membership: Membership | null,
  ): Promise<void> {
    if (!(await this.getGroup(groupKey))) {
      throw new NotFoundError('group', groupKey);
    }
    if (membership !== null && !(await this.getUser(email))) {
      throw new NotFoundError('user', email);
    }
    if (membership === null) {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: userPk(email), SK: membershipSk(groupKey) },
        }),
      );
      return;
    }
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: userPk(email),
          SK: membershipSk(groupKey),
          GSI1PK: groupPk(groupKey),
          GSI1SK: userPk(email),
          entityType: 'membership',
          ...membership,
          ttl: ttlFromExpiry(membership.expiresAt, 1),
        },
      }),
    );
  }

  async appendAudit(entry: AuditEntry): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: 'AUDIT',
          SK: auditSk(entry.at, entry.id),
          recordType: 'audit',
          id: entry.id,
          at: entry.at,
          actorEmail: entry.actorEmail,
          action: entry.action,
          auditEntityType: entry.entityType,
          entityKey: entry.entityKey,
          summary: entry.summary,
          accessClients: entry.accessClients,
          ttl: ttlFromNow(new Date(entry.at), 90),
        },
      }),
    );
  }

  async listAudit(options: {
    limit: number;
    cursor?: string;
    accessClient?: string;
  }): Promise<AuditPage> {
    const expressionAttributeValues: Record<string, unknown> = { ':pk': 'AUDIT' };
    let filterExpression: string | undefined;
    if (options.accessClient) {
      expressionAttributeValues[':client'] = options.accessClient;
      expressionAttributeValues[':empty'] = [];
      // Platform-wide (empty) entries always match; otherwise require the client.
      filterExpression =
        'attribute_not_exists(accessClients) OR accessClients = :empty OR contains(accessClients, :client)';
    }

    const result = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: expressionAttributeValues,
        FilterExpression: filterExpression,
        ScanIndexForward: false,
        Limit: options.limit,
        ExclusiveStartKey: options.cursor
          ? { PK: 'AUDIT', SK: options.cursor }
          : undefined,
      }),
    );
    const mapped = ((result.Items as Item[] | undefined) ?? []).map(
      (item): AuditEntry => ({
        id: String(item.id),
        at: String(item.at),
        actorEmail: String(item.actorEmail),
        action: String(item.action),
        entityType: item.auditEntityType as AuditEntry['entityType'],
        entityKey: String(item.entityKey),
        summary: String(item.summary),
        accessClients: Array.isArray(item.accessClients)
          ? (item.accessClients as string[])
          : [],
      }),
    );
    const last = mapped[mapped.length - 1];
    const nextCursor =
      result.LastEvaluatedKey && last ? auditSk(last.at, last.id) : null;
    return { items: mapped, nextCursor };
  }

  async resetTo(seed: SeedSnapshot): Promise<void> {
    // Scan + batch delete all items, then rewrite seed.
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const scanned = await this.doc.send(
        new ScanCommand({
          TableName: this.tableName,
          ProjectionExpression: 'PK, SK',
          ExclusiveStartKey,
        }),
      );
      const items = (scanned.Items as Item[] | undefined) ?? [];
      if (items.length > 0) {
        await this.transact(
          items.map((item) => ({
            Delete: {
              TableName: this.tableName,
              Key: { PK: item.PK, SK: item.SK },
            },
          })),
        );
      }
      ExclusiveStartKey = scanned.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    for (const user of seed.users) {
      await this.createUser(user);
    }
    for (const flag of seed.flags) {
      await this.createFlag(flag);
    }
    for (const group of seed.groups) {
      await this.createGroup(group);
    }
    for (const membership of seed.memberships) {
      await this.setMembership(membership.groupKey, membership.email, membership);
    }
    for (const grant of seed.roleGrants) {
      await this.setRoleGrant(grant.flagKey, grant);
    }
    for (const grant of seed.groupGrants) {
      await this.setGroupGrant(grant.flagKey, grant.groupKey, grant);
    }
    for (const grant of seed.userGrants) {
      await this.setUserGrant(grant.flagKey, grant.email, grant);
    }
    for (const deny of seed.developerDenies) {
      await this.setDeveloperDeny(deny.email, deny.flagKey, deny);
    }
    for (const entry of seed.audit ?? []) {
      await this.appendAudit(entry);
    }
  }
}
