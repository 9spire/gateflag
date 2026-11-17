import { useState } from 'react';
import { INTEGRATION_SNIPPET } from '../data/snippet.js';
import { CopyButton } from './CopyButton.js';
import { HowToModal } from './HowToModal.js';

export function IntegrateSnippet() {
  const [howToOpen, setHowToOpen] = useState(false);

  return (
    <>
      <details className="demo-panel demo-details">
        <summary>For developers: Quickstart integration</summary>
        <div className="demo-details-body">
          <div className="demo-details-actions">
            <button
              type="button"
              className="demo-btn demo-btn-small"
              onClick={() => setHowToOpen(true)}
            >
              How to use
            </button>
            <CopyButton text={INTEGRATION_SNIPPET} />
          </div>
          <pre className="demo-code" tabIndex={0} aria-label="Integration snippet">
            <code>{INTEGRATION_SNIPPET}</code>
          </pre>
        </div>
      </details>
      <HowToModal open={howToOpen} onClose={() => setHowToOpen(false)} />
    </>
  );
}
