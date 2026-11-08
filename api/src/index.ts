import { loadConfig } from './config.js';
import { createApp, createMemoryRepo } from './http/app.js';
import { createDocClient } from './repository/dynamo/client.js';
import { DynamoRepository } from './repository/dynamo/DynamoRepository.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const repo =
    config.storage === 'dynamo'
      ? new DynamoRepository(
          createDocClient({
            region: config.awsRegion,
            endpoint: config.dynamodbEndpoint,
          }),
          config.dynamodbTableName,
        )
      : await createMemoryRepo();

  const app = await createApp({ config, repo });
  app.listen(config.port, () => {
    console.log(`gateflag api listening on :${config.port} (storage=${config.storage})`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
