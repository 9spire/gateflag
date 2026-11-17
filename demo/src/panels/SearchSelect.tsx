import { Check, ChevronDown, Search } from 'lucide-react';
import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export type SearchOption = {
  id: string;
  label: string;
  detail?: string;
  section?: string;
  tag?: string;
};

export function SearchSelect({
  label,
  valueLabel,
  options,
  selectedId,
  onSelect,
  noun,
  maxResults = 50,
}: {
  label: string;
  valueLabel: string;
  options: SearchOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  noun: string;
  maxResults?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter((option) =>
        [option.label, option.detail, option.id].some((text) =>
          text?.toLowerCase().includes(needle),
        ),
      )
    : options;
  const matches = filtered.slice(0, maxResults);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const openMenu = () => {
    setQuery('');
    setActive(
      Math.max(
        0,
        options.slice(0, maxResults).findIndex((o) => o.id === selectedId),
      ),
    );
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const select = (id: string) => {
    onSelect(id);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const choice = matches[active];
      if (choice) {
        select(choice.id);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="demo-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="demo-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className="demo-field-label">{label}</span>{' '}
        <span className="demo-picker-value">{valueLabel}</span>
        <ChevronDown aria-hidden size={16} />
      </button>

      {open ? (
        <div className="demo-picker-menu">
          <div className="demo-picker-search">
            <Search aria-hidden size={14} />
            <input
              autoFocus
              role="combobox"
              aria-label={`Search ${noun}`}
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
              placeholder={`Search ${options.length} ${noun}…`}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
            />
          </div>
          <ul id={listId} role="listbox" aria-label={label} className="demo-picker-list">
            {matches.map((option, index) => (
              <Fragment key={option.id}>
                {option.section && option.section !== matches[index - 1]?.section ? (
                  <li role="presentation" className="demo-picker-section">
                    {option.section}
                  </li>
                ) : null}
                <li
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.id === selectedId}
                  className={index === active ? 'is-active' : undefined}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => select(option.id)}
                >
                  <span>
                    {option.label}
                    {option.detail ? <code>{option.detail}</code> : null}
                  </span>
                  {option.tag ? <span className="demo-picker-tag">{option.tag}</span> : null}
                  {option.id === selectedId ? <Check aria-hidden size={14} /> : null}
                </li>
              </Fragment>
            ))}
            {matches.length === 0 ? <li className="demo-picker-empty">No {noun} match</li> : null}
            {filtered.length > matches.length ? (
              <li className="demo-picker-empty">
                Showing {matches.length} of {filtered.length}. Keep typing to narrow down.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
