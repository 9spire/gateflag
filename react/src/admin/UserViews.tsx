import type { Flag, User } from '@gateflag/core';
import { useState } from 'react';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Input } from '../ui/input.js';
import { filterByQuery, paginate } from './pagination.js';
import { isConflict, useAdminApi } from './useAdminApi.js';
import { toastConflict, toastError, toastSuccess } from './toast.js';

type UserDetail = User & {
  developerDenies?: Array<{ flagKey: string }>;
  userGrants?: Array<{ flagKey: string }>;
  gatedFlagsWithAccessRole?: string[];
};

export function UserList({
  users,
  onEdit,
  onCreate,
}: {
  users: User[];
  onEdit: (email: string) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = filterByQuery(users, query, (user) => `${user.email} ${user.role}`);
  const { pageItems, totalPages } = paginate(filtered, page);

  return (
    <div className="gf:space-y-3">
      <div className="gf:flex gf:gap-2">
        <Input
          aria-label="Search users"
          placeholder="Search users"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <Button onClick={onCreate}>Create user</Button>
      </div>
      <ul className="gf:space-y-2">
        {pageItems.map((user) => (
          <li
            key={user.email}
            className="gf:flex gf:items-center gf:justify-between gf:border-b gf:border-[var(--color-gf-border)] gf:pb-2"
          >
            <div>
              <div className="gf:font-medium">{user.email}</div>
              <div className="gf:flex gf:gap-2">
                <Badge>{user.role}</Badge>
                {user.isAdmin ? <Badge tone="success">Admin (managed by identity provider)</Badge> : null}
              </div>
            </div>
            <Button variant="secondary" onClick={() => onEdit(user.email)}>
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

export function UserEditor({
  mode,
  initial,
  flags,
  selfEmail,
  onBack,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial?: UserDetail;
  flags: Flag[];
  selfEmail?: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { client, authHeaders } = useAdminApi();
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<User['role']>(initial?.role ?? 'none');
  const [loading, setLoading] = useState(false);
  const [denies, setDenies] = useState(
    new Set(initial?.developerDenies?.map((deny) => deny.flagKey) ?? []),
  );

  const gated = flags.filter((flag) => flag.universalState === 'GATED');

  async function save() {
    setLoading(true);
    try {
      const headers = await authHeaders();
      if (mode === 'create') {
        await client.createUser({ email, role }, headers);
      } else {
        await client.updateUser(email, { role, version: initial!.version }, headers);
        if (role === 'developer') {
          const original = new Set(initial?.developerDenies?.map((deny) => deny.flagKey) ?? []);
          await Promise.all([
            ...[...denies]
              .filter((key) => !original.has(key))
              .map((flagKey) => client.denyFlag(email, { flagKey }, headers)),
            ...[...original]
              .filter((key) => !denies.has(key))
              .map((flagKey) => client.allowFlag(email, { flagKey }, headers)),
          ]);
        }
      }
      toastSuccess('User saved');
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
        <span className="gf:text-sm gf:font-medium">Email</span>
        <Input
          aria-label="User email"
          disabled={mode === 'edit'}
          value={email}
          onChange={(event) => setEmail(event.target.value.toLowerCase())}
        />
      </label>
      <label className="gf:block gf:space-y-1">
        <span className="gf:text-sm gf:font-medium">Role</span>
        <select
          aria-label="User role"
          className="gf:w-full gf:rounded-md gf:border gf:border-[var(--color-gf-border)] gf:px-3 gf:py-1.5 gf:text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value as User['role'])}
        >
          <option value="none">none</option>
          <option value="access">access</option>
          <option value="developer">developer</option>
        </select>
      </label>
      {initial?.isAdmin ? (
        <Badge tone="success">Admin (managed by identity provider)</Badge>
      ) : null}
      {role === 'developer' ? (
        <div>
          <div className="gf:mb-2 gf:text-sm gf:font-medium">Developer auto-granted flags</div>
          <p className="gf:mb-2 gf:text-xs gf:text-[var(--color-gf-muted)]">
            Developers cannot be added to groups.
          </p>
          {gated.map((flag) => (
            <label key={flag.key} className="gf:flex gf:items-center gf:gap-2 gf:text-sm">
              <input
                type="checkbox"
                aria-label={`Toggle ${flag.key}`}
                checked={!denies.has(flag.key)}
                onChange={(event) => {
                  setDenies((prev) => {
                    const next = new Set(prev);
                    if (event.target.checked) {
                      next.delete(flag.key);
                    } else {
                      next.add(flag.key);
                    }
                    return next;
                  });
                }}
              />
              {flag.key}
            </label>
          ))}
        </div>
      ) : (
        <div>
          <div className="gf:mb-2 gf:text-sm gf:font-medium">Individual flag grants</div>
          {gated.map((flag) => {
            const viaRole = initial?.gatedFlagsWithAccessRole?.includes(flag.key);
            return (
              <div key={flag.key} className="gf:flex gf:items-center gf:gap-2 gf:text-sm">
                <input type="checkbox" checked={Boolean(viaRole)} readOnly disabled={Boolean(viaRole)} />
                {flag.key}
                {viaRole ? <Badge>Access role</Badge> : null}
              </div>
            );
          })}
        </div>
      )}
      <div className="gf:flex gf:gap-2">
        <Button disabled={loading} onClick={() => void save()}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
        {mode === 'edit' ? (
          <Button
            variant="danger"
            disabled={loading || email === selfEmail}
            onClick={() => {
              void (async () => {
                setLoading(true);
                try {
                  await client.deleteUser(email, await authHeaders());
                  toastSuccess('User deleted');
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
