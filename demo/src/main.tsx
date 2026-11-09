import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'gateflag/styles.css';
import { App } from './App.js';
import './styles.css';

async function bootstrap() {
  if (import.meta.env.VITE_DEMO_MODE === 'browser') {
    const { startBrowserApi } = await import('./browser/mswAdapter.js');
    await startBrowserApi();
  }

  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Missing #root');
  }
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
