import { runRepositoryContract } from './contract.js';
import { InMemoryRepository } from './InMemoryRepository.js';

runRepositoryContract('InMemoryRepository', () => new InMemoryRepository());
