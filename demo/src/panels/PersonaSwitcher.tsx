import type { Persona } from '@gateflag/core';

export function PersonaSwitcher({
  personas,
  value,
  onChange,
}: {
  personas: Persona[];
  value: string;
  onChange: (personaId: string) => void;
}) {
  const selected = personas.find((persona) => persona.id === value) ?? personas[0];
  return (
    <label className="demo-field">
      <span className="demo-field-label">Persona</span>
      <select
        aria-label="Persona switcher"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.displayName}
          </option>
        ))}
      </select>
      {selected ? <small className="demo-blurb">{selected.blurb}</small> : null}
    </label>
  );
}
