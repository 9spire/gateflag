import type { ISO } from './types.js';

/** Active means expiresAt is null or strictly after `now`. Equal-to-now is expired. */
export function isActive(expiresAt: ISO | null, now: Date): boolean {
  if (expiresAt === null) {
    return true;
  }
  return new Date(expiresAt).getTime() > now.getTime();
}
