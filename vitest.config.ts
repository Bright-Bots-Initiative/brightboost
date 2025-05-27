import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    env: {
      POSTGRES_URL: 'postgresql://test_user:test_password@localhost:5433/brightboost_test',
      JWT_SECRET: 'test-secret-key',
      NODE_ENV: 'test'
    },
    environmentOptions: {
      jsdom: {
      }
    },
    browser: {
      enabled: false, // Disable browser tests for API testing
      name: 'chrome',
    },
    include: ['tests/**/*.test.ts'], // Only run API tests
    globalSetup: './tests/setupDbTests.ts',
    testTimeout: 30000, // Increase timeout for database operations
  },
});
