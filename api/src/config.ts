import { DEFAULT_ALLOWED_ACCESS_CLIENTS } from '@gateflag/core';

export type StorageMode = 'memory' | 'dynamo';

export interface ApiConfig {
  port: number;
  storage: StorageMode;
  dynamodbEndpoint: string | undefined;
  dynamodbTableName: string;
  awsRegion: string;
  allowedAccessClients: string[];
  allowedOrigins: string[];
  logLevel: string;
}

function splitCsv(value: string | undefined, fallback: readonly string[]): string[] {
  if (!value || value.trim() === '') {
    return [...fallback];
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const storage = (env.STORAGE ?? 'memory') as StorageMode;
  if (storage !== 'memory' && storage !== 'dynamo') {
    throw new Error(`Invalid STORAGE: ${storage}`);
  }

  return {
    port: Number(env.PORT ?? '3003'),
    storage,
    dynamodbEndpoint: env.DYNAMODB_ENDPOINT || undefined,
    dynamodbTableName: env.DYNAMODB_TABLE_NAME ?? 'gateflag',
    awsRegion: env.AWS_REGION ?? 'us-east-1',
    allowedAccessClients: splitCsv(env.ALLOWED_ACCESS_CLIENTS, DEFAULT_ALLOWED_ACCESS_CLIENTS),
    allowedOrigins: splitCsv(env.ALLOWED_ORIGINS, ['http://localhost:5173']),
    logLevel: env.LOG_LEVEL ?? 'info',
  };
}
