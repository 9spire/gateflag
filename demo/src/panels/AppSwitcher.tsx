import { ACCESS_CLIENTS, type AccessClientId } from '../data/flags.js';

export function AppSwitcher({
  value,
  onChange,
}: {
  value: AccessClientId;
  onChange: (id: AccessClientId) => void;
}) {
  return (
    <label className="demo-field">
      <span className="demo-field-label">App</span>
      <select
        aria-label="App switcher"
        value={value}
        onChange={(event) => onChange(event.target.value as AccessClientId)}
      >
        {ACCESS_CLIENTS.map((client) => (
          <option key={client.id} value={client.id}>
            {client.label}
          </option>
        ))}
      </select>
    </label>
  );
}
