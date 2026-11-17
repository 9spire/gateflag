import { useState } from 'react';
import {
  AUDIENCE_GROUPS,
  AUDIENCE_KINDS,
  daysLeft,
  expiryLabel,
  isExpired,
  ownsApp,
  ttlLabel,
  type AudienceMember,
  type ViewAs,
} from '../data/audiences.js';
import { ACCESS_CLIENTS, type AccessClientId } from '../data/flags.js';
import { PeoplePicker } from './PeoplePicker.js';

const PREVIEW_COUNT = 6;
const SOON_DAYS = 7;

function isExpiringSoon(member: AudienceMember): boolean {
  const days = daysLeft(member);
  return days !== null && days <= SOON_DAYS;
}

export function expiryClass(member: AudienceMember): string {
  if (isExpired(member)) return 'demo-chip demo-chip-expired';
  if (isExpiringSoon(member)) return 'demo-chip demo-chip-soon';
  return 'demo-chip';
}

export function AudienceRail({
  viewAs,
  onChange,
  accessClientId,
}: {
  viewAs: ViewAs;
  onChange: (viewAs: ViewAs) => void;
  accessClientId: AccessClientId;
}) {
  const [filter, setFilter] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const appLabel = ACCESS_CLIENTS.find((client) => client.id === accessClientId)?.label;
  const needle = filter.trim().toLowerCase();

  return (
    <nav className="demo-rail" aria-labelledby="demo-rail-heading">
      <h2 id="demo-rail-heading" className="demo-field-label">
        Audience
      </h2>
      <div className="demo-rail-picker">
        <PeoplePicker viewAs={viewAs} onChange={onChange} />
      </div>
      <p className="demo-field-label demo-rail-subhead">Groups</p>
      <input
        className="form-input demo-input demo-rail-filter"
        placeholder="Filter groups…"
        aria-label="Filter groups"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <label className="demo-rail-toggle">
        <input
          type="checkbox"
          className="form-checkbox demo-checkbox"
          checked={expiringOnly}
          onChange={(event) => setExpiringOnly(event.target.checked)}
        />
        Show limited day access groups only
      </label>

      {AUDIENCE_KINDS.map(({ kind, label }) => {
        const groups = AUDIENCE_GROUPS.filter(
          (group) =>
            group.kind === kind &&
            (!needle ||
              group.key.includes(needle) ||
              group.description.toLowerCase().includes(needle)) &&
            (!expiringOnly || group.members.some(isExpiringSoon)),
        );
        if (groups.length === 0) {
          return null;
        }
        return (
          <section key={kind} className="demo-rail-kind" aria-label={label}>
            <h3>{label}</h3>
            <ul className="demo-rail-groups">
              {groups.map((group) => {
                const selected = group.key === viewAs.groupKey;
                const members = expiringOnly ? group.members.filter(isExpiringSoon) : group.members;
                const visible = showAll ? members : members.slice(0, PREVIEW_COUNT);
                const outOfScope = !ownsApp(group, accessClientId);
                return (
                  <li key={group.key}>
                    <button
                      type="button"
                      className={`demo-rail-group${outOfScope ? ' is-out-of-scope' : ''}`}
                      aria-pressed={selected && !viewAs.email}
                      aria-expanded={selected}
                      onClick={() => {
                        setShowAll(false);
                        onChange({ groupKey: group.key });
                      }}
                    >
                      <span className="demo-rail-group-name">{group.key}</span>
                      <span className="demo-rail-group-meta">
                        {group.members.length} {group.members.length === 1 ? 'member' : 'members'} ·{' '}
                        {ttlLabel(group)}
                        {expiringOnly ? ` · ${members.length} expiring` : ''}
                      </span>
                      {outOfScope ? (
                        <span className="demo-rail-group-meta">Doesn&apos;t own {appLabel}</span>
                      ) : null}
                    </button>
                    {selected ? (
                      <ul className="demo-rail-members" aria-label={`${group.key} members`}>
                        {visible.map((member) => (
                          <li key={member.email}>
                            <button
                              type="button"
                              className="demo-rail-member"
                              aria-pressed={viewAs.email === member.email}
                              onClick={() => onChange({ groupKey: group.key, email: member.email })}
                            >
                              <span>{member.name}</span>
                              <span className={expiryClass(member)}>{expiryLabel(member)}</span>
                            </button>
                          </li>
                        ))}
                        {members.length > visible.length ? (
                          <li>
                            <button
                              type="button"
                              className="demo-btn demo-btn-ghost demo-btn-small"
                              onClick={() => setShowAll(true)}
                            >
                              Show all {members.length}
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
