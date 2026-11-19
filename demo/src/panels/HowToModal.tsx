import { useEffect, useId, useRef } from 'react';
import { INTEGRATION_SNIPPET, THEME_SNIPPET } from '../data/snippet.js';
import { CopyButton } from './CopyButton.js';

const STEPS = [
  {
    title: '1. Mount the provider once',
    body: 'Place AccessControlProvider near the top of each product surface — next to the router or app shell for that app. Pass apiBaseUrl (empty string for same-origin), the signed-in userId (or null when signed out), and an accessClientId naming the current app.',
  },
  {
    title: '2. Gate features in the tree',
    body: 'Wrap UI in ProtectedFeature with a fallback, or call useFeatureFlag when you need a boolean. Gateflag fails closed: if permissions are missing or the API is down, features stay hidden.',
  },
  {
    title: '3. Give admins a door in',
    body: 'Render AccessButton anywhere under the provider. By default it only appears for admins. This demo keeps Admin in the header for every View as (alwaysShow + getAdminAuthHeaders).',
  },
  {
    title: '4. Match your product colors',
    body: 'Import gateflag/styles.css, then override the seven --gateflag-* brand tokens (bg, surface, fg, muted, border, accent, on-accent). That swaps the demo green for your highlight color. For dark mode, set the same tokens under :root[data-theme="dark"] and toggle document.documentElement.dataset.theme.',
  },
  {
    title: '5. Stay in sync',
    body: 'Permissions refresh when the user or app changes, when the window regains focus, after the admin modal closes, and on a short poll. You can also call refresh() yourself after a known change.',
  },
] as const;

export function HowToModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="demo-modal-root">
      <button type="button" className="demo-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="demo-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="demo-modal-head">
          <div>
            <p className="demo-field-label">For developers</p>
            <h2 id={titleId}>How to use Gateflag</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="demo-btn demo-btn-small"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <p className="demo-modal-lede">
          One provider per product surface, then gate UI with flags. The console handles the
          rest.
        </p>

        <ol className="demo-howto-steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="demo-howto-snippet">
          <div className="demo-panel-head">
            <h3>Drop-in example</h3>
            <CopyButton text={INTEGRATION_SNIPPET} />
          </div>
          <pre className="demo-code" tabIndex={0} aria-label="Integration snippet">
            <code>{INTEGRATION_SNIPPET}</code>
          </pre>
        </div>

        <div className="demo-howto-snippet">
          <div className="demo-panel-head">
            <h3>Theme tokens</h3>
            <CopyButton text={THEME_SNIPPET} />
          </div>
          <pre className="demo-code" tabIndex={0} aria-label="Theme CSS snippet">
            <code>{THEME_SNIPPET}</code>
          </pre>
        </div>

        <p className="demo-howto-footnote">
          Import <code>gateflag/styles.css</code> once if you use the admin modal, then override{' '}
          <code>--gateflag-*</code> to match your brand. Peer dependency: React 18 or 19.
        </p>
      </div>
    </div>
  );
}
