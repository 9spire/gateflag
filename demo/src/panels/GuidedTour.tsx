import { useMemo, useRef, useState } from 'react';
import type { ViewAs } from '../data/audiences.js';
import { STEPS, matchesViewAs } from '../data/steps.js';

type Selection = { stepId: string; role: 'actor' | 'verify' };

function targetFor(selection: Selection): ViewAs | undefined {
  const step = STEPS.find((entry) => entry.id === selection.stepId);
  return selection.role === 'actor' ? step?.actor : step?.verify;
}

export function GuidedTour({
  viewAs,
  onSwitch,
}: {
  viewAs: ViewAs;
  onSwitch: (viewAs: ViewAs) => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const revertTo = useRef<ViewAs | null>(null);

  const active = useMemo(() => {
    if (!selection) {
      return null;
    }
    const target = targetFor(selection);
    return target && matchesViewAs(viewAs, target) ? selection : null;
  }, [selection, viewAs]);

  const toggle = (stepId: string, role: 'actor' | 'verify', target: ViewAs) => {
    if (active?.stepId === stepId && active.role === role) {
      const prior = revertTo.current;
      setSelection(null);
      revertTo.current = null;
      if (prior) {
        onSwitch(prior);
      }
      return;
    }
    if (!active) {
      revertTo.current = viewAs;
    }
    setSelection({ stepId, role });
    onSwitch(target);
  };

  return (
    <details className="demo-panel demo-details">
      <summary>Try a scenario</summary>
      <ol className="demo-tour-steps">
        {STEPS.map((step) => {
          const actorOn = active?.stepId === step.id && active.role === 'actor';
          const verifyOn = active?.stepId === step.id && active.role === 'verify';
          return (
            <li key={step.id}>
              <p className="demo-tour-label">{step.label}</p>
              <div className="demo-tour-actions">
                <button
                  type="button"
                  className="demo-btn demo-btn-small"
                  aria-pressed={actorOn}
                  onClick={() => toggle(step.id, 'actor', step.actor)}
                >
                  {actorOn ? `Leave ${step.actor.groupKey}` : step.actorLabel}
                </button>
                <button
                  type="button"
                  className="demo-btn demo-btn-small"
                  aria-pressed={verifyOn}
                  onClick={() => toggle(step.id, 'verify', step.verify)}
                >
                  {verifyOn ? `Leave ${step.verify.groupKey}` : step.verifyLabel}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
