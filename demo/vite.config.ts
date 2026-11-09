import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const demoMode = env.VITE_DEMO_MODE || 'api';
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: /^gateflag\/styles\.css$/,
          replacement: path.resolve(__dirname, '../react/dist/styles.css'),
        },
        {
          find: /^gateflag$/,
          replacement: path.resolve(__dirname, '../react/src/index.ts'),
        },
        {
          find: /^@gateflag\/core$/,
          replacement: path.resolve(__dirname, '../core/src/index.ts'),
        },
      ],
    },
    server: {
      port: 5173,
      proxy:
        demoMode === 'api'
          ? {
              '/api': 'http://localhost:3003',
              '/health': 'http://localhost:3003',
            }
          : undefined,
    },
    define: {
      'import.meta.env.VITE_DEMO_MODE': JSON.stringify(demoMode),
    },
  };
});
