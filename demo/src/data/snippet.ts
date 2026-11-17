export const INTEGRATION_SNIPPET = `import { AccessControlProvider, ProtectedFeature, AccessButton } from 'gateflag';
import 'gateflag/styles.css';

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
