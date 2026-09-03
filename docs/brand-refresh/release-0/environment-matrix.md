> **Canonical for:** environment matrix (local, CI, staging, production). Last verified against code: 2026-09-03.

# Environment matrix

What each environment is, what it may touch, and how the repository controls tell them apart. Variable semantics are defined in [`DEPLOYMENT.md`](../../../DEPLOYMENT.md) and [`docs/analytics.md`](../../analytics.md).

## Classification

| Environment              | Backend `env` (`/health`) | Decided by                                                        | `noindex` | Banner | Analytics                                                              |
| ------------------------ | ------------------------- | ----------------------------------------------------------------- | --------- | ------ | ---------------------------------------------------------------------- |
| Local dev                | `development`             | nothing set (`NODE_ENV` unset or `development`)                   | yes       | no     | disabled unless a key **and** `POSTHOG_KEY_ENV=development` are set    |
| Unit tests / CI jobs     | `test`                    | `NODE_ENV=test`                                                   | yes       | no     | disabled (no key in CI)                                                |
| Staging (target state)   | `staging`                 | `APP_ENV=staging` (and Railway environment named `staging`)       | yes       | yes    | staging PostHog project only, `POSTHOG_KEY_ENV=staging`                |
| Preview (future PR envs) | `preview`                 | `APP_ENV=preview` or an unfamiliar Railway environment name       | yes       | yes    | disabled or a non-production key                                       |
| Production               | `production`              | `APP_ENV=production` (today: `NODE_ENV=production`, nothing else) | no        | no     | production project key; label `POSTHOG_KEY_ENV=production` recommended |

Precedence in the backend: `APP_ENV` → `RAILWAY_ENVIRONMENT_NAME` → `NODE_ENV`. An unrecognised `APP_ENV` classifies as `preview` (noindex), never production. Frontend: `VITE_APP_ENV` only; an absent value keeps a production build production (no regression) and is reported as _undeclared_ by the smoke.

## Data and credentials

| Environment | Database                                                              | Seed                                                               | Secrets                                                                  |
| ----------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Local       | Docker Postgres `localhost:5435` (`SETUP.md`)                         | `npm run seed` / `npm run db:init`; wipe allowed on loopback       | `.env`, `backend/.env` (gitignored)                                      |
| CI          | `postgres:15` service, database `brightboost_test`                    | `npm run e2e:seed` (refuses non-test DB names, #742)               | Workflow env only; no repository secrets needed for required checks      |
| Staging     | **Separate** Supabase project or persistent branch — never production | Synthetic fixtures only (`e2e:seed` shape); `RUN_SEED` stays unset | Railway staging environment variables, sealed separately from production |
| Production  | Supabase production (`DATABASE_URL` + `DIRECT_URL`)                   | Never (`RUN_SEED` and `SEED_ALLOW_PRODUCTION` unset)               | Railway production variables, sealed                                     |

Rule: staging never reads or copies production data. Any fixture lands through migrations plus `e2e:seed`-style synthetic seeding.

## Domains and indexability (observed 2026-09-03)

| Host                                    | Serves                           | Front                                                        | Indexable                                                             |
| --------------------------------------- | -------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `brightboost.org`                       | Frontend (nginx image) → Railway | Cloudflare proxy (`Server: cloudflare`, `cf-ray`)            | yes (no robots.txt; SPA fallback answers `/robots.txt` with HTML 200) |
| `www.brightboost.org`                   | —                                | **does not resolve**                                         | —                                                                     |
| `fe-production-3552.up.railway.app`     | Frontend (nginx image)           | Railway edge                                                 | yes (duplicate of the apex — a canonical tag is a BRAND_R1 SEO item)  |
| `brightboost-production.up.railway.app` | Backend API (Express, helmet)    | Railway edge                                                 | API only                                                              |
| Staging host                            | **does not exist yet**           | Target: Cloudflare Access (deny by default) + `X-Robots-Tag` | never                                                                 |

## Variables per service (target state)

| Service                          | Production                                                                                                                                                     | Staging                                                                                                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend (`Dockerfile.backend`)   | `NODE_ENV=production`, `APP_ENV=production`, `POSTHOG_KEY_ENV=production`, existing table in `DEPLOYMENT.md`                                                   | `NODE_ENV=production`, `APP_ENV=staging`, staging `DATABASE_URL`/`DIRECT_URL`, staging `SESSION_SECRET`, staging `POSTHOG_KEY` + `POSTHOG_KEY_ENV=staging` (or no key), `FRONTEND_ORIGINS=<staging fe url>` |
| Frontend (`Dockerfile.frontend`) | `VITE_API_BASE=/api`, `BACKEND_URL`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_POSTHOG_KEY_ENV=production`, `VITE_APP_ENV=production`, `ROBOTS_TAG` unset | `VITE_API_BASE=/api`, `BACKEND_URL=<staging backend>`, `VITE_APP_ENV=staging`, `ROBOTS_TAG="noindex, nofollow"`, staging `VITE_POSTHOG_KEY` + `VITE_POSTHOG_KEY_ENV=staging` (or no key)                    |

`VITE_*` values are build-time: changing one requires a clean rebuild of the frontend image (`docs/analytics.md`). `RAILWAY_GIT_COMMIT_SHA` is injected by Railway and flows into `/health.sha` and `<meta name="bb-git-sha">` without operator action.

## Wire-level expectations (what the smoke checks)

| Check                                | Production              | Staging                                   |
| ------------------------------------ | ----------------------- | ----------------------------------------- |
| `GET /` → `<meta name="bb-app-env">` | `production` or absent  | `staging`                                 |
| `GET /` → `<meta name="bb-git-sha">` | expected SHA            | expected SHA                              |
| `GET /` → `X-Robots-Tag`             | absent                  | contains `noindex`                        |
| `GET /api/health` → `env` / `sha`    | `production` / SHA      | `staging` / SHA                           |
| `GET /api/health` → `analytics`      | `enabled` or `disabled` | `enabled` or `disabled` — never `refused` |
| `GET /api/health` → `X-Robots-Tag`   | absent                  | contains `noindex`                        |

`node scripts/verify-deploy-target.mjs --url <host> --expect-env <env> --expect-sha <sha>` proves all rows; finding codes `DT-000` … `DT-008`.
