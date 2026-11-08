import type { Reason } from './types.js';

const REASON_LABELS: Record<Reason, string> = {
  RELEASED: 'Released to everyone',
  DISABLED: 'Disabled for everyone',
  DEVELOPER: 'Automatic: developer role',
  DEVELOPER_DENIED: 'Disabled for this developer by an admin',
  USER_GRANT: 'Individual grant',
  GROUP_GRANT: 'Group grant: {groupKey}',
  ROLE_GRANT: 'Access role grant',
  NO_GRANT: 'No grant',
};

export function reasonLabel(reason: Reason, groupKey?: string): string {
  const template = REASON_LABELS[reason];
  if (reason === 'GROUP_GRANT') {
    return template.replace('{groupKey}', groupKey ?? '');
  }
  return template;
}

export { REASON_LABELS };
