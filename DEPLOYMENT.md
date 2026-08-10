# BrightBoost Deployment Guide

## Production Stack

| Component | Platform | URL |
|---|---|---|
| Backend + Frontend | Railway | `fe-production-3552.up.railway.app` |
| Backend API (standalone) | Railway | `brightboost-production.up.railway.app` |
| Database | Supabase Postgres | Connected via `DATABASE_URL` env var |
| Schema management | Prisma ORM | `prisma/schema.prisma` (source of truth) |

## How Production Deploys

1. Code is pushed to the `main` branch on GitHub
2. Railway detects the push and starts a new deployment
3. Railway builds using `Dockerfile.backend` (at repo root)
4. On container start, `backend/scripts/predeploy.sh` runs:
   - `prisma migrate deploy` (applies any new migration files; hard-fails on error)
   - `prisma generate` (regenerates Prisma client)
   - Seed step is gated by `RUN_SEED=true` (default behavior is skip)
5. Express server starts at `dist/src/server.js`
6. With `SERVE_FRONTEND=true`, Express serves the Vite-built SPA for non-API routes

## Required Environment Variables (Railway)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase Postgres connection string (pooled) |
| `DIRECT_URL` | Yes | Supabase direct connection string (session pooler, port 5432); predeploy hard-fails if unset |
| `RUN_SEED` | No | Optional deploy-time seed gate; only exact `true` runs seed (default: unset = skip) |
| `RUN_GAMIFICATION_BACKFILL` | No | Existing sibling gate; same exact `"true"` convention as `RUN_SEED` |
| `SESSION_SECRET` | Yes | JWT signing secret — must NOT be the default |
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Railway sets this automatically |
| `SERVE_FRONTEND` | Yes | `true` to serve frontend from Express |
| `FRONTEND_URL` | Recommended | Public URL for password reset email links |
| `FRONTEND_ORIGINS` | Optional | Comma-separated CORS origins (Railway domain is hardcoded) |
| `SMTP_HOST` | Optional | SMTP server for email delivery |
| `SMTP_PORT` | Optional | SMTP port |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP password |
| `MAIL_FROM` | Optional | From address for emails |

## RUN_SEED Runbook (Production)

`predeploy.sh` treats seeding as opt-in (same shape as `RUN_GAMIFICATION_BACKFILL`):

- Only the exact string `RUN_SEED=true` runs the seed (`node "$SEED_FILE"`, typically `../prisma/seed.cjs`).
- Unset (the default) skips seeding.
- Values like `1`, `yes`, or `TRUE` do **not** enable the seed — exact `"true"` only (same rule as `RUN_GAMIFICATION_BACKFILL`).

Use `RUN_SEED` only when bootstrapping a fresh/empty production database — essentially never otherwise.

1. Set `RUN_SEED=true` on the Railway backend service.
2. Trigger a deploy.
3. Confirm logs include: `predeploy: RUN_SEED=true — running seed from …`
4. Clear `RUN_SEED` immediately after the successful bootstrap.
5. Trigger (or observe) the next deploy and confirm logs include:  
   `predeploy: skipping seed (RUN_SEED not set — see docs/deploy.md, issue #651)`

Warnings:

- The seed find-or-creates demo accounts **and refreshes their password hashes** on every run (`prisma/seed.cjs` — "Always refresh password hash on seed").
- When `NODE_ENV !== "production"`, seed cleanup can wipe/reset data.
- Do not set `RUN_SEED=true` against a populated production database unless you intend both.

Local dev and CI are unchanged: neither path calls `predeploy.sh`; contributors should continue running seed directly (`npm run seed`) when needed. If we add a future DB-backed CI job, it should call seed directly and must not route through `predeploy.sh`.

## Local Development

### Prerequisites

- Node.js v20+
- npm
- Docker (for local Postgres)

### Quick Start

```bash
# Start local Postgres
docker compose -f docker-compose-pg.yml up -d

# Install dependencies
npm install
cd backend && npm install && cd ..

# Copy and configure env
cp .env.example .env
# Edit .env with local values (see .env.example for guidance)

# Set up database
npx prisma db push --schema prisma/schema.prisma
npx prisma db seed

# Run both servers
cd backend && npm run dev   # Terminal 1 — API on :3000
npm run dev                  # Terminal 2 — Frontend on :5173
```

### Local Env Vars

See `.env.example` for the full list. Key local values:

```env
DATABASE_URL="postgresql://postgres:brightboostpass@localhost:5435/brightboost"
DIRECT_URL="postgresql://postgres:brightboostpass@localhost:5435/brightboost"
VITE_API_BASE="http://localhost:3000"
SESSION_SECRET="local-dev-secret"
```

## Schema Management

- **Source of truth:** `prisma/schema.prisma` (repo root)
- **Secondary copy:** `backend/prisma/schema.prisma` (kept in sync for Dockerfile compatibility)
- **Migrations:** `prisma/migrations/` — applied via `prisma migrate deploy` on production startup
- **Seed:** `prisma/seed.cjs` — deploy seeding is gated by `RUN_SEED=true`; default is skip

## Legacy Deployment References

The repo contains files from earlier deployment phases (AWS Lambda, Azure Static Web Apps, Aurora PostgreSQL). These are **no longer the production path**:

- `.github/workflows/deploy-stem1.yml` — Azure SWA deploy (legacy)
- `.github/workflows/prod-smoke.yml` — Azure SWA smoke test (legacy)
- `docs/azure/` — Azure-specific scaling docs (legacy)
- `docs/architecture/` — AWS Lambda architecture diagrams (legacy)
- `docker-compose.yml` — references Azure Functions `func start` (legacy)

These files are retained for historical reference but should not be used for production decisions.
