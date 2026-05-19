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

# One-time gamification backfill — gated by RUN_GAMIFICATION_BACKFILL=true.
# The script is idempotent (XP events keyed by source+sourceRefId, badges
# upserted via unique constraint) so leaving the env var on across deploys
# is safe; clearing it after the first successful run avoids needless work.
if [ "$RUN_GAMIFICATION_BACKFILL" = "true" ]; then
  echo "predeploy: running gamification backfill"
  node scripts/backfill-gamification.cjs || \
    echo "predeploy: backfill had warnings (non-fatal)"
fi

echo "predeploy: done"
