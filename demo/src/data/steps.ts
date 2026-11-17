import { ADMIN_VIEW_AS, type ViewAs } from './audiences.js';

export type TourStep = {
  id: string;
  label: string;
  actor: ViewAs;
  actorLabel: string;
  verify: ViewAs;
  verifyLabel: string;
};

export const STEPS: TourStep[] = [
  {
    id: 'release',
    label: 'As admins, release PRODUCT_RECOMMENDATIONS, then check as everyone.',
    actor: ADMIN_VIEW_AS,
    actorLabel: 'Be admins',
    verify: { groupKey: 'everyone' },
    verifyLabel: 'Check as everyone',
  },
  {
    id: 'deny-dev',
    label:
      'As admins, deny NEW_CHECKOUT_FLOW for a storefront-eng developer, then check that group.',
    actor: ADMIN_VIEW_AS,
    actorLabel: 'Be admins',
    verify: { groupKey: 'storefront-eng' },
    verifyLabel: 'Check as storefront-eng',
  },
  {
    id: 'group',
    label: 'As admins, grant BETA_SEARCH to beta-testers, then check that group.',
    actor: ADMIN_VIEW_AS,
    actorLabel: 'Be admins',
    verify: { groupKey: 'beta-testers' },
    verifyLabel: 'Check as beta-testers',
  },
  {
    id: 'emergency',
    label: 'As admins, emergency-off DARK_MODE, then confirm beta-testers lose it.',
    actor: ADMIN_VIEW_AS,
    actorLabel: 'Be admins',
    verify: { groupKey: 'beta-testers' },
    verifyLabel: 'Check as beta-testers',
  },
];

/** Group-level targets match any member of that group. */
export function matchesViewAs(current: ViewAs, target: ViewAs): boolean {
  if (current.groupKey !== target.groupKey) {
    return false;
  }
  return !target.email || current.email === target.email;
}
