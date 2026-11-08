import { loadSeed } from '@gateflag/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { loadConfig } from '../config.js';
import { createDocClient } from '../repository/dynamo/client.js';
import { DynamoRepository } from '../repository/dynamo/DynamoRepository.js';
import { ensureTable, waitForDynamo } from '../repository/dynamo/table.js';

async function main(): Promise<void> {
  const config = loadConfig();
  if (config.storage !== 'dynamo') {
    console.log('STORAGE is not dynamo; skipping setup-and-seed');
    return;
  }

  const client = new DynamoDBClient({
    region: config.awsRegion,
    ...(config.dynamodbEndpoint
      ? {
          endpoint: config.dynamodbEndpoint,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
          },
        }
      : {}),
  });

  console.log('Waiting for DynamoDB...');
  await waitForDynamo(client);
  console.log('Ensuring table...');
  await ensureTable(client, config.dynamodbTableName);

  const repo = new DynamoRepository(
    createDocClient({
      region: config.awsRegion,
      endpoint: config.dynamodbEndpoint,
    }),
    config.dynamodbTableName,
  );

  const users = await repo.listUsers();
  if (users.length === 0) {
    console.log('Seeding empty table...');
    await repo.resetTo(loadSeed(new Date()));
    console.log('Seed complete');
  } else {
    console.log(`Table already has ${users.length} users; skipping seed`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
