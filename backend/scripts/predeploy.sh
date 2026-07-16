#!/usr/bin/env sh
set -e

# ── DIRECT_URL guard ─────────────────────────────────────────────────────────
# 2026-07 incident (#646 → PR #685): DIRECT_URL was never set on Railway, so
# every 'prisma migrate deploy' failed and the then-tolerant block below let
# the app boot anyway. Prod ran with no _prisma_migrations table and the
# resulting schema drift had to be healed by hand. Prisma migrate needs the
# DIRECT / session-pooler connection (Supabase port 5432) — the transaction
# pooler (6543/pgbouncer) hangs Prisma's schema engine. Fail loudly and early.
if [ -z "$DIRECT_URL" ]; then
  echo "=========================================================================="
  echo "predeploy: FATAL — DIRECT_URL is not set."
  echo "predeploy: prisma migrate requires the direct (session-pooler, port 5432)"
  echo "predeploy: connection. Set DIRECT_URL on the Railway service, then redeploy."
  echo "=========================================================================="
  exit 1
fi

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
  echo "predeploy: FATAL — 'prisma migrate deploy' failed (exit $rc)."
  echo "predeploy:"
  echo "predeploy:   Hard-failing the deploy (#650 decision, enabled by the #646"
  echo "predeploy:   baseline): booting on a stale schema hides failed migrations —"
  echo "predeploy:   that is exactly how the 2026-07 prod drift incident happened"
  echo "predeploy:   (tolerated failures, no _prisma_migrations, manual heal in"
  echo "predeploy:   PR #685). Fix the migration (or the DB state) and redeploy."
  echo "=========================================================================="
  exit "$rc"
fi

echo "predeploy: prisma generate"
npx prisma generate --schema "$SCHEMA"

# Seed — gated by RUN_SEED=true (#651).
# Previously ran on EVERY deploy. The seed is a development fixture: it
# find-or-creates demo accounts AND refreshes their password hashes on every
# run (prisma/seed.cjs — "Always refresh password hash on seed"), so each
# deploy silently rewrote production user rows. Gate it the way the
# gamification backfill is gated. Set RUN_SEED=true only to bootstrap a fresh
# database (see docs/deploy.md), then clear it.
# Mandatory else (unlike RUN_GAMIFICATION_BACKFILL): skip must be loud so a
# fresh DB isn't mysteriously empty.
if [ "$RUN_SEED" = "true" ]; then
  echo "predeploy: RUN_SEED=true — running seed from $SEED_FILE"
  node "$SEED_FILE" || echo "predeploy: seed had warnings (non-fatal)"
else
  echo "predeploy: skipping seed (RUN_SEED not set — see docs/deploy.md, issue #651)"
fi

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
