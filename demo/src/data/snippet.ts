export const INTEGRATION_SNIPPET = `import { AccessControlProvider, ProtectedFeature, AccessButton } from 'gateflag';
import 'gateflag/styles.css';
// Optional: match your product colors (defaults are demo green)
import './gateflag-theme.css';

<AccessControlProvider
  config={{
    apiBaseUrl: '',          // same origin; or your Gateflag API URL
    userId,                  // signed-in user id, or null when signed out
    accessClientId: 'storefront',
  }}
>
  <ProtectedFeature flag="NEW_CHECKOUT_FLOW" fallback={<Locked />}>
    <NewCheckout />
  </ProtectedFeature>
  <AccessButton />           {/* only renders for admins */}
</AccessControlProvider>`;

export const THEME_SNIPPET = `/* gateflag-theme.css — map Gateflag to your brand */
:root {
  --gateflag-bg: #f3ebe3;
  --gateflag-surface: #faf6f1;
  --gateflag-fg: #2a1810;
  --gateflag-muted: #6b5348;
  --gateflag-border: #e0d2c6;
  --gateflag-accent: #c45c26;      /* primary / highlight */
  --gateflag-on-accent: #ffffff;
}

:root[data-theme='dark'] {
  --gateflag-bg: #1a120e;
  --gateflag-surface: #241812;
  --gateflag-fg: #f3ebe3;
  --gateflag-muted: #b89a8c;
  --gateflag-border: #3d2c24;
  --gateflag-accent: #e07a45;
  --gateflag-on-accent: #1a100c;
}

/* Toggle dark mode the same way the demo does:
   document.documentElement.dataset.theme = 'light' | 'dark'
*/`;
