import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const coreRestrictedImports = {
  paths: [
    {
      name: 'express',
      message: 'core must stay framework-free; keep Express in api.',
    },
    {
      name: 'react',
      message: 'core must stay framework-free; keep React in react/demo.',
    },
    {
      name: 'react-dom',
      message: 'core must stay framework-free; keep React in react/demo.',
    },
    {
      name: '@aws-sdk/client-dynamodb',
      message: 'core must stay framework-free; keep AWS SDK in api.',
    },
    {
      name: '@aws-sdk/lib-dynamodb',
      message: 'core must stay framework-free; keep AWS SDK in api.',
    },
  ],
  patterns: [
    {
      group: ['express/*', 'react/*', 'react-dom/*', '@aws-sdk/*', 'node:*'],
      message: 'core must stay framework-free; no Express, React, AWS SDK, or node: imports.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.vite/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['react/**/*.{ts,tsx}', 'demo/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', coreRestrictedImports],
    },
  },
  eslintConfigPrettier,
);
