# Decisions

One line per decision. Newest last.

- 2026-11-08: Use npm workspaces (not pnpm/turborepo) as specified in the build brief.
- 2026-11-08: Keep the build brief at `docs/gateflag-build-brief.md` as the source of truth for scope.
- 2026-11-08: Stub `dev` / `dev:browser` until Phase 7 wires the demo.
- 2026-11-08: Seed expiries stay relative (`expiresInDays`) and resolve at load/reset so demos never go stale.
- 2026-11-08: Expiry uses strict greater-than (`expiresAt > now`); equal-to-now counts as expired.
- 2026-11-08: Auth is enforced inside `createRoutes` handlers so Express and MSW adapters stay thin.
- 2026-11-08: Repository contract suite lives in core but is not re-exported from the package barrel (vitest must not load at runtime).
- 2026-11-08: DynamoDB cascades above 100 TransactWrite items are chunked; chunked cascades are not atomic across chunks.
- 2026-11-08: Dynamo contract tests skip when `DYNAMODB_ENDPOINT` is unset; CI always sets it. Docker was unavailable on this machine during Phase 4.
- 2026-11-08: React permissions client dedupes in-flight fetches by apiBaseUrl+userId+accessClientId so identity changes are never blocked by a prior request.
