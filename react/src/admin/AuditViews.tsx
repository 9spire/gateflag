import type { AuditEntry } from '@gateflag/core';
import { Button } from '../ui/button.js';

export function AuditList({
  items,
  onLoadMore,
  hasMore,
}: {
  items: AuditEntry[];
  onLoadMore: () => void;
  hasMore: boolean;
}) {
  return (
    <div className="gf:space-y-3">
      <ul className="gf:space-y-2">
        {items.map((entry) => (
          <li
            key={`${entry.at}-${entry.id}`}
            className="gf:border-b gf:border-[var(--color-gf-border)] gf:pb-2 gf:text-sm"
          >
            <div className="gf:font-medium" title={entry.at}>
              {formatRelative(entry.at)}
            </div>
            <div>
              {entry.actorEmail} · {entry.action} · {entry.entityType}/{entry.entityKey}
            </div>
            <div className="gf:text-[var(--color-gf-muted)]">{entry.summary}</div>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <Button variant="secondary" onClick={onLoadMore}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const delta = Date.now() - then;
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  return new Date(iso).toLocaleString();
}
