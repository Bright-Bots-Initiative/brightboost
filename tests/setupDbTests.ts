import { beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from './utils/database';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});
