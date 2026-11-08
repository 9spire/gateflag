export const META = 'METADATA';

export function userPk(email: string): string {
  return `USER#${email}`;
}

export function flagPk(key: string): string {
  return `FLAG#${key}`;
}

export function groupPk(key: string): string {
  return `GROUP#${key}`;
}

export function roleSk(): string {
  return 'ROLE#access';
}

export function groupSk(groupKey: string): string {
  return `GROUP#${groupKey}`;
}

export function membershipSk(groupKey: string): string {
  return `GROUP#${groupKey}`;
}

export function userGrantSk(flagKey: string): string {
  return `FLAG#${flagKey}`;
}

export function denySk(flagKey: string): string {
  return `FLAG_DENY#${flagKey}`;
}

export function auditSk(at: string, id: string): string {
  return `${at}#${id}`;
}

export function ttlFromExpiry(expiresAt: string | null, extraDays: number): number | undefined {
  if (expiresAt === null) {
    return undefined;
  }
  const expiryMs = new Date(expiresAt).getTime();
  return Math.floor(expiryMs / 1000) + extraDays * 24 * 60 * 60;
}

export function ttlFromNow(now: Date, extraDays: number): number {
  return Math.floor(now.getTime() / 1000) + extraDays * 24 * 60 * 60;
}
