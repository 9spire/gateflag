import {
  AUDIENCE_GROUPS,
  AUDIENCE_KINDS,
  resolveViewAs,
  ttlLabel,
  type ViewAs,
} from '../data/audiences.js';
import { SearchSelect } from './SearchSelect.js';

const OPTIONS = AUDIENCE_KINDS.flatMap(({ kind, label }) =>
  AUDIENCE_GROUPS.filter((group) => group.kind === kind).map((group) => ({
    id: group.key,
    label: group.key,
    detail: group.description,
    section: label,
    tag: ttlLabel(group),
  })),
);

export function PeoplePicker({
  viewAs,
  onChange,
}: {
  viewAs: ViewAs;
  onChange: (viewAs: ViewAs) => void;
}) {
  const { group } = resolveViewAs(viewAs);
  return (
    <SearchSelect
      label="View as"
      noun="groups"
      valueLabel={group.key}
      selectedId={group.key}
      options={OPTIONS}
      onSelect={(id) => onChange({ groupKey: id })}
    />
  );
}
