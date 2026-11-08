import type { Group, User } from '@gateflag/core';
import { useMemo, useState } from 'react';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Input } from '../ui/input.js';
import { parseEmailChips } from './emailChips.js';
import { filterByQuery, paginate } from './pagination.js';
import { isConflict, useAdminApi } from './useAdminApi.js';
import { toastConflict, toastError, toastSuccess } from './toast.js';

type GroupRow = Group & { memberCount?: number };
type GroupDetail = Group & {
  members?: Array<{ email: string; expiresAt: string | null }>;
  flagGrants?: Array<{ flagKey: string }>;
};

export function GroupList({
  groups,
  onEdit,
  onCreate,
}: {
  groups: GroupRow[];
  onEdit: (key: string) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = filterByQuery(groups, query, (group) => `${group.key} ${group.description}`);
  const { pageItems, totalPages } = paginate(filtered, page);

  return (
    <div className="gf:space-y-3">
      <div className="gf:flex gf:gap-2">
        <Input
          aria-label="Search groups"
          placeholder="Search groups"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <Button onClick={onCreate}>Create group</Button>
      </div>
      <ul className="gf:space-y-2">
        {pageItems.map((group) => (
          <li
            key={group.key}
            className="gf:flex gf:items-center gf:justify-between gf:border-b gf:border-[var(--color-gf-border)] gf:pb-2"
          >
            <div>
              <div className="gf:font-medium">{group.key}</div>
              <div className="gf:text-sm gf:text-[var(--color-gf-muted)]">
                {group.description} · {group.memberCount ?? 0} members
              </div>
            </div>
            <Button variant="secondary" onClick={() => onEdit(group.key)}>
              Edit
            </Button>
          </li>
        ))}
      </ul>
      <div className="gf:text-sm">
        Page {page} / {totalPages}
      </div>
    </div>
  );
}

export function GroupEditor({
  mode,
  initial,
  users,
  onBack,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial?: GroupDetail;
  users: User[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const { client, authHeaders } = useAdminApi();
  const [key, setKey] = useState(initial?.key ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [temporary, setTemporary] = useState(initial?.defaultTtlDays != null);
  const [ttlDays, setTtlDays] = useState(initial?.defaultTtlDays ?? 7);
  const [memberQuery, setMemberQuery] = useState('');
  const [selected, setSelected] = useState(
    new Set(initial?.members?.map((member) => member.email) ?? []),
  );
  const [emailRaw, setEmailRaw] = useState('');
  const [emailInvalid, setEmailInvalid] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const eligibleUsers = useMemo(
    () => users.filter((user) => user.role !== 'developer'),
    [users],
  );
  const visibleUsers = filterByQuery(eligibleUsers, memberQuery, (user) => user.email);

  async function save() {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const defaultTtlDays = temporary ? ttlDays : null;
      if (mode === 'create') {
        await client.createGroup({ key, description, defaultTtlDays }, headers);
      } else {
        await client.updateGroup(
          key,
          { description, defaultTtlDays, version: initial!.version },
          headers,
        );
      }
      const existing = new Set(initial?.members?.map((member) => member.email) ?? []);
      await Promise.all([
        ...[...selected]
          .filter((email) => !existing.has(email))
          .map((email) => client.addMember(key, { email }, headers)),
        ...[...existing]
          .filter((email) => !selected.has(email))
          .map((email) => client.removeMember(key, email, headers)),
      ]);
      toastSuccess('Group saved');
      onSaved();
    } catch (error) {
      if (isConflict(error)) {
        toastConflict();
      } else {
        toastError(error instanceof Error ? error.message : 'Save failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gf:space-y-4">
      <Button variant="ghost" onClick={onBack}>
        Back
      </Button>
      <label className="gf:block gf:space-y-1">
        <span className="gf:text-sm gf:font-medium">Key</span>
        <Input
          aria-label="Group key"
          disabled={mode === 'edit'}
          value={key}
          onChange={(event) => setKey(event.target.value.toLowerCase())}
        />
      </label>
      <label className="gf:block gf:space-y-1">
        <span className="gf:text-sm gf:font-medium">Description</span>
        <Input
          aria-label="Group description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="gf:flex gf:items-center gf:gap-2 gf:text-sm">
        <input
          type="checkbox"
          checked={temporary}
          onChange={(event) => setTemporary(event.target.checked)}
        />
        Temporary
      </label>
      {temporary ? (
        <label className="gf:block gf:space-y-1">
          <span className="gf:text-sm gf:font-medium">Default TTL (days)</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={ttlDays}
            onChange={(event) => setTtlDays(Number(event.target.value))}
          />
        </label>
      ) : (
        <Badge>Evergreen</Badge>
      )}
      <div>
        <div className="gf:mb-2 gf:text-sm gf:font-medium">Members</div>
        <p className="gf:mb-2 gf:text-xs gf:text-[var(--color-gf-muted)]">
          Developers are excluded because they have automatic GATED access.
        </p>
        <Input
          aria-label="Search members"
          placeholder="Search members"
          value={memberQuery}
          onChange={(event) => setMemberQuery(event.target.value)}
        />
        <ul className="gf:mt-2 gf:space-y-1" data-testid="group-member-picker">
          {visibleUsers.map((user) => (
            <li key={user.email}>
              <label className="gf:flex gf:items-center gf:gap-2 gf:text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(user.email)}
                  onChange={(event) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (event.target.checked) {
                        next.add(user.email);
                      } else {
                        next.delete(user.email);
                      }
                      return next;
                    });
                  }}
                />
                {user.email}
                {initial?.members?.some((member) => member.email === user.email) ? (
                  <Badge>Current member</Badge>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
        <div className="gf:mt-2 gf:flex gf:gap-2">
          <Input
            aria-label="Add member by email"
            placeholder="Add by email"
            value={emailRaw}
            onChange={(event) => setEmailRaw(event.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => {
              const parsed = parseEmailChips(emailRaw);
              setEmailInvalid(parsed.invalid);
              setSelected((prev) => new Set([...prev, ...parsed.valid]));
              setEmailRaw('');
            }}
          >
            Add
          </Button>
        </div>
        {emailInvalid.length > 0 ? (
          <p className="gf:mt-1 gf:text-sm gf:text-[var(--color-gf-danger)]">
            Invalid: {emailInvalid.join(', ')}
          </p>
        ) : null}
      </div>
      {initial?.flagGrants && initial.flagGrants.length > 0 ? (
        <div>
          <div className="gf:mb-1 gf:text-sm gf:font-medium">Flag grants</div>
          {initial.flagGrants.map((grant) => (
            <div key={grant.flagKey} className="gf:text-sm">
              {grant.flagKey}
            </div>
          ))}
        </div>
      ) : null}
      <div className="gf:flex gf:gap-2">
        <Button disabled={loading} onClick={() => void save()}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
        {mode === 'edit' ? (
          <Button
            variant="danger"
            disabled={loading}
            onClick={() => {
              void (async () => {
                setLoading(true);
                try {
                  await client.deleteGroup(key, await authHeaders());
                  toastSuccess('Group deleted');
                  onSaved();
                } catch (error) {
                  toastError(error instanceof Error ? error.message : 'Delete failed');
                } finally {
                  setLoading(false);
                }
              })();
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
