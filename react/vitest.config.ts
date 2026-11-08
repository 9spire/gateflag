import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // Source exports for local tests; package.json points at dist for consumers.
    alias: {
      gateflag: new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
  resolve: {
    alias: {
      '@gateflag/core': new URL('../core/src/index.ts', import.meta.url).pathname,
    },
  },
});
