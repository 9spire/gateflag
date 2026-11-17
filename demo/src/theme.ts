const STORAGE_KEY = 'gateflag:theme';

export type ThemePreference = 'light' | 'dark';

function systemTheme(): ThemePreference {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Migrate former "system" (or missing) to a concrete choice.
    if (stored === 'system' || !stored) {
      return systemTheme();
    }
  } catch {
    /* ignore */
  }
  return 'light';
}

/** Apply theme on <html> so portaled admin UI inherits the same tokens. */
export function applyTheme(preference: ThemePreference): ThemePreference {
  document.documentElement.dataset.theme = preference;
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  return preference;
}

export function cycleTheme(preference: ThemePreference): ThemePreference {
  return preference === 'light' ? 'dark' : 'light';
}
