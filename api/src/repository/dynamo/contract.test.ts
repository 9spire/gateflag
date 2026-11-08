import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { describe, it } from 'vitest';
import { runRepositoryContract } from '../../../../core/src/repository/contract.js';
import { createDocClient } from './client.js';
import { DynamoRepository } from './DynamoRepository.js';
import { ensureTable, waitForDynamo } from './table.js';

const endpoint = process.env.DYNAMODB_ENDPOINT;

if (!endpoint) {
  describe.skip('repository contract: DynamoRepository', () => {
    it('requires DYNAMODB_ENDPOINT', () => {
      // skipped
    });
  });
} else {
  const tableName = process.env.DYNAMODB_TABLE_NAME ?? 'gateflag-contract';
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const client = new DynamoDBClient({
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
    },
  });

  runRepositoryContract('DynamoRepository', async () => {
    await waitForDynamo(client);
    await ensureTable(client, tableName);
    const repo = new DynamoRepository(createDocClient({ region, endpoint }), tableName);
    await repo.resetTo({
      seedVersion: 1,
      users: [],
      groups: [],
      memberships: [],
      flags: [],
      roleGrants: [],
      groupGrants: [],
      userGrants: [],
      developerDenies: [],
    });
    return repo;
  });
}
