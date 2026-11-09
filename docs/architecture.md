# Gateflag architecture (interview notes)

## Talking points

1. **One route table, two adapters.** Business HTTP shape lives in `@gateflag/core` as `createRoutes()`. Express and the demo's MSW worker are thin translators. Changing a path or auth rule once updates both modes.
2. **Pure evaluation.** `evaluateFlag` is a pure function with an injected `now`. Expiry is always checked in code; DynamoDB TTL is cleanup only.
3. **Fail closed on the client.** Missing permissions, errors, or identity switches clear grants. Host UI never "sticks open" on a previous user.
4. **Optimistic locking.** Flag/user/group updates carry `version`. Concurrent saves return `VERSION_CONFLICT` (409); the admin UI toasts and asks for reload.
5. **Mock IdP on purpose.** `X-Demo-User` selects a persona. Production swaps in an `IdentityResolver` that verifies OIDC (issuer, audience, JWKS) and reads IdP groups for `isAdmin`. Everything else stays put.

## Evaluation order (GATED)

1. Developer with an active deny → denied.
2. Otherwise developer → granted (never falls through).
3. Active user grant → granted.
4. Active membership in a still-existing group with an active group grant → granted (first `groupKey` alphabetically).
5. `access` role + role grant → granted.
6. Else → no grant.

## Single-table DynamoDB

Entities share `PK`/`SK` plus `GSI1` for lists and reverse lookups. Conditional creates (`attribute_not_exists`) and updates (`version = :expected`) keep writes safe. Cascades use `TransactWrite` in chunks of 100 — **cross-chunk cascades are not atomic**; call that out in interviews and note that production may need saga/outbox patterns for large deletes.

## Scaling notes

| Pressure | Mitigation |
|---|---|
| Hot flag with many user grants | Per-flag GSI query already isolates grants; cache `getPermissions` responses briefly per `(email, accessClient)` |
| Hot audit partition | Time-bucketing (`AUDIT#YYYY-MM`) or a separate stream/table if write volume grows |
| Read-heavy storefront | Edge cache of RELEASED catalog; still evaluate GATED server-side |
| Admin write storms | Keep optimistic locking; consider per-flag write sharding only if needed |

## What changes for production

- Replace persona `IdentityResolver` with OIDC verification at the API boundary.
- Point DynamoDB at real AWS (no local endpoint); IAM roles instead of static keys.
- Enforce sensitive actions **server-side** — the React library is UX gating, not a security boundary.
- Add rate limits, audit retention jobs, and monitoring on `VERSION_CONFLICT` / 5xx rates.
- Optional: push invalidation (SSE/WebSocket) instead of 30s polling.

## Local mental model

```
Demo / host app
  → gateflag React (fail-closed, poll + refresh on admin close)
    → GET /api/v1/permissions
      → createRoutes → permissionService → evaluateFlag
        → Repository (memory or Dynamo)
```
