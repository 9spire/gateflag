import type { Flag, Group, User } from '@gateflag/core';
import { useState } from 'react';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Input } from '../ui/input.js';
import { parseEmailChips } from './emailChips.js';
import { filterByQuery, paginate } from './pagination.js';
import { isConflict, useAdminApi } from './useAdminApi.js';
import { toastConflict, toastError, toastSuccess } from './toast.js';

type FlagDetail = Flag & {
  roleGrants?: Array<{ role: string }>;
  groupGrants?: Array<{ groupKey: string; expiresAt: string | null }>;
  userGrants?: Array<{ email: string; expiresAt: string | null }>;
  developerDenies?: Array<{ email: string }>;
};

export function FlagList({
  flags,
  accessClientId,
  onEdit,
  onCreate,
}: {
  flags: Flag[];
  accessClientId?: string;
  onEdit: (key: string) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const [appFilter, setAppFilter] = useState(accessClientId ?? '');
  const [page, setPage] = useState(1);

  const filtered = filterByQuery(
    flags.filter((flag) => !appFilter || flag.accessClients.includes(appFilter)),
    query,
    (flag) => `${flag.key} ${flag.description} ${flag.universalState}`,
  );
  const { pageItems, totalPages } = paginate(filtered, page);

  return (
    <div className="gf:space-y-3">
      <div className="gf:flex gf:flex-wrap gf:gap-2">
        <Input
          aria-label="Search flags"
          placeholder="Search flags"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Show flags for"
          className="gf:rounded-md gf:border gf:border-[var(--color-gf-border)] gf:px-2 gf:py-1.5 gf:text-sm"
          value={appFilter}
          onChange={(event) => {
            setAppFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All apps</option>
          <option value="storefront">storefront</option>
          <option value="checkout">checkout</option>
          <option value="support-portal">support-portal</option>
        </select>
        <Button onClick={onCreate}>Create flag</Button>
      </div>
      <ul className="gf:space-y-2">
        {pageItems.map((flag) => (
          <li
            key={flag.key}
            className="gf:flex gf:items-start gf:justify-between gf:gap-3 gf:border-b gf:border-[var(--color-gf-border)] gf:pb-2"
          >
            <div>
              <div className="gf:font-medium">{flag.key}</div>
              <div className="gf:text-sm gf:text-[var(--color-gf-muted)]">{flag.description}</div>
              <div className="gf:mt-1 gf:flex gf:gap-2">
                <Badge>{flag.universalState}</Badge>
                <span className="gf:text-xs gf:text-[var(--color-gf-muted)]">
                  {flag.accessClients.join(', ')}
                </span>
              </div>
            </div>
            <Button variant="secondary" onClick={() => onEdit(flag.key)}>
              Edit
            </Button>
          </li>
        ))}
      </ul>
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

export function FlagEditor({
  mode,
  initial,
  users,
  groups,
  onBack,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial?: FlagDetail;
  users: User[];
  groups: Group[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const { client, authHeaders } = useAdminApi();
  const [key, setKey] = useState(initial?.key ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [universalState, setUniversalState] = useState<'GATED' | 'RELEASED' | 'DISABLED'>(
    initial?.universalState ?? 'GATED',
  );
  const [accessClients, setAccessClients] = useState<string[]>(
    initial?.accessClients ?? ['storefront'],
  );
  const [hasAccessRole, setHasAccessRole] = useState(
    Boolean(initial?.roleGrants?.some((grant) => grant.role === 'access')),
  );
  const [pendingRelease, setPendingRelease] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailRaw, setEmailRaw] = useState('');
  const [emailInvalid, setEmailInvalid] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState<string[]>(
    initial?.userGrants?.map((grant) => grant.email) ?? [],
  );

  const developers = users.filter((user) => user.role === 'developer');
  const nonDevelopers = users.filter((user) => user.role !== 'developer');

  async function save(nextState = universalState) {
    setLoading(true);
    try {
      const headers = await authHeaders();
      if (mode === 'create') {
        await client.createFlag(
          {
            key,
            description,
            universalState: nextState === 'DISABLED' ? 'GATED' : nextState,
            accessClients,
          },
          headers,
        );
        if (hasAccessRole) {
          await client.setRoleAccess(key, { role: 'access', hasAccess: true }, headers);
        }
        toastSuccess('Flag created');
      } else {
        await client.updateFlag(
          key,
          {
            description,
            universalState: nextState,
            accessClients,
            version: initial!.version,
          },
          headers,
        );
        await client.setRoleAccess(key, { role: 'access', hasAccess: hasAccessRole }, headers);
        toastSuccess('Flag saved');
      }
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

  function requestState(next: 'GATED' | 'RELEASED' | 'DISABLED') {
    if (next === 'RELEASED' && universalState !== 'RELEASED') {
      setPendingRelease(true);
      return;
    }
    setUniversalState(next);
  }

  function addEmails() {
    const parsed = parseEmailChips(emailRaw);
    setEmailInvalid(parsed.invalid);
    setManualEmails((prev) => [...new Set([...prev, ...parsed.valid])]);
    setEmailRaw('');
  }

  return (
    <div className="gf:space-y-4">
      <Button variant="ghost" onClick={onBack}>
        Back
      </Button>
      <label className="gf:block gf:space-y-1">
        <span className="gf:text-sm gf:font-medium">Key</span>
        <Input
          aria-label="Flag key"
          disabled={mode === 'edit'}
          value={key}
          onChange={(event) => setKey(event.target.value.toUpperCase())}
        />
      </label>
      <label className="gf:block gf:space-y-1">
        <span className="gf:text-sm gf:font-medium">Description</span>
        <Input
          aria-label="Flag description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <fieldset className="gf:space-y-2">
        <legend className="gf:text-sm gf:font-medium">Universal state</legend>
        <div className="gf:flex gf:flex-wrap gf:gap-2">
          <Button
            variant={universalState === 'GATED' ? 'default' : 'secondary'}
            onClick={() => requestState('GATED')}
          >
            GATED
          </Button>
          <Button
            variant={universalState === 'RELEASED' ? 'default' : 'secondary'}
            onClick={() => requestState('RELEASED')}
          >
            RELEASED
          </Button>
          {mode === 'edit' ? (
            <Button
              variant={universalState === 'DISABLED' ? 'danger' : 'secondary'}
              onClick={() => requestState('DISABLED')}
            >
              DISABLED (emergency off)
            </Button>
          ) : null}
        </div>
      </fieldset>
      <fieldset className="gf:space-y-2">
        <legend className="gf:text-sm gf:font-medium">Access clients</legend>
        {['storefront', 'checkout', 'support-portal'].map((client) => (
          <label key={client} className="gf:flex gf:items-center gf:gap-2 gf:text-sm">
            <input
              type="checkbox"
              checked={accessClients.includes(client)}
              onChange={(event) => {
                setAccessClients((prev) =>
                  event.target.checked
                    ? [...prev, client]
                    : prev.filter((value) => value !== client),
                );
              }}
            />
            {client}
          </label>
        ))}
      </fieldset>
      {universalState === 'GATED' ? (
        <div className="gf:space-y-3 gf:rounded-md gf:border gf:border-[var(--color-gf-border)] gf:p-3">
          <label className="gf:flex gf:items-center gf:gap-2 gf:text-sm">
            <input
              type="checkbox"
              checked={hasAccessRole}
              onChange={(event) => setHasAccessRole(event.target.checked)}
            />
            Access role
          </label>
          <div>
            <div className="gf:mb-1 gf:text-sm gf:font-medium">Groups</div>
            {groups.map((group) => (
              <div key={group.key} className="gf:text-sm">
                {group.key}
              </div>
            ))}
          </div>
          <div>
            <div className="gf:mb-1 gf:text-sm gf:font-medium">Automatic: developer role</div>
            <ul className="gf:space-y-1">
              {developers.map((user) => (
                <li key={user.email} className="gf:text-sm">
                  {user.email}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="gf:mb-1 gf:text-sm gf:font-medium">Individual grants</div>
            {nonDevelopers.map((user) => (
              <label key={user.email} className="gf:flex gf:items-center gf:gap-2 gf:text-sm">
                <input
                  type="checkbox"
                  checked={manualEmails.includes(user.email)}
                  onChange={(event) => {
                    setManualEmails((prev) =>
                      event.target.checked
                        ? [...prev, user.email]
                        : prev.filter((email) => email !== user.email),
                    );
                  }}
                />
                {user.email}
              </label>
            ))}
            <div className="gf:mt-2 gf:flex gf:gap-2">
              <Input
                aria-label="Add by email"
                placeholder="Add by email"
                value={emailRaw}
                onChange={(event) => setEmailRaw(event.target.value)}
              />
              <Button variant="secondary" onClick={addEmails}>
                Add
              </Button>
            </div>
            {emailInvalid.length > 0 ? (
              <p className="gf:mt-1 gf:text-sm gf:text-[var(--color-gf-danger)]">
                Invalid: {emailInvalid.join(', ')}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="gf:flex gf:gap-2">
        <Button disabled={loading || accessClients.length === 0} onClick={() => void save()}>
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
                  await client.deleteFlag(key, await authHeaders());
                  toastSuccess('Flag deleted');
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
      {pendingRelease ? (
        <div
          role="alertdialog"
          aria-label="Confirm release"
          className="gf:rounded-md gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-bg)] gf:p-3"
        >
          <p className="gf:text-sm">
            Everyone will get access, regardless of the grants below.
          </p>
          <div className="gf:mt-2 gf:flex gf:gap-2">
            <Button
              onClick={() => {
                setUniversalState('RELEASED');
                setPendingRelease(false);
              }}
            >
              Confirm
            </Button>
            <Button variant="secondary" onClick={() => setPendingRelease(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="gf:flex gf:items-center gf:gap-2 gf:text-sm">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </Button>
      <span>
        Page {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
