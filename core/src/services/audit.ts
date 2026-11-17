import type { AuditEntry } from '../domain/types.js';
import type { Repository } from '../repository/Repository.js';

export async function writeAudit(
  repo: Repository,
  input: {
    actorEmail: string;
    action: string;
    entityType: AuditEntry['entityType'];
    entityKey: string;
    summary: string;
    now: Date;
    id: string;
    accessClients?: string[];
  },
): Promise<void> {
  await repo.appendAudit({
    id: input.id,
    at: input.now.toISOString(),
    actorEmail: input.actorEmail,
    action: input.action,
    entityType: input.entityType,
    entityKey: input.entityKey,
    summary: input.summary,
    accessClients: input.accessClients ?? [],
  });
}

export function createAuditId(now: Date, nonce: string): string {
  return `${now.getTime()}-${nonce}`;
}

/** Include entry when listing for a given access client. */
export function auditMatchesAccessClient(
  entry: Pick<AuditEntry, 'accessClients'>,
  accessClient: string | undefined,
): boolean {
  if (!accessClient) {
    return true;
  }
  if (entry.accessClients.length === 0) {
    return true;
  }
  return entry.accessClients.includes(accessClient);
}
