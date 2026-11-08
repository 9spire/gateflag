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
  });
}

export function createAuditId(now: Date, nonce: string): string {
  return `${now.getTime()}-${nonce}`;
}
