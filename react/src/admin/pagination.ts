export const PAGE_SIZE = 25;

export function paginate<T>(items: T[], page: number): { pageItems: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    pageItems: items.slice(start, start + PAGE_SIZE),
    totalPages,
  };
}

export function filterByQuery<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter((item) => getText(item).toLowerCase().includes(q));
}
