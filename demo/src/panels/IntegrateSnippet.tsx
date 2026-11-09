import { useState } from 'react';

const SNIPPET = `<AccessControlProvider config={{ apiBaseUrl: '', userId, accessClientId: 'storefront' }}>
  <ProtectedFeature flag="NEW_CHECKOUT_FLOW"><NewCheckout /></ProtectedFeature>
</AccessControlProvider>`;

export function IntegrateSnippet() {
  const [copied, setCopied] = useState(false);

  return (
    <section className="demo-panel" aria-labelledby="integrate-heading">
      <div className="demo-panel-head">
        <h2 id="integrate-heading">Integrate in 3 lines</h2>
        <button
          type="button"
          className="demo-btn demo-btn-ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(SNIPPET);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="demo-code" tabIndex={0} aria-label="Integration snippet">
        <code>{SNIPPET}</code>
      </pre>
    </section>
  );
}
