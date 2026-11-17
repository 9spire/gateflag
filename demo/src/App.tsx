import { loadPersonas, type Persona } from '@gateflag/core';
import {
  AccessButton,
  AccessControlErrorBoundary,
  AccessControlProvider,
  useAccessControl,
  useAdminCloseHandler,
} from 'gateflag';
import { useCallback, useMemo, useState } from 'react';
import {
  ADMIN_PERSONA,
  resolveViewAs,
  viewAsForPersona,
  type ViewAs,
} from './data/audiences.js';
import { ACCESS_CLIENTS, flagsForClient, type AccessClientId } from './data/flags.js';
import { AppPicker } from './panels/AppPicker.js';
import { AudienceRail } from './panels/AudienceRail.js';
import { FeatureCards } from './panels/FeatureCards.js';
import { GuidedTour } from './panels/GuidedTour.js';
import { IntegrateSnippet } from './panels/IntegrateSnippet.js';
import { ThemeToggle } from './panels/ThemeToggle.js';
import { ViewAsSummary, viewAsTitle } from './panels/ViewAsSummary.js';

const PERSONA_KEY = 'gateflag:persona';
const APP_KEY = 'gateflag:app';
const VIEW_AS_KEY = 'gateflag:view-as';
const DEFAULT_PERSONA = 'sam-none';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'browser' ? 'browser' : 'api';
const { personas: PERSONAS } = loadPersonas();

function loadPersonaId(personas: Persona[]): string {
  try {
    const stored = localStorage.getItem(PERSONA_KEY);
    if (stored && personas.some((persona) => persona.id === stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return personas.some((persona) => persona.id === DEFAULT_PERSONA)
    ? DEFAULT_PERSONA
    : (personas[0]?.id ?? DEFAULT_PERSONA);
}

function loadAppId(): AccessClientId {
  try {
    const stored = localStorage.getItem(APP_KEY);
    if (stored && ACCESS_CLIENTS.some((client) => client.id === stored)) {
      return stored as AccessClientId;
    }
  } catch {
    /* ignore */
  }
  return 'storefront';
}

function loadViewAs(personaId: string): ViewAs {
  try {
    const stored = JSON.parse(localStorage.getItem(VIEW_AS_KEY) ?? 'null') as ViewAs | null;
    if (stored && resolveViewAs(stored).personaId === personaId) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return viewAsForPersona(personaId);
}

function DemoChrome({
  personaId,
  viewAs,
  setViewAs,
  accessClientId,
  setAccessClientId,
}: {
  personaId: string;
  viewAs: ViewAs;
  setViewAs: (viewAs: ViewAs) => void;
  accessClientId: AccessClientId;
  setAccessClientId: (id: AccessClientId) => void;
}) {
  const { permissions, refresh, error } = useAccessControl();
  const onAdminClose = useAdminCloseHandler();
  const [resetting, setResetting] = useState(false);
  const appLabel =
    ACCESS_CLIENTS.find((client) => client.id === accessClientId)?.label ?? accessClientId;
  const keys = flagsForClient(accessClientId);
  const unlocked = keys.filter((key) => permissions?.evaluations[key]?.granted).length;

  const resetDemo = useCallback(async () => {
    setResetting(true);
    try {
      await fetch('/api/v1/demo/reset', { method: 'POST' });
      await refresh();
    } finally {
      setResetting(false);
    }
  }, [refresh]);

  return (
    <div className="demo-shell">
      {DEMO_MODE === 'browser' ? (
        <div className="demo-banner" role="status">
          Running in browser mode. Data is stored in your browser.
        </div>
      ) : null}

      <header className="demo-header">
        <div className="demo-brand">
          <span className="demo-wordmark">Gateflag</span>
          <span className="demo-muted">Acme demo</span>
        </div>
        <div className="demo-header-center">
          <AppPicker value={accessClientId} onChange={setAccessClientId} />
        </div>
        <div className="demo-controls" aria-label="Demo controls">
          <ThemeToggle />
          <AccessButton
            label="Admin"
            alwaysShow
            className="demo-btn demo-btn-primary"
            onClose={onAdminClose}
          />
          <button
            type="button"
            className="demo-btn"
            disabled={resetting}
            onClick={() => void resetDemo()}
          >
            {resetting ? 'Resetting…' : 'Reset demo'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="demo-error-bar" role="status">
          API unreachable — features are hidden (fail-closed).
        </div>
      ) : null}

      <div className="demo-layout">
        <AudienceRail viewAs={viewAs} onChange={setViewAs} accessClientId={accessClientId} />

        <main className="demo-main">
          <div className="demo-main-head">
            <h1>
              {appLabel} <span className="demo-muted-inline">as {viewAsTitle(viewAs)}</span>
            </h1>
            <ViewAsSummary viewAs={viewAs} personas={PERSONAS} accessClientId={accessClientId} />
            <p className="demo-lede">
              {unlocked} of {keys.length} features unlocked. Each card says why.
            </p>
          </div>
          <FeatureCards accessClientId={accessClientId} />
        </main>

        <aside className="demo-sidebar" aria-label="Learn">
          <p className="demo-field-label">Learn</p>
          <GuidedTour viewAs={viewAs} onSwitch={setViewAs} />
          <IntegrateSnippet />
        </aside>
      </div>
    </div>
  );
}

export function App() {
  const [personaId, setPersonaIdState] = useState(() => loadPersonaId(PERSONAS));
  const [viewAs, setViewAsState] = useState<ViewAs>(() => loadViewAs(personaId));
  const [accessClientId, setAccessClientIdState] = useState<AccessClientId>(loadAppId);

  const setViewAs = useCallback((next: ViewAs) => {
    const nextPersonaId = resolveViewAs(next).personaId;
    setViewAsState(next);
    setPersonaIdState(nextPersonaId);
    localStorage.setItem(VIEW_AS_KEY, JSON.stringify(next));
    localStorage.setItem(PERSONA_KEY, nextPersonaId);
  }, []);
  const setAccessClientId = useCallback((id: AccessClientId) => {
    setAccessClientIdState(id);
    localStorage.setItem(APP_KEY, id);
  }, []);

  const config = useMemo(
    () => ({
      apiBaseUrl: '',
      userId: personaId,
      accessClientId,
      // Demo chrome keeps Admin available while View as changes feature permissions.
      getAdminAuthHeaders: () => ({ 'X-Demo-User': ADMIN_PERSONA }),
    }),
    [personaId, accessClientId],
  );

  return (
    <AccessControlErrorBoundary>
      <AccessControlProvider config={config}>
        <DemoChrome
          personaId={personaId}
          viewAs={viewAs}
          setViewAs={setViewAs}
          accessClientId={accessClientId}
          setAccessClientId={setAccessClientId}
        />
      </AccessControlProvider>
    </AccessControlErrorBoundary>
  );
}
