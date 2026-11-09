import { loadPersonas, type Persona } from '@gateflag/core';
import {
  AccessButton,
  AccessControlErrorBoundary,
  AccessControlProvider,
  useAccessControl,
  useAdminCloseHandler,
} from 'gateflag';
import { useCallback, useMemo, useState } from 'react';
import { ACCESS_CLIENTS, type AccessClientId } from './data/flags.js';
import { AppSwitcher } from './panels/AppSwitcher.js';
import { FeatureCards } from './panels/FeatureCards.js';
import { IntegrateSnippet } from './panels/IntegrateSnippet.js';
import { PersonaSwitcher } from './panels/PersonaSwitcher.js';
import { TryThis } from './panels/TryThis.js';
import { WhyPanel } from './panels/WhyPanel.js';

const PERSONA_KEY = 'gateflag:persona';
const APP_KEY = 'gateflag:app';
const DEFAULT_PERSONA = 'sam-none';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'browser' ? 'browser' : 'api';

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

function DemoChrome({
  personas,
  personaId,
  setPersonaId,
  accessClientId,
  setAccessClientId,
}: {
  personas: Persona[];
  personaId: string;
  setPersonaId: (id: string) => void;
  accessClientId: AccessClientId;
  setAccessClientId: (id: AccessClientId) => void;
}) {
  const { refresh, error } = useAccessControl();
  const onAdminClose = useAdminCloseHandler();
  const [resetting, setResetting] = useState(false);
  const persona = personas.find((entry) => entry.id === personaId) ?? personas[0];
  const appLabel =
    ACCESS_CLIENTS.find((client) => client.id === accessClientId)?.label ?? accessClientId;

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
          <span className="demo-muted">Acme · {appLabel}</span>
        </div>
        <div className="demo-controls">
          <AppSwitcher
            value={accessClientId}
            onChange={(id) => {
              setAccessClientId(id);
              localStorage.setItem(APP_KEY, id);
            }}
          />
          <PersonaSwitcher
            personas={personas}
            value={personaId}
            onChange={(id) => {
              setPersonaId(id);
              localStorage.setItem(PERSONA_KEY, id);
            }}
          />
          <AccessButton
            label="Admin"
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
        <main className="demo-main">
          <div className="demo-main-head">
            <h1>{appLabel}</h1>
            <p className="demo-lede">
              Mock Acme surface for <strong>{persona?.displayName ?? 'guest'}</strong>. Cards
              unlock when Gateflag grants the flag for this app.
            </p>
          </div>
          <FeatureCards accessClientId={accessClientId} />
        </main>
        <aside className="demo-sidebar">
          <WhyPanel
            personaName={persona?.displayName ?? 'this user'}
            accessClientId={accessClientId}
          />
          <TryThis />
          <IntegrateSnippet />
        </aside>
      </div>
    </div>
  );
}

export function App() {
  const personas = useMemo(() => loadPersonas().personas, []);
  const [personaId, setPersonaId] = useState(() => loadPersonaId(personas));
  const [accessClientId, setAccessClientId] = useState<AccessClientId>(loadAppId);

  const config = useMemo(
    () => ({
      apiBaseUrl: '',
      userId: personaId,
      accessClientId,
    }),
    [personaId, accessClientId],
  );

  return (
    <AccessControlErrorBoundary>
      <AccessControlProvider config={config}>
        <DemoChrome
          personas={personas}
          personaId={personaId}
          setPersonaId={setPersonaId}
          accessClientId={accessClientId}
          setAccessClientId={setAccessClientId}
        />
      </AccessControlProvider>
    </AccessControlErrorBoundary>
  );
}
