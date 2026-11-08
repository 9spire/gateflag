import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { loadConfig } from '../config.js';
import { createApp, createMemoryRepo } from './app.js';

describe('express app (memory)', () => {
  let app: Express;

  beforeAll(async () => {
    const config = loadConfig({
      ...process.env,
      STORAGE: 'memory',
      PORT: '3003',
      LOG_LEVEL: 'silent',
    });
    const repo = await createMemoryRepo(new Date('2026-01-01T00:00:00.000Z'));
    app = await createApp({
      config,
      repo,
      clock: () => new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.storage).toBe('memory');
    expect(res.body.apiVersion).toBe('v1');
  });

  it('GET /api/v1/permissions requires demo user', async () => {
    const res = await request(app).get('/api/v1/permissions');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/permissions for Sam on storefront', async () => {
    const res = await request(app)
      .get('/api/v1/permissions')
      .set('X-Demo-User', 'sam-none')
      .set('X-Access-Client', 'storefront');
    expect(res.status).toBe(200);
    expect(res.body.flags).toEqual(['DARK_MODE']);
  });

  it('non-admin cannot list flags', async () => {
    const res = await request(app)
      .get('/api/v1/admin/flags')
      .set('X-Demo-User', 'pat-beta');
    expect(res.status).toBe(403);
  });
});
