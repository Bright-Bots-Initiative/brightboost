# BrightBoost Testing Guide

## PostgreSQL Test Setup

The BrightBoost application uses PostgreSQL for data storage and Prisma ORM for database interactions. This guide explains how to set up and run tests against a PostgreSQL database.

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18.x or higher
- npm 9.x or higher

### Environment Variables

Tests require the following environment variables:

```
TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5433/brightboost_test
JWT_SECRET=test-secret-key
NODE_ENV=test
```

These are automatically set in the `vitest.config.ts` file for local testing. All test runs depend on TEST_DATABASE_URL for full isolation and reproducibility.

### Test Database Setup

1. Start the test database:

```bash
docker-compose -f docker-compose.test.yml up -d
```

2. Run database migrations:

```bash
./prisma/migrate-test.sh
```

3. Run tests:

```bash
npm run test
```

### Automated Test Setup

For convenience, we've added npm scripts to automate the test setup:

```bash
# Setup test database and run migrations
npm run test:db:setup

# Run tests
npm run test

# Teardown test database
npm run test:db:teardown
```

### CI/CD Integration

The CI/CD pipeline automatically:

1. Starts a PostgreSQL test container
2. Runs Prisma migrations
3. Executes tests against the test database
4. Tears down the test container

## Test Structure

Tests are organized by feature area:

- `auth.test.ts` - Authentication endpoints
- `lessons.test.ts` - Lesson CRUD operations
- `gamification.test.ts` - User gamification features
- `teacher.test.ts` - Teacher dashboard endpoints

Each test file follows the pattern:

1. Import dependencies
2. Set up test data
3. Test API endpoints
4. Verify database state
5. Clean up test data

## Utility Functions

The `tests/utils/database.ts` file provides utility functions for:

- Setting up and tearing down the test database
- Creating test users with different roles
- Creating test lessons and other data

## Type Definitions

Type definitions for test utilities are in `tests/types.ts`, providing proper TypeScript interfaces for:

- `UserOverrides` - User model overrides
- `LessonOverrides` - Lesson model overrides
- `ActivityOverrides` - Activity model overrides
- `BadgeOverrides` - Badge model overrides

## Test Isolation Strategy

### Unique Data Generation
- All test users are created with auto-generated unique IDs using timestamps and random numbers
- Email addresses include timestamps to prevent conflicts during parallel test execution
- No hardcoded IDs are used in test files

### Database Cleanup
- Uses Prisma transactions for atomic cleanup operations
- Deletes records in correct order (child records before parent records)
- Each test has isolated database state via afterEach hooks

## Notes on ESLint Configuration

The test files use ES6 imports for all modules including the Express app:

```typescript
import app from '../server.cjs';
```
