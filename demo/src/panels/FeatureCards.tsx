import { Lock } from 'lucide-react';
import { ProtectedFeature } from 'gateflag';
import { FLAG_META, flagsForClient, type AccessClientId } from '../data/flags.js';

function LockedCard({ flag }: { flag: string }) {
  const meta = FLAG_META[flag];
  return (
    <article className="demo-card demo-card-locked" aria-label={`${flag} locked`}>
      <Lock aria-hidden size={20} strokeWidth={1.75} />
      <h3>{meta?.title ?? flag}</h3>
      <code>{flag}</code>
      <p>You don&apos;t have access</p>
    </article>
  );
}

function FeatureBody({ flag }: { flag: string }) {
  const meta = FLAG_META[flag] ?? { title: flag, blurb: flag, clients: [] };
  switch (flag) {
    case 'NEW_CHECKOUT_FLOW':
      return (
        <article className="demo-card">
          <h3>{meta.title}</h3>
          <p>{meta.blurb}</p>
          <div className="demo-mock-row">
            <span className="demo-pill">Express pay</span>
            <span className="demo-pill">One page</span>
          </div>
          <button type="button" className="demo-btn demo-btn-primary" disabled>
            Place order
          </button>
        </article>
      );
    case 'PRODUCT_RECOMMENDATIONS':
      return (
        <article className="demo-card">
          <h3>{meta.title}</h3>
          <p>{meta.blurb}</p>
          <div className="demo-mock-grid">
            <div className="demo-swatch" />
            <div className="demo-swatch" />
            <div className="demo-swatch" />
          </div>
        </article>
      );
    case 'BETA_SEARCH':
      return (
        <article className="demo-card">
          <h3>{meta.title}</h3>
          <p>{meta.blurb}</p>
          <input className="demo-input" placeholder="Search catalog…" readOnly />
        </article>
      );
    case 'ORDER_HISTORY_V2':
      return (
        <article className="demo-card">
          <h3>{meta.title}</h3>
          <p>{meta.blurb}</p>
          <ul className="demo-timeline">
            <li>Packed</li>
            <li>Shipped</li>
            <li>Out for delivery</li>
          </ul>
        </article>
      );
    case 'DARK_MODE':
      return (
        <article className="demo-card">
          <h3>{meta.title}</h3>
          <p>{meta.blurb}</p>
          <label className="demo-toggle">
            <input type="checkbox" defaultChecked readOnly />
            <span>Dark theme on</span>
          </label>
        </article>
      );
    case 'BULK_EXPORT':
      return (
        <article className="demo-card">
          <h3>{meta.title}</h3>
          <p>{meta.blurb}</p>
          <button type="button" className="demo-btn demo-btn-primary" disabled>
            Export CSV
          </button>
        </article>
      );
    default:
      return (
        <article className="demo-card">
          <h3>{meta.title}</h3>
          <p>{meta.blurb}</p>
        </article>
      );
  }
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
