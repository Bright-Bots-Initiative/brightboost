#!/usr/bin/env sh
set -e

SCHEMA="prisma/schema.prisma"
ROOT_SCHEMA="../prisma/schema.prisma"

# Prefer the root schema if it exists (monorepo layout), else use backend-local
if [ -f "$ROOT_SCHEMA" ]; then
  SCHEMA="$ROOT_SCHEMA"
fi

echo "predeploy: using schema $SCHEMA"

echo "predeploy: prisma migrate deploy"
npx prisma migrate deploy --schema "$SCHEMA" || {
  echo "predeploy: migrate deploy failed, falling back to db push"
  npx prisma db push --schema "$SCHEMA" --accept-data-loss
}

echo "predeploy: prisma generate"
npx prisma generate --schema "$SCHEMA"

echo "predeploy: seed"
node prisma/seed.cjs

echo "predeploy: done"
