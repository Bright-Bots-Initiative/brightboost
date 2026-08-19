> **Canonical for:** deployment. Last verified against code: 2026-08-10.

# BrightBoost Deployment Guide

## Production Stack

| Component                | Platform          | URL                                      |
| ------------------------ | ----------------- | ---------------------------------------- |
| Backend + Frontend       | Railway           | `fe-production-3552.up.railway.app`      |
| Backend API (standalone) | Railway           | `brightboost-production.up.railway.app`  |
| Database                 | Supabase Postgres | Connected via `DATABASE_URL` env var     |
| Schema management        | Prisma ORM        | `prisma/schema.prisma` (source of truth) |

## Architecture

- **Frontend**: React (Vite) build served on Railway (nginx via `Dockerfile.frontend`, or Express with `SERVE_FRONTEND=true`).
- **Backend**: Node.js (Express) hosted on Railway.
- **Database**: PostgreSQL hosted on Supabase.

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

| Variable                    | Required    | Description                                                                                  |
| --------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Yes         | Supabase Postgres connection string (pooled)                                                 |
| `DIRECT_URL`                | Yes         | Supabase direct connection string (session pooler, port 5432); predeploy hard-fails if unset |
| `RUN_SEED`                  | No          | Optional deploy-time seed gate; only exact `true` runs seed (default: unset = skip)          |
| `RUN_GAMIFICATION_BACKFILL` | No          | Existing sibling gate; same exact `"true"` convention as `RUN_SEED`                          |
| `SESSION_SECRET`            | Yes         | JWT signing secret — must NOT be the default                                                 |
| `NODE_ENV`                  | Yes         | `production`                                                                                 |
| `PORT`                      | Auto        | Railway sets this automatically                                                              |
| `SERVE_FRONTEND`            | Yes         | `true` to serve frontend from Express                                                        |
| `FRONTEND_URL`              | Recommended | Public URL for password reset email links                                                    |
| `FRONTEND_ORIGINS`          | Optional    | Comma-separated CORS origins (Railway domain is hardcoded)                                   |
| `SMTP_HOST`                 | Optional    | SMTP server for email delivery                                                               |
| `SMTP_PORT`                 | Optional    | SMTP port                                                                                    |
| `SMTP_USER`                 | Optional    | SMTP username                                                                                |
| `SMTP_PASS`                 | Optional    | SMTP password                                                                                |
| `MAIL_FROM`                 | Optional    | From address for emails                                                                      |

## First-time Railway + Supabase setup

Prerequisites: accounts on [Railway](https://railway.app) and [Supabase](https://supabase.com); GitHub repo connected.

### Database (Supabase)

1. Create a new project on Supabase.
2. Go to **Project Settings** → **Database**.
3. Copy **two** connection strings from **Project Settings → Database → Connection String**:
   - **Transaction Mode (port 6543)** → `DATABASE_URL` (runtime queries via pooler).
   - **Session Mode (port 5432)** → `DIRECT_URL` (Prisma migrations need a direct/session connection).
   - Ensure both strings end with `?sslmode=require`.
   - If the direct host `db.<ref>.supabase.co:5432` is blocked by your host, use the **pooler Session** string (`<ref>.pooler.supabase.com:5432`) as `DIRECT_URL` instead.

### Backend (Railway)

1. Create a Railway project; deploy from the GitHub repo.
2. Prefer the root `Dockerfile.backend` path used in production (see **How Production Deploys** above). If configuring a Node service manually:
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
3. Set the required environment variables from the table above. Locally, `DIRECT_URL` may equal `DATABASE_URL` (both point at local Postgres).

### Frontend (Railway)

1. Create a second Railway service from the same GitHub repo, or serve the SPA from Express with `SERVE_FRONTEND=true`.
2. For a separate frontend service, build from `Dockerfile.frontend` (Vite build served by nginx).
3. Set build/service variables:
   - `VITE_API_BASE`: `/api` (default) — same-origin API calls. Nginx (`docs/nginx.conf`) proxies `/api/` → `${BACKEND_URL}/api/`.
   - `BACKEND_URL`: deployed Railway backend URL (no trailing slash).
   - `VITE_*` vars are inlined at build time — they must be present when the image builds.

### Database initialization (production)

Prefer letting `predeploy.sh` run `prisma migrate deploy` on deploy. To bootstrap schema/seed once against Supabase from a laptop (use production credentials only when intentional):

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
# Optional one-shot seed — prefer RUN_SEED=true on Railway instead (see below)
npx prisma db seed
```

`npm run db:init` is **not** the production runbook primary path while migration baseline work (`#646`) is open; use migrate deploy + gated seed as above.

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
   `predeploy: skipping seed (RUN_SEED not set — see DEPLOYMENT.md, issue #651)`

Warnings:

- The seed find-or-creates demo accounts **and refreshes their password hashes** on every run (`prisma/seed.cjs` — "Always refresh password hash on seed").
- When `NODE_ENV !== "production"`, seed cleanup can wipe/reset data.
- Do not set `RUN_SEED=true` against a populated production database unless you intend both.

Local dev and CI are unchanged: neither path calls `predeploy.sh`; contributors should continue running seed directly (`npm run seed`) when needed. If we add a future DB-backed CI job, it should call seed directly and must not route through `predeploy.sh`.

## Local Development

For zero-to-running setup, use [`SETUP.md`](SETUP.md). Tracked Docker Postgres defaults and env examples live there and in `.env.example`.

## Schema Management

- **Source of truth:** `prisma/schema.prisma` (repo root)
- **Secondary copy:** `backend/prisma/schema.prisma` (kept in sync for Dockerfile compatibility)
- **Migrations:** `prisma/migrations/` — applied via `prisma migrate deploy` on production startup
- **Seed:** `prisma/seed.cjs` — deploy seeding is gated by `RUN_SEED=true`; default is skip

## Troubleshooting

- **Prisma / connection limits**: Confirm `DATABASE_URL` and `DIRECT_URL`. For connection-limit errors, use the Supabase Transaction pooler (port 6543) for the app and Session pooler (port 5432) for migrations.
- **CORS**: With same-origin `/api` (nginx proxy) you should not hit CORS. If the frontend is on a different origin, configure `FRONTEND_ORIGINS` / CORS for that domain.

## Pipeline reference

See [`docs/ops/deployment-pipeline.md`](docs/ops/deployment-pipeline.md) for CI workflow inventory (separate from Railway deploy).

## Legacy Deployment References

The repo still contains files from earlier deployment phases (AWS Lambda, Azure Static Web Apps, Aurora PostgreSQL). These are **no longer the production path**:

- `.github/workflows/deploy-stem1.yml` — marked `[LEGACY]`; removal is a separate follow-up
- `.github/workflows/prod-smoke.yml` — Azure SWA smoke test (legacy)
- `docs/azure/` — may retain infrastructure-as-code (e.g. `.bicep`); point-in-time Azure markdown runbooks were removed
- `docker-compose.yml` — references Azure Functions `func start` (legacy)

These leftovers should not drive production decisions. Canonical deploy path is Railway + Supabase above.
