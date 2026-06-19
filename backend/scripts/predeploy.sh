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
if npx prisma migrate deploy --schema "$SCHEMA"; then
  echo "predeploy: migrate deploy succeeded"
else
  rc=$?
  echo "=========================================================================="
  echo "predeploy: WARNING — 'prisma migrate deploy' FAILED (exit $rc)."
  echo "predeploy:"
  echo "predeploy:   Known migration-baseline bug (#646): the committed migration"
  echo "predeploy:   history can't build the schema from scratch, so 'migrate"
  echo "predeploy:   deploy' fails on this deploy path until #646 lands."
  echo "predeploy:"
  echo "predeploy:   The previous 'db push --accept-data-loss' fallback has been"
  echo "predeploy:   INTENTIONALLY REMOVED. We do NOT force-sync production —"
  echo "predeploy:   that risked SILENTLY DROPPING DATA to match schema.prisma."
  echo "predeploy:"
  echo "predeploy:   The app will start on its EXISTING schema (correct for a"
  echo "predeploy:   code-only deploy). A deploy that REQUIRES a schema change must"
  echo "predeploy:   wait for the #646 baseline fix or a deliberate manual migration"
  echo "predeploy:   — nothing will be applied automatically here."
  echo "=========================================================================="
  # Intentionally do NOT exit non-zero: a code-only deploy must still boot the app
  # on the existing (already-correct) schema. Removing the destructive
  # 'db push --accept-data-loss' fallback is an interim safety measure for the
  # #646 migration-baseline bug. Once #646 lands, this path should use clean
  # 'migrate deploy' and may reinstate a hard non-zero exit on failure. See #646.
fi

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
