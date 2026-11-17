import { Check, Lock } from 'lucide-react';
import { reasonLabel } from '@gateflag/core';
import { ProtectedFeature, useAccessControl } from 'gateflag';
import type { ReactNode } from 'react';
import { FLAG_META, flagsForClient, type AccessClientId } from '../data/flags.js';

function AccessStatus({ flag }: { flag: string }) {
  const { permissions, loading } = useAccessControl();
  const evaluation = permissions?.evaluations[flag];
  const granted = evaluation?.granted ?? false;
  const state = evaluation?.universalState;
  const reason = evaluation
    ? reasonLabel(evaluation.reason, evaluation.groupKey)
    : loading
      ? 'Loading…'
      : 'No grant';
  return (
    <div className={`demo-status ${granted ? 'demo-status-ok' : 'demo-status-locked'}`}>
      {granted ? (
        <Check aria-hidden size={14} strokeWidth={2.25} />
      ) : (
        <Lock aria-hidden size={14} strokeWidth={2} />
      )}
      <span className="demo-status-reason">{reason}</span>
      {state ? (
        <span className={`demo-badge demo-badge-${state.toLowerCase()}`}>{state}</span>
      ) : null}
    </div>
  );
}

function LockedCard({ flag }: { flag: string }) {
  const meta = FLAG_META[flag];
  return (
    <article className="demo-card demo-card-locked" aria-label={`${flag} locked`}>
      <AccessStatus flag={flag} />
      <h3>{meta?.title ?? flag}</h3>
      <code>{flag}</code>
    </article>
  );
}

function FeatureMock({ flag }: { flag: string }): ReactNode {
  switch (flag) {
    case 'NEW_CHECKOUT_FLOW':
      return (
        <>
          <div className="demo-mock-row">
            <span className="demo-pill">Express pay</span>
            <span className="demo-pill">One page</span>
          </div>
          <button type="button" className="demo-btn demo-btn-primary" disabled>
            Place order
          </button>
        </>
      );
    case 'PRODUCT_RECOMMENDATIONS':
      return (
        <div className="demo-mock-grid">
          <div className="demo-swatch" />
          <div className="demo-swatch" />
          <div className="demo-swatch" />
        </div>
      );
    case 'BETA_SEARCH':
      return (
        <input className="form-input demo-input" placeholder="Search catalog…" readOnly />
      );
    case 'ORDER_HISTORY_V2':
      return (
        <ul className="demo-timeline">
          <li>Packed</li>
          <li>Shipped</li>
          <li>Out for delivery</li>
        </ul>
      );
    case 'DARK_MODE':
      return (
        <label className="demo-toggle">
          <input type="checkbox" className="form-checkbox demo-checkbox" defaultChecked readOnly />
          <span>Dark theme on</span>
        </label>
      );
    case 'BULK_EXPORT':
      return (
        <button type="button" className="demo-btn demo-btn-primary" disabled>
          Export CSV
        </button>
      );
    default:
      return null;
  }
}

function FeatureBody({ flag }: { flag: string }) {
  const meta = FLAG_META[flag] ?? { title: flag, blurb: flag, clients: [] };
  return (
    <article className="demo-card">
      <AccessStatus flag={flag} />
      <h3>{meta.title}</h3>
      <p>{meta.blurb}</p>
      <FeatureMock flag={flag} />
    </article>
  );
}

export function FeatureCards({ accessClientId }: { accessClientId: AccessClientId }) {
  const keys = flagsForClient(accessClientId);
  return (
    <div className="demo-cards">
      {keys.map((flag) => (
        <ProtectedFeature key={flag} flag={flag} fallback={<LockedCard flag={flag} />}>
          <FeatureBody flag={flag} />
        </ProtectedFeature>
      ))}
    </div>
  );
}
