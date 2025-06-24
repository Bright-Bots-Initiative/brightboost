#!/bin/bash

source .env

if [ -z "$POSTGRES_URL" ]; then
  echo "Error: POSTGRES_URL environment variable is not set"
  exit 1
fi

echo "Running Prisma migrations on Aurora PostgreSQL (AWS RDS)..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "Migration completed successfully"
else
  echo "Migration failed"
  exit 1
fi
