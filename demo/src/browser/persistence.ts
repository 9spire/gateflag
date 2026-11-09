import type { InMemoryRepository, SeedSnapshot } from '@gateflag/core';

export function storageKey(seedVersion: number): string {
  return `gateflag:state:v${seedVersion}`;
}

export function loadSnapshot(seedVersion: number): SeedSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(seedVersion));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SeedSnapshot;
  } catch {
    return null;
  }
}

export function saveSnapshot(repo: InMemoryRepository, seedVersion: number): void {
  localStorage.setItem(storageKey(seedVersion), JSON.stringify(repo.exportSnapshot(seedVersion)));
}

export function clearSnapshot(seedVersion: number): void {
  localStorage.removeItem(storageKey(seedVersion));
}
