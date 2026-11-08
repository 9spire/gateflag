# Gateflag

**Gateflag: gate features by user, role, and group across every app you ship.**

Portfolio feature-flag and access-control platform: one API, one React library, one demo.

## Status

Phase 1 scaffold. See `docs/gateflag-build-brief.md` for the full build plan.

## Workspaces

| Package | Name | Role |
| --- | --- | --- |
| `core/` | `@gateflag/core` | Domain, evaluator, services, route table (framework-free) |
| `api/` | `@gateflag/api` | Express adapter + DynamoDB |
| `react/` | `gateflag` | Published React library + admin UI |
| `demo/` | `@gateflag/demo` | Vite demo (browser MSW + API modes) |
| `e2e/` | `@gateflag/e2e` | Playwright end-to-end |

## Scripts

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run format
```

`dev` and `dev:browser` land in Phase 7.

## License

MIT
