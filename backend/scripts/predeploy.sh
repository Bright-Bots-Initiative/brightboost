#!/usr/bin/env sh
set -e

SCHEMA="../prisma/schema.prisma"

echo "predeploy: prisma migrate deploy"
npx prisma migrate deploy --schema "$SCHEMA"

echo "predeploy: prisma generate"
npx prisma generate --schema "$SCHEMA"

echo "predeploy: seed"
node prisma/seed.cjs

echo "predeploy: done"
