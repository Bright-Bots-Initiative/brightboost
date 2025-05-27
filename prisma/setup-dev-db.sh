#!/bin/bash

set -e

if ! command -v docker &> /dev/null; then
  echo "Docker is required but not installed. Please install Docker first."
  exit 1
fi

if ! docker ps | grep -q "brightboost-postgres"; then
  echo "Starting PostgreSQL container..."
  docker run --name brightboost-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
  
  echo "Waiting for PostgreSQL to start..."
  sleep 5
  
  echo "Creating brightboost database..."
  docker exec -it brightboost-postgres psql -U postgres -c "CREATE DATABASE brightboost;"
else
  echo "PostgreSQL container is already running."
fi

if [ ! -f .env ]; then
  echo "Creating .env file with local database connection..."
  echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/brightboost" > .env
  echo "JWT_SECRET=local-development-secret" >> .env
  echo "NODE_ENV=development" >> .env
  echo "PORT=3000" >> .env
else
  echo ".env file already exists. Skipping creation."
fi

echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate dev

echo "Seeding the database with test data..."
npx prisma db seed

echo "Development database setup complete!"
echo "You can now run 'npm run dev' to start the application."
