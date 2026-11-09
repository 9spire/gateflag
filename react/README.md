# gateflag

React components and hooks for **Gateflag** — feature flags with a three-state model (`DISABLED` / `GATED` / `RELEASED`), fail-closed client gating, and an admin modal.

```tsx
import { AccessControlProvider, ProtectedFeature } from 'gateflag';
import 'gateflag/styles.css';

<AccessControlProvider config={{ apiBaseUrl: '', userId, accessClientId: 'storefront' }}>
  <ProtectedFeature flag="NEW_CHECKOUT_FLOW"><NewCheckout /></ProtectedFeature>
</AccessControlProvider>
```

Peer dependency: `react` / `react-dom` ^18 or ^19.

Docs and live demo: [https://9spire.github.io/gateflag/](https://9spire.github.io/gateflag/)
