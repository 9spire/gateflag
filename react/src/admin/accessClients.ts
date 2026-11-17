/** Display labels for access-client IDs — keep Title Case in the UI. */
const ACCESS_CLIENT_LABELS: Record<string, string> = {
  storefront: 'Storefront',
  checkout: 'Checkout',
  'support-portal': 'Support portal',
};

export const KNOWN_ACCESS_CLIENTS = [
  'storefront',
  'checkout',
  'support-portal',
] as const;

export function accessClientLabel(id: string): string {
  return ACCESS_CLIENT_LABELS[id] ?? id;
}
