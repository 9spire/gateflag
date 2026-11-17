import type { AccessClientId } from './flags.js';

export type AudienceKind = 'admin' | 'business' | 'engineering' | 'qa' | 'baseline';

export const AUDIENCE_KINDS: Array<{ kind: AudienceKind; label: string }> = [
  { kind: 'admin', label: 'Admin' },
  { kind: 'business', label: 'Business' },
  { kind: 'engineering', label: 'Engineering' },
  { kind: 'qa', label: 'QA & testers' },
  { kind: 'baseline', label: 'Everyone else' },
];

export type AudienceMember = {
  email: string;
  name: string;
  expiresAt: string | null;
  /** Set when the member is a real demo user the API can evaluate. */
  personaId?: string;
};

export type AudienceGroup = {
  key: string;
  kind: AudienceKind;
  description: string;
  defaultTtlDays: number | null;
  /** Engineering groups only see GATED flags for apps they own. */
  apps?: AccessClientId[];
  /** Demo user whose real permissions stand in for a typical member. */
  evaluateAs: string;
  members: AudienceMember[];
};

export type ViewAs = { groupKey: string; email?: string };

const BASELINE_PERSONA = 'sam-none';
const DAY_MS = 86_400_000;

const FIRST = [
  'Priya',
  'Marcus',
  'Elena',
  'Tomás',
  'Aisha',
  'Kenji',
  'Grace',
  'Omar',
  'Lena',
  'Ravi',
  'Chloe',
  'Diego',
  'Hana',
  'Felix',
  'Noor',
  'Isaac',
  'Mira',
  'Luca',
  'Zara',
  'Owen',
];
const LAST = [
  'Nair',
  'Okafor',
  'Rossi',
  'Silva',
  'Haddad',
  'Tanaka',
  'Kim',
  'Farah',
  'Berg',
  'Patel',
  'Martin',
  'Lopez',
  'Sato',
  'Weber',
  'Aziz',
  'Cohen',
  'Ivanova',
  'Bianchi',
];

function inDays(days: number | null): string | null {
  return days === null ? null : new Date(Date.now() + days * DAY_MS).toISOString();
}

function mockMembers(seed: number, count: number, ttl: number | null): AudienceMember[] {
  return Array.from({ length: count }, (_, index) => {
    const first = FIRST[(seed * 7 + index * 3) % FIRST.length]!;
    const last = LAST[(seed * 5 + index * 7) % LAST.length]!;
    const days = ttl === null ? null : ((index * 5 + seed) % (ttl + 3)) - 2;
    return {
      name: `${first} ${last}`,
      email: `${first}.${last}${seed}${index}@example.com`.toLowerCase(),
      expiresAt: inDays(days),
    };
  });
}

function real(personaId: string, name: string, expiresInDays: number | null): AudienceMember {
  return {
    personaId,
    name,
    email: `${name.toLowerCase()}@example.com`,
    expiresAt: inDays(expiresInDays),
  };
}

export const AUDIENCE_GROUPS: AudienceGroup[] = [
  {
    key: 'admins',
    kind: 'admin',
    description: 'Gateflag admins who can open the console',
    defaultTtlDays: null,
    evaluateAs: 'alex-admin',
    members: [
      real('alex-admin', 'Alex', null),
      real('riley-admin', 'Riley', null),
      real('casey-admin', 'Casey', null),
      ...mockMembers(0, 5, null),
    ],
  },
  {
    key: 'product-owners',
    kind: 'business',
    description: 'Product and business owners',
    defaultTtlDays: null,
    evaluateAs: 'pat-beta',
    members: mockMembers(1, 14, null),
  },
  {
    key: 'support-team',
    kind: 'business',
    description: 'Customer support staff',
    defaultTtlDays: null,
    evaluateAs: 'jordan-support',
    members: [real('jordan-support', 'Jordan', null), ...mockMembers(2, 31, null)],
  },
  {
    key: 'holiday-launch-preview',
    kind: 'business',
    description: 'Stakeholders previewing the holiday launch',
    defaultTtlDays: 14,
    evaluateAs: 'pat-beta',
    members: mockMembers(3, 9, 14),
  },
  {
    key: 'storefront-eng',
    kind: 'engineering',
    description: 'Storefront and checkout engineers',
    defaultTtlDays: null,
    apps: ['storefront', 'checkout'],
    evaluateAs: 'dana-dev',
    members: [real('dana-dev', 'Dana', null), ...mockMembers(4, 22, null)],
  },
  {
    key: 'support-eng',
    kind: 'engineering',
    description: 'Support portal engineers',
    defaultTtlDays: null,
    apps: ['support-portal'],
    evaluateAs: 'dana-dev',
    members: mockMembers(5, 11, null),
  },
  {
    key: 'beta-testers',
    kind: 'qa',
    description: 'External beta program',
    defaultTtlDays: 30,
    evaluateAs: 'pat-beta',
    members: [real('pat-beta', 'Pat', 30), ...mockMembers(6, 47, 30)],
  },
  {
    key: 'qa-sprint-42',
    kind: 'qa',
    description: 'QA cycle for sprint 42',
    defaultTtlDays: 7,
    evaluateAs: 'pat-beta',
    members: mockMembers(7, 16, 7),
  },
  {
    key: 'checkout-regression',
    kind: 'qa',
    description: 'Checkout regression pass',
    defaultTtlDays: 3,
    evaluateAs: 'pat-beta',
    members: mockMembers(8, 6, 3),
  },
  {
    key: 'everyone',
    kind: 'baseline',
    description: 'Signed-in users with no group',
    defaultTtlDays: null,
    evaluateAs: BASELINE_PERSONA,
    members: [real('sam-none', 'Sam', null)],
  },
];

export const ADMIN_PERSONA = 'alex-admin';
export const ADMIN_VIEW_AS: ViewAs = { groupKey: 'admins' };

export function isExpired(member: AudienceMember): boolean {
  return member.expiresAt !== null && Date.parse(member.expiresAt) <= Date.now();
}

export function daysLeft(member: AudienceMember): number | null {
  return member.expiresAt === null
    ? null
    : Math.ceil((Date.parse(member.expiresAt) - Date.now()) / DAY_MS);
}

export function expiryLabel(member: AudienceMember): string {
  const days = daysLeft(member);
  if (days === null) return 'Permanent';
  if (days <= 0) return 'Expired';
  return days === 1 ? '1 day left' : `${days} days left`;
}

export function ttlLabel(group: AudienceGroup): string {
  return group.defaultTtlDays === null ? 'Permanent' : `${group.defaultTtlDays}-day access`;
}

export function ownsApp(group: AudienceGroup, app: AccessClientId): boolean {
  return group.kind !== 'engineering' || Boolean(group.apps?.includes(app));
}

export function resolveViewAs(viewAs: ViewAs) {
  const group =
    AUDIENCE_GROUPS.find((entry) => entry.key === viewAs.groupKey) ?? AUDIENCE_GROUPS.at(-1)!;
  const member = viewAs.email
    ? group.members.find((entry) => entry.email === viewAs.email)
    : undefined;
  const personaId =
    member?.personaId ?? (member && isExpired(member) ? BASELINE_PERSONA : group.evaluateAs);
  return { group, member, personaId };
}

export function viewAsForPersona(personaId: string): ViewAs {
  for (const group of AUDIENCE_GROUPS) {
    const member = group.members.find((entry) => entry.personaId === personaId);
    if (member) {
      return { groupKey: group.key, email: member.email };
    }
  }
  return { groupKey: 'everyone' };
}
