#!/bin/bash
set -e

export POSTGRES_URL="postgresql://test_user:test_password@localhost:5433/brightboost_test"
export NODE_ENV="test"
export DATABASE_URL="$POSTGRES_URL"  # Required for Prisma CLI compatibility

echo "Running migrations on test database with URL: $POSTGRES_URL"

if ! docker ps | grep -q brightboost-test-postgres; then
  echo "Error: PostgreSQL test container is not running. Please start it with 'docker-compose -f docker-compose.test.yml up -d'"
  exit 1
fi

echo "Ensuring test database exists..."
docker exec brightboost-test-postgres-1 psql -U test_user -c "DROP DATABASE IF EXISTS brightboost_test;" || true
docker exec brightboost-test-postgres-1 psql -U test_user -c "CREATE DATABASE brightboost_test;" || true

echo "Applying migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

if [ $? -eq 0 ]; then
  echo "Test database migrations completed successfully!"
else
  echo "Error: Migrations failed to apply. Please check the error messages above."
  exit 1
fi

echo "Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma

echo "Test database setup complete and ready for testing!"
