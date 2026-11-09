import { useState } from 'react';

const STEPS = [
  {
    id: 'release',
    label: 'As Alex, release PRODUCT_RECOMMENDATIONS, then check Sam.',
  },
  {
    id: 'deny-dev',
    label: 'As Alex, deny NEW_CHECKOUT_FLOW for Dana, then switch to Dana.',
  },
  {
    id: 'group',
    label: 'As Alex, create launch-crew, grant BETA_SEARCH, switch to Sam.',
  },
  {
    id: 'emergency',
    label: 'As Alex, emergency-off DARK_MODE and confirm every persona loses it.',
  },
] as const;

const STORAGE_KEY = 'gateflag:try-this';

function loadChecked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function TryThis() {
  const [checked, setChecked] = useState(loadChecked);

  return (
    <section className="demo-panel" aria-labelledby="try-heading">
      <h2 id="try-heading">Try this</h2>
      <ol className="demo-checklist">
        {STEPS.map((step) => (
          <li key={step.id}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(checked[step.id])}
                onChange={(event) => {
                  const next = { ...checked, [step.id]: event.target.checked };
                  setChecked(next);
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }}
              />
              <span>{step.label}</span>
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}
