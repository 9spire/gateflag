export type AccessClientId = 'storefront' | 'checkout' | 'support-portal';

export const ACCESS_CLIENTS: Array<{ id: AccessClientId; label: string }> = [
  { id: 'storefront', label: 'Storefront' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'support-portal', label: 'Support portal' },
];

export const FLAG_META: Record<
  string,
  { title: string; blurb: string; clients: AccessClientId[] }
> = {
  NEW_CHECKOUT_FLOW: {
    title: 'New checkout flow',
    blurb: 'One-page checkout with express pay.',
    clients: ['storefront', 'checkout'],
  },
  PRODUCT_RECOMMENDATIONS: {
    title: 'Product recommendations',
    blurb: 'Personalized carousel on the product page.',
    clients: ['storefront'],
  },
  BETA_SEARCH: {
    title: 'Beta search',
    blurb: 'Semantic search box for catalog and tickets.',
    clients: ['storefront', 'support-portal'],
  },
  ORDER_HISTORY_V2: {
    title: 'Order history v2',
    blurb: 'Tracking timeline and status chips.',
    clients: ['storefront', 'support-portal'],
  },
  DARK_MODE: {
    title: 'Dark mode',
    blurb: 'Theme toggle available everywhere.',
    clients: ['storefront', 'checkout', 'support-portal'],
  },
  BULK_EXPORT: {
    title: 'Bulk export',
    blurb: 'CSV export of orders for support agents.',
    clients: ['support-portal'],
  },
};

export function flagsForClient(client: AccessClientId): string[] {
  return Object.entries(FLAG_META)
    .filter(([, meta]) => meta.clients.includes(client))
    .map(([key]) => key);
}
