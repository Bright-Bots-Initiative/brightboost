#!/usr/bin/env bash

echo "Running predeploy: Prisma generate..."
npx prisma generate --schema prisma/schema.prisma

echo "Running predeploy: Prisma push..."
npx prisma db push --schema prisma/schema.prisma

echo "Running predeploy: Seed..."
node prisma/seed.cjs

echo "Predeploy complete!"
