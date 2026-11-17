# gateflag

React components and hooks for **Gateflag** — feature flags with a three-state model (`DISABLED` / `GATED` / `RELEASED`), fail-closed client gating, and an admin modal.

```tsx
import { AccessControlProvider, ProtectedFeature } from 'gateflag';
import 'gateflag/styles.css';

<AccessControlProvider config={{ apiBaseUrl: '', userId, accessClientId: 'storefront' }}>
  <ProtectedFeature flag="NEW_CHECKOUT_FLOW"><NewCheckout /></ProtectedFeature>
</AccessControlProvider>
```

Form controls use [`@tailwindcss/forms`](https://github.com/tailwindlabs/tailwindcss-forms) with **class strategy** only (`form-input`, `form-select`, `form-checkbox`). Those rules are opt-in class selectors — importing `gateflag/styles.css` does **not** restyle a host app’s bare `<input>` / `<select>` / checkbox elements.

Peer dependency: `react` / `react-dom` ^18 or ^19.

Docs and live demo: [https://9spire.github.io/gateflag/](https://9spire.github.io/gateflag/)

## Releasing

Publishing is driven by git tags via [`.github/workflows/publish.yml`](../.github/workflows/publish.yml).

1. Bump `"version"` in `react/package.json` (e.g. `0.1.0` → `0.1.1`).
2. Commit the change on `main`.
3. Tag and push: `git tag v0.1.1 && git push origin v0.1.1` (tag must match the package version).
4. The Publish workflow builds and runs `npm publish` for `gateflag`.

Requires the repo secret `NPM_TOKEN` (npm automation or granular publish token).
