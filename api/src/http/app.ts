import {
  createPersonaIdentityResolver,
  createRoutes,
  InMemoryRepository,
  loadPersonas,
  loadSeed,
  type Repository,
} from '@gateflag/core';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import type { ApiConfig } from '../config.js';
import { registerRoutes } from './expressAdapter.js';

export interface CreateAppOptions {
  config: ApiConfig;
  repo: Repository;
  clock?: () => Date;
}

export async function createApp(options: CreateAppOptions): Promise<Express> {
  const { config, repo } = options;
  const clock = options.clock ?? (() => new Date());
  const app = express();

  const logger = pino({
    level: config.logLevel,
    redact: {
      paths: ['req.headers["x-demo-user"]', 'req.headers["X-Demo-User"]'],
      remove: true,
    },
  });

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    }),
  );

  app.use(
    cors({
      origin: config.allowedOrigins,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          details: [],
        },
      });
    },
  });
  app.use('/api/v1/admin', limiter);
  app.use('/api/v1/demo/reset', limiter);

  const routes = createRoutes({
    repo,
    identity: createPersonaIdentityResolver(loadPersonas()),
    clock,
    config: {
      allowedAccessClients: config.allowedAccessClients,
      storage: config.storage,
      databaseStatus: config.storage === 'dynamo' ? 'available' : 'available',
    },
  });

  registerRoutes(app, routes);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (res.headersSent) {
        next(error);
        return;
      }
      logger.error({ err: error }, 'unhandled error');
      res.status(500).json({
        error: {
          code: 'INTERNAL',
          message: 'Internal server error',
          details: [],
        },
      });
    },
  );

  return app;
}

export async function createMemoryRepo(now = new Date()): Promise<InMemoryRepository> {
  const repo = new InMemoryRepository();
  await repo.resetTo(loadSeed(now));
  return repo;
}
