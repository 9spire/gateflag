import { useMemo, useState } from 'react';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Select } from '../ui/select.js';
import { toastSuccess } from './toast.js';

const STORAGE_KEY = 'gateflag:enterprise-role-links';

/** Demo catalog returned by the mocked enterprise roles API. */
export const MOCK_ENTERPRISE_ROLES = [
  {
    id: 'okta:gateflag-admins',
    label: 'Gateflag Admins',
    holders: ['alex@example.com', 'riley@example.com', 'casey@example.com'],
  },
  {
    id: 'okta:beta-program',
    label: 'Beta Program',
    holders: ['pat@example.com'],
  },
  {
    id: 'okta:support-agents',
    label: 'Support Agents',
    holders: ['jordan@example.com'],
  },
  {
    id: 'okta:storefront-eng',
    label: 'Storefront Engineering',
    holders: ['dana@example.com'],
  },
  {
    id: 'entra:product-owners',
    label: 'Product Owners',
    holders: [],
  },
] as const;

type LinkMap = Record<string, { roleId: string; rolesApiUrl: string }>;

function loadLinks(): LinkMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as LinkMap;
  } catch {
    return {};
  }
}

function saveLinks(links: LinkMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export function getLinkedEnterpriseRole(groupKey: string): string | null {
  return loadLinks()[groupKey]?.roleId ?? null;
}

const SUGGESTED: Record<string, string> = {
  admins: 'okta:gateflag-admins',
  'beta-testers': 'okta:beta-program',
  'support-team': 'okta:support-agents',
  'storefront-eng': 'okta:storefront-eng',
  'product-owners': 'entra:product-owners',
};

export function EnterpriseRoleLink({ groupKey }: { groupKey: string }) {
  const existing = useMemo(() => loadLinks()[groupKey], [groupKey]);
  const [rolesApiUrl, setRolesApiUrl] = useState(
    existing?.rolesApiUrl ?? 'https://idp.example.com/api/v1/roles',
  );
  const [linkedRoleId, setLinkedRoleId] = useState(existing?.roleId ?? SUGGESTED[groupKey] ?? '');
  const [fetched, setFetched] = useState<typeof MOCK_ENTERPRISE_ROLES | null>(null);
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const linked =
    fetched?.find((role) => role.id === linkedRoleId) ??
    MOCK_ENTERPRISE_ROLES.find((role) => role.id === linkedRoleId);

  async function fetchRoles() {
    setFetching(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    setFetched([...MOCK_ENTERPRISE_ROLES]);
    setFetching(false);
    toastSuccess('Mock roles API returned 5 enterprise roles');
  }

  function saveLink() {
    if (!groupKey || !linkedRoleId) {
      return;
    }
    const links = loadLinks();
    links[groupKey] = { roleId: linkedRoleId, rolesApiUrl };
    saveLinks(links);
    toastSuccess(`Linked ${groupKey} → ${linkedRoleId} (demo only)`);
  }

  function clearLink() {
    const links = loadLinks();
    delete links[groupKey];
    saveLinks(links);
    setLinkedRoleId('');
    toastSuccess('Cleared enterprise role link (demo only)');
  }

  async function syncNow() {
    if (!linked) {
      return;
    }
    setSyncing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setSyncing(false);
    const count = linked.holders.length;
    toastSuccess(
      count === 0
        ? `Sync dry-run: no holders for ${linked.id}`
        : `Sync dry-run: would add ${count} member${count === 1 ? '' : 's'} from ${linked.id}`,
    );
  }

  return (
    <section
      className="gf:space-y-3 gf:rounded-md gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-bg)] gf:p-3"
      aria-labelledby="enterprise-role-heading"
    >
      <div className="gf:flex gf:items-start gf:justify-between gf:gap-2">
        <div>
          <h3 id="enterprise-role-heading" className="gf:text-sm gf:font-semibold">
            Link enterprise role
          </h3>
          <p className="gf:mt-1 gf:text-xs gf:text-[var(--color-gf-muted)]">
            Map an IdP / directory role onto this Gateflag group. Mock only — nothing is written to
            the real memberships API.
          </p>
        </div>
        <Badge tone="default">Demo</Badge>
      </div>

      <label className="gf:block gf:space-y-1">
        <span className="gf:text-sm gf:font-medium">Roles API endpoint</span>
        <Input
          aria-label="Enterprise roles API endpoint"
          value={rolesApiUrl}
          onChange={(event) => setRolesApiUrl(event.target.value)}
          placeholder="https://idp.example.com/api/v1/roles"
        />
      </label>

      <div className="gf:flex gf:flex-wrap gf:gap-2">
        <Button variant="secondary" disabled={fetching} onClick={() => void fetchRoles()}>
          {fetching ? 'Fetching…' : 'Fetch roles'}
        </Button>
        {fetched ? (
          <span className="gf:self-center gf:text-xs gf:text-[var(--color-gf-muted)]">
            {fetched.length} roles from mock API
          </span>
        ) : null}
      </div>

      {fetched ? (
        <label className="gf:block gf:space-y-1">
          <span className="gf:text-sm gf:font-medium">Enterprise role</span>
          <Select
            aria-label="Enterprise role"
            value={linkedRoleId}
            onChange={(event) => setLinkedRoleId(event.target.value)}
          >
            <option value="">Select a role…</option>
            {fetched.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label} ({role.id})
              </option>
            ))}
          </Select>
        </label>
      ) : (
        <label className="gf:block gf:space-y-1">
          <span className="gf:text-sm gf:font-medium">Linked role id</span>
          <Input
            aria-label="Linked enterprise role id"
            value={linkedRoleId}
            onChange={(event) => setLinkedRoleId(event.target.value)}
            placeholder="okta:beta-program"
          />
          <p className="gf:text-xs gf:text-[var(--color-gf-muted)]">
            Fetch roles to pick from a list, or paste a role id.
          </p>
        </label>
      )}

      {linked ? (
        <div className="gf:rounded-md gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-surface)] gf:p-2 gf:text-sm">
          <div className="gf:font-medium">{linked.label}</div>
          <div className="gf:text-xs gf:text-[var(--color-gf-muted)]">{linked.id}</div>
          <div className="gf:mt-2 gf:text-xs">
            Directory holders ({linked.holders.length}):{' '}
            {linked.holders.length === 0 ? 'none' : linked.holders.join(', ')}
          </div>
        </div>
      ) : null}

      <div className="gf:flex gf:flex-wrap gf:gap-2">
        <Button variant="secondary" disabled={!groupKey || !linkedRoleId} onClick={saveLink}>
          Save link
        </Button>
        <Button variant="secondary" disabled={!linked || syncing} onClick={() => void syncNow()}>
          {syncing ? 'Syncing…' : 'Sync memberships'}
        </Button>
        {existing ? (
          <Button variant="ghost" onClick={clearLink}>
            Clear link
          </Button>
        ) : null}
      </div>
    </section>
  );
}
