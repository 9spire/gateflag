import { reasonLabel } from '@gateflag/core';
import { useAccessControl } from 'gateflag';
import { FLAG_META, flagsForClient, type AccessClientId } from '../data/flags.js';

export function WhyPanel({
  personaName,
  accessClientId,
}: {
  personaName: string;
  accessClientId: AccessClientId;
}) {
  const { permissions, loading, error } = useAccessControl();
  const keys = flagsForClient(accessClientId);

  return (
    <section className="demo-panel" aria-labelledby="why-heading">
      <h2 id="why-heading">Why can {personaName} see this?</h2>
      {error ? (
        <p className="demo-error" role="status">
          Permissions unavailable (fail-closed).
        </p>
      ) : null}
      <table className="demo-table">
        <thead>
          <tr>
            <th scope="col">Flag</th>
            <th scope="col">State</th>
            <th scope="col">Access</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const evaluation = permissions?.evaluations[key];
            const granted = evaluation?.granted ?? false;
            const state = evaluation?.universalState ?? '—';
            const reason = evaluation
              ? reasonLabel(evaluation.reason, evaluation.groupKey)
              : loading
                ? 'Loading…'
                : 'No grant';
            return (
              <tr key={key}>
                <td>
                  <code>{key}</code>
                  <div className="demo-muted">{FLAG_META[key]?.title ?? key}</div>
                </td>
                <td>
                  <span className={`demo-badge demo-badge-${String(state).toLowerCase()}`}>
                    {state}
                  </span>
                </td>
                <td>
                  <span className={granted ? 'demo-ok' : 'demo-locked-text'}>
                    {granted ? 'Granted' : 'Denied'}
                  </span>
                </td>
                <td>{reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
