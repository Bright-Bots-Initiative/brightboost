#!/bin/bash
# Production migration script for Azure PostgreSQL
# This script should be run in the production environment

# Ensure environment variables are set
if [ -z "$POSTGRES_URL" ]; then
  echo "Error: POSTGRES_URL environment variable is not set"
  exit 1
fi

# Run Prisma migration in production mode
echo "Running database migrations in production mode..."
npx prisma migrate deploy

# Verify migration status
if [ $? -eq 0 ]; then
  echo "✅ Database migration completed successfully"
else
  echo "❌ Database migration failed"
  exit 1
fi

echo "Generating Prisma client..."
npx prisma generate

echo "Migration process completed"
