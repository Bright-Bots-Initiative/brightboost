import { setupTestDatabase, teardownTestDatabase } from './utils/database';

process.env.NODE_ENV = 'test';

export async function setup() {
  console.log('Setting up test database...');
  await setupTestDatabase();
  console.log('Test database setup complete');
}

export async function teardown() {
  console.log('Tearing down test database...');
  await teardownTestDatabase();
  console.log('Test database teardown complete');
}
