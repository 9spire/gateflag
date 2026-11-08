import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPersonaIdentityResolver,
  createRoutes,
  InMemoryRepository,
  loadPersonas,
  DEFAULT_ALLOWED_ACCESS_CLIENTS,
} from '@gateflag/core';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));

describe('openapi coverage', () => {
  it('documents every core route path', () => {
    const routes = createRoutes({
      repo: new InMemoryRepository(),
      identity: createPersonaIdentityResolver(loadPersonas()),
      clock: () => new Date(),
      config: {
        allowedAccessClients: DEFAULT_ALLOWED_ACCESS_CLIENTS,
        storage: 'memory',
        databaseStatus: 'available',
      },
    });

    const raw = readFileSync(join(here, '../openapi.yaml'), 'utf8');
    const doc = parseYaml(raw) as {
      paths: Record<string, Record<string, unknown>>;
    };

    for (const route of routes) {
      const openApiPath = route.path.replace(/:([A-Za-z]+)/g, '{$1}');
      const pathItem = doc.paths[openApiPath];
      expect(pathItem, `missing path ${openApiPath} (from ${route.path})`).toBeTruthy();
      const method = route.method.toLowerCase();
      expect(pathItem[method], `missing ${route.method} ${openApiPath}`).toBeTruthy();
    }
  });
});
