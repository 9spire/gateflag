import type { AuditEntry } from '@gateflag/core';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Select } from '../ui/select.js';
import { accessClientLabel } from './accessClients.js';

export function AuditList({
  items,
  accessClients,
  accessClientFilter,
  onAccessClientFilterChange,
  onLoadMore,
  hasMore,
}: {
  items: AuditEntry[];
  accessClients: string[];
  accessClientFilter: string;
  onAccessClientFilterChange: (value: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}) {
  return (
    <div className="gf:space-y-3">
      <label className="gf:block gf:space-y-1">
        <span className="gf:text-sm gf:font-medium">App</span>
        <Select
          aria-label="Filter audit by App"
          value={accessClientFilter}
          onChange={(event) => onAccessClientFilterChange(event.target.value)}
        >
          <option value="">All Apps</option>
          {accessClients.map((client) => (
            <option key={client} value={client}>
              {accessClientLabel(client)}
            </option>
          ))}
        </Select>
      </label>

      {(items ?? []).length === 0 ? (
        <p className="gf:rounded-md gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-bg)] gf:p-3 gf:text-sm gf:text-[var(--color-gf-muted)]">
          No audit events yet
          {accessClientFilter ? ` for ${accessClientLabel(accessClientFilter)}` : ''}.
        </p>
      ) : (
        <ul className="gf:space-y-2">
          {(items ?? []).map((entry) => {
            const clients = entry.accessClients ?? [];
            return (
              <li
                key={`${entry.at}-${entry.id}`}
                className="gf:border-b gf:border-[var(--color-gf-border)] gf:pb-2 gf:text-sm"
              >
                <div className="gf:flex gf:flex-wrap gf:items-center gf:gap-2">
                  <span className="gf:font-medium" title={entry.at}>
                    {formatRelative(entry.at)}
                  </span>
                  <Badge>{entry.action}</Badge>
                </div>
                <div className="gf:mt-1">
                  {entry.actorEmail} · {entry.entityType}/{entry.entityKey}
                </div>
                <div className="gf:mt-1 gf:flex gf:flex-wrap gf:gap-2">
                  {clients.length === 0 ? (
                    <Badge tone="success">All Apps</Badge>
                  ) : (
                    clients.map((client) => (
                      <Badge key={client}>{accessClientLabel(client)}</Badge>
                    ))
                  )}
                </div>
                <div className="gf:mt-1 gf:text-[var(--color-gf-muted)]">{entry.summary}</div>
              </li>
            );
          })}
        </ul>
      )}
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
