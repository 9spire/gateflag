#!/usr/bin/env node

const script = process.argv[2] ?? 'unknown';
console.error(
  `[gateflag] \`${script}\` is not wired yet. It lands in Phase 7 (demo app).`,
);
process.exit(1);
