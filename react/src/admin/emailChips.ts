const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailChips(raw: string): { valid: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    if (seen.has(part)) {
      continue;
    }
    seen.add(part);
    if (EMAIL_RE.test(part)) {
      valid.push(part);
    } else {
      invalid.push(part);
    }
  }

  return { valid, invalid };
}
