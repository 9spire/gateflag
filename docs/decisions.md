# Decisions

One line per decision. Newest last.

- 2026-11-08: Use npm workspaces (not pnpm/turborepo) as specified in the build brief.
- 2026-11-08: Keep the build brief at `docs/gateflag-build-brief.md` as the source of truth for scope.
- 2026-11-08: Stub `dev` / `dev:browser` until Phase 7 wires the demo.
- 2026-11-08: Seed expiries stay relative (`expiresInDays`) and resolve at load/reset so demos never go stale.
- 2026-11-08: Expiry uses strict greater-than (`expiresAt > now`); equal-to-now counts as expired.
- 2026-11-08: Auth is enforced inside `createRoutes` handlers so Express and MSW adapters stay thin.
- 2026-11-08: Repository contract suite lives in core and is imported by both in-memory and (later) Dynamo tests.
