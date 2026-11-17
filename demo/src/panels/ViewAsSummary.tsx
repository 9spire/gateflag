import type { Persona } from '@gateflag/core';
import {
  AUDIENCE_KINDS,
  expiryLabel,
  isExpired,
  ownsApp,
  resolveViewAs,
  ttlLabel,
  type ViewAs,
} from '../data/audiences.js';
import { ACCESS_CLIENTS, type AccessClientId } from '../data/flags.js';

export function viewAsTitle(viewAs: ViewAs): string {
  const { group, member } = resolveViewAs(viewAs);
  return member ? member.name : `any ${group.key} member`;
}

export function ViewAsSummary({
  viewAs,
  personas,
  accessClientId,
}: {
  viewAs: ViewAs;
  personas: Persona[];
  accessClientId: AccessClientId;
}) {
  const { group, member, personaId } = resolveViewAs(viewAs);
  const kindLabel = AUDIENCE_KINDS.find((entry) => entry.kind === group.kind)?.label;
  const appLabel = ACCESS_CLIENTS.find((client) => client.id === accessClientId)?.label;
  const evaluatedAs = personas.find((persona) => persona.id === personaId)?.displayName;
  const facts = member
    ? [`${kindLabel} · ${group.key}`, expiryLabel(member)]
    : [kindLabel, ttlLabel(group), `${group.members.length} members`];

  return (
    <div className="demo-summary">
      <p className="demo-lede">
        {facts.join(' · ')}
        {member?.personaId ? null : (
          <span className="demo-muted"> · Demo preview uses {evaluatedAs}&apos;s access</span>
        )}
      </p>
      {group.kind === 'admin' ? (
        <div className="demo-hint" role="note">
          Admins share the console. Feature access still follows each person&apos;s role grants —
          Casey has no developer auto-grants; Alex and Riley do.
        </div>
      ) : null}
      {member && isExpired(member) ? (
        <div className="demo-hint" role="note">
          This membership has expired, so they see what someone with no group sees.
        </div>
      ) : null}
      {!ownsApp(group, accessClientId) ? (
        <div className="demo-hint" role="note">
          {group.key} doesn&apos;t own {appLabel}. With developer access limited by app, they would
          only see RELEASED features here. The demo API still gives developers every GATED flag.
        </div>
      ) : null}
    </div>
  );
}
