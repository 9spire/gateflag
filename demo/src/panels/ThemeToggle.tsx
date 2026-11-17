import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  applyTheme,
  cycleTheme,
  getThemePreference,
  type ThemePreference,
} from '../theme.js';

const LABEL: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
};

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(() => getThemePreference());

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  const Icon = preference === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      className="demo-btn demo-btn-ghost"
      aria-label={`Theme: ${LABEL[preference]}. Click to change.`}
      title={`Theme: ${LABEL[preference]}`}
      onClick={() => setPreference((prev) => cycleTheme(prev))}
    >
      <Icon aria-hidden size={16} />
      <span className="demo-theme-label">{LABEL[preference]}</span>
    </button>
  );
}
