import type { AuditEntry, Flag, Group, User } from '@gateflag/core';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useAccessControl } from '../context/AccessControlProvider.js';
import { Dialog, DialogContent } from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { AuditList } from './AuditViews.js';
import { FlagEditor, FlagList } from './FlagViews.js';
import { GroupEditor, GroupList } from './GroupViews.js';
import { UserEditor, UserList } from './UserViews.js';
import { useAdminApi } from './useAdminApi.js';
import { toastError } from './toast.js';

type Tab = 'flags' | 'users' | 'groups' | 'audit';
type View =
  | { kind: 'list' }
  | { kind: 'flag-create' }
  | { kind: 'flag-edit'; key: string }
  | { kind: 'user-create' }
  | { kind: 'user-edit'; email: string }
  | { kind: 'group-create' }
  | { kind: 'group-edit'; key: string };

export function AdminModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { permissions, notifyAdminClosed, config } = useAccessControl();
  const { client, authHeaders } = useAdminApi();
  const [tab, setTab] = useState<Tab>('flags');
  const [view, setView] = useState<View>({ kind: 'list' });
  const [flags, setFlags] = useState<Flag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Array<Group & { memberCount: number }>>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditAccessClient, setAuditAccessClient] = useState('');
  const [flagDetail, setFlagDetail] = useState<(Flag & Record<string, unknown>) | null>(null);
  const [userDetail, setUserDetail] = useState<(User & Record<string, unknown>) | null>(null);
  const [groupDetail, setGroupDetail] = useState<(Group & Record<string, unknown>) | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const headers = await authHeaders();
        const [nextFlags, nextUsers, nextGroups] = await Promise.all([
          client.listFlags(headers),
          client.listUsers(headers),
          client.listGroups(headers),
        ]);
        if (cancelled) {
          return;
        }
        setFlags(nextFlags);
        setUsers(nextUsers);
        setGroups(nextGroups);
        setView({ kind: 'list' });
        setTab('flags');
      } catch (error) {
        if (!cancelled) {
          toastError(error instanceof Error ? error.message : 'Failed to load admin data');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, authHeaders, client]);

  async function reloadLists() {
    try {
      const headers = await authHeaders();
      const [nextFlags, nextUsers, nextGroups] = await Promise.all([
        client.listFlags(headers),
        client.listUsers(headers),
        client.listGroups(headers),
      ]);
      setFlags(nextFlags);
      setUsers(nextUsers);
      setGroups(nextGroups);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to load admin data');
    }
  }

  async function loadAudit(accessClient = auditAccessClient) {
    try {
      const page = await client.listAudit(await authHeaders(), {
        limit: 50,
        accessClient: accessClient || undefined,
      });
      setAudit(page.items ?? []);
      setAuditCursor(page.nextCursor ?? null);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to load audit');
    }
  }

  const auditAccessClients = [
    ...new Set(flags.flatMap((flag) => flag.accessClients ?? [])),
  ].sort((a, b) => a.localeCompare(b));

  async function openFlag(key: string) {
    setView({ kind: 'flag-edit', key });
    setFlagDetail(await client.getFlag(key, await authHeaders()));
  }

  async function openUser(email: string) {
    setView({ kind: 'user-edit', email });
    setUserDetail(await client.getUser(email, await authHeaders()));
  }

  async function openGroup(key: string) {
    setView({ kind: 'group-edit', key });
    setGroupDetail(await client.getGroup(key, await authHeaders()));
  }

  const canUseAdmin = Boolean(permissions?.isAdmin) || Boolean(config.getAdminAuthHeaders);
  if (!canUseAdmin) {
    return null;
  }

  function selectTab(next: Tab) {
    if (next === tab) {
      setView({ kind: 'list' });
      return;
    }
    setTab(next);
    setView({ kind: 'list' });
    if (next === 'audit') {
      void loadAudit();
    }
  }

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) {
            notifyAdminClosed();
          }
        }}
      >
        <DialogContent
          title="Gateflag admin"
          className="gf:h-[min(900px,92vh)] gf:max-h-[92vh] gf:w-[min(calc(52rem+100px),94vw)]"
        >
          <div className="gf:space-y-4">
            <div
              className="gf:inline-flex gf:flex-wrap gf:gap-1 gf:rounded-[0.55rem] gf:border gf:border-[var(--color-gf-border)] gf:bg-[var(--color-gf-bg)] gf:p-1"
              role="tablist"
              aria-label="Admin sections"
            >
              {(['flags', 'users', 'groups', 'audit'] as Tab[]).map((item) => (
                <Button
                  key={item}
                  role="tab"
                  aria-selected={tab === item}
                  variant={tab === item ? 'default' : 'ghost'}
                  className={
                    tab === item
                      ? undefined
                      : 'gf:border-transparent gf:text-[var(--color-gf-fg)] gf:hover:bg-[var(--color-gf-surface)]'
                  }
                  onClick={() => selectTab(item)}
                >
                  {item[0]!.toUpperCase() + item.slice(1)}
                </Button>
              ))}
            </div>

            {tab === 'flags' && view.kind === 'list' ? (
              <FlagList
                flags={flags}
                accessClientId={config.accessClientId}
                onCreate={() => setView({ kind: 'flag-create' })}
                onEdit={(key) => {
                  void openFlag(key);
                }}
              />
            ) : null}
            {tab === 'flags' && view.kind === 'flag-create' ? (
              <FlagEditor
                mode="create"
                users={users}
                groups={groups}
                onBack={() => setView({ kind: 'list' })}
                onSaved={() => {
                  setView({ kind: 'list' });
                  void reloadLists();
                }}
              />
            ) : null}
            {tab === 'flags' && view.kind === 'flag-edit' && flagDetail ? (
              <FlagEditor
                mode="edit"
                initial={flagDetail}
                users={users}
                groups={groups}
                onBack={() => setView({ kind: 'list' })}
                onSaved={() => {
                  setView({ kind: 'list' });
                  void reloadLists();
                }}
              />
            ) : null}

            {tab === 'users' && view.kind === 'list' ? (
              <UserList
                users={users}
                onCreate={() => setView({ kind: 'user-create' })}
                onEdit={(email) => {
                  void openUser(email);
                }}
              />
            ) : null}
            {tab === 'users' && view.kind === 'user-create' ? (
              <UserEditor
                mode="create"
                flags={flags}
                onBack={() => setView({ kind: 'list' })}
                onSaved={() => {
                  setView({ kind: 'list' });
                  void reloadLists();
                }}
              />
            ) : null}
            {tab === 'users' && view.kind === 'user-edit' && userDetail ? (
              <UserEditor
                mode="edit"
                initial={userDetail}
                flags={flags}
                selfEmail={permissions?.email}
                onBack={() => setView({ kind: 'list' })}
                onSaved={() => {
                  setView({ kind: 'list' });
                  void reloadLists();
                }}
              />
            ) : null}

            {tab === 'groups' && view.kind === 'list' ? (
              <GroupList
                groups={groups}
                onCreate={() => setView({ kind: 'group-create' })}
                onEdit={(key) => {
                  void openGroup(key);
                }}
              />
            ) : null}
            {tab === 'groups' && view.kind === 'group-create' ? (
              <GroupEditor
                mode="create"
                users={users}
                onBack={() => setView({ kind: 'list' })}
                onSaved={() => {
                  setView({ kind: 'list' });
                  void reloadLists();
                }}
              />
            ) : null}
            {tab === 'groups' && view.kind === 'group-edit' && groupDetail ? (
              <GroupEditor
                mode="edit"
                initial={groupDetail}
                users={users}
                onBack={() => setView({ kind: 'list' })}
                onSaved={() => {
                  setView({ kind: 'list' });
                  void reloadLists();
                }}
              />
            ) : null}

            {tab === 'audit' ? (
              <AuditList
                items={audit}
                accessClients={auditAccessClients}
                accessClientFilter={auditAccessClient}
                onAccessClientFilterChange={(value) => {
                  setAuditAccessClient(value);
                  void loadAudit(value);
                }}
                hasMore={Boolean(auditCursor)}
                onLoadMore={() => {
                  void (async () => {
                    const page = await client.listAudit(await authHeaders(), {
                      limit: 50,
                      cursor: auditCursor ?? undefined,
                      accessClient: auditAccessClient || undefined,
                    });
                    setAudit((prev) => [...prev, ...(page.items ?? [])]);
                    setAuditCursor(page.nextCursor ?? null);
                  })();
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
