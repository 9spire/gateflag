import { ACCESS_CLIENTS, type AccessClientId } from '../data/flags.js';
import { SearchSelect } from './SearchSelect.js';

export function AppPicker({
  value,
  onChange,
}: {
  value: AccessClientId;
  onChange: (id: AccessClientId) => void;
}) {
  return (
    <SearchSelect
      label="App"
      noun="apps"
      valueLabel={ACCESS_CLIENTS.find((client) => client.id === value)?.label ?? value}
      selectedId={value}
      options={ACCESS_CLIENTS.map((client) => ({
        id: client.id,
        label: client.label,
        detail: client.id,
      }))}
      onSelect={(id) => onChange(id as AccessClientId)}
    />
  );
}
