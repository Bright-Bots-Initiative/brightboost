#!/usr/bin/env sh
set -e

SCHEMA="prisma/schema.prisma"
ROOT_SCHEMA="../prisma/schema.prisma"
SEED_FILE="prisma/seed.cjs"
ROOT_SEED="../prisma/seed.cjs"

# Prefer the root schema if it exists (monorepo layout), else use backend-local
if [ -f "$ROOT_SCHEMA" ]; then
  SCHEMA="$ROOT_SCHEMA"
fi

# Prefer root seed file (monorepo layout), else use backend-local
if [ -f "$ROOT_SEED" ]; then
  SEED_FILE="$ROOT_SEED"
fi

echo "predeploy: using schema $SCHEMA"
echo "predeploy: using seed $SEED_FILE"

echo "predeploy: prisma migrate deploy"
npx prisma migrate deploy --schema "$SCHEMA" || {
  echo "predeploy: migrate deploy failed, falling back to db push"
  npx prisma db push --schema "$SCHEMA" --accept-data-loss || {
    echo "predeploy: db push also failed — continuing anyway"
  }
}

echo "predeploy: prisma generate"
npx prisma generate --schema "$SCHEMA"

echo "predeploy: running seed from $SEED_FILE"
node "$SEED_FILE" || echo "predeploy: seed had warnings (non-fatal)"

echo "predeploy: done"
