> **Canonical for:** environment matrix (local, CI, staging, production). Last verified against code: 2026-09-03.

# Environment matrix

What each environment is, what it may touch, and how the repository controls tell them apart. Variable semantics and the deploy-environment contract are defined in [`DEPLOYMENT.md`](../../../DEPLOYMENT.md); analytics labels in [`docs/analytics.md`](../../analytics.md).

## Classification (shared/deploy-env)

| Environment                       | `/health.env` | Decided by (`envSource`)                          | `declaredEnv` must be | `noindex` | Banner    | Analytics                                                                                                 |
| --------------------------------- | ------------- | ------------------------------------------------- | --------------------- | --------- | --------- | --------------------------------------------------------------------------------------------------------- |
| Local dev                         | `development` | nothing set → `default`                           | (unset)               | yes       | no        | disabled unless a **non-production** key **and** `POSTHOG_KEY_ENV=development`                            |
| Unit tests / CI jobs              | `test`        | `NODE_ENV=test` → `node_env`                      | (unset)               | yes       | no        | disabled (no key in CI)                                                                                   |
| Staging (Railway `staging`)       | `staging`     | `RAILWAY_ENVIRONMENT_NAME=staging` → `railway`    | `staging`             | yes       | yes       | disabled until a staging PostHog project exists; then `POSTHOG_KEY_ENV=staging`                           |
| Preview (future PR envs)          | `preview`     | any other Railway name → `railway`                | `preview`             | yes       | yes       | disabled or `POSTHOG_KEY_ENV=preview`                                                                     |
| Production (Railway `production`) | `production`  | `RAILWAY_ENVIRONMENT_NAME=production` → `railway` | `production`          | no        | no        | production key + `POSTHOG_KEY_ENV=production` (`enabled`); unlabeled = `enabled-unlabeled` until labelled |
| **Configuration mismatch**        | `preview`     | `railway` (Railway still decides)                 | disagrees             | yes       | yes (red) | `refused` (`environment-mismatch`)                                                                        |

Railway is authoritative; the declaration must agree; a disagreement (or an unrecognised declaration) is a configuration error that can never behave as production. Outside Railway the declaration decides; `NODE_ENV` is only the fallback.

## Data and credentials

| Environment | Database                                                                                                   | Fixtures                                                                                                                       | Secrets                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Local       | Docker Postgres `localhost:5435` (`SETUP.md`)                                                              | `npm run seed` / `npm run db:init`; wipe allowed on loopback                                                                   | `.env`, `backend/.env` (gitignored)                                                                                                 |
| CI          | `postgres:15` service, database `brightboost_test`                                                         | `npm run e2e:seed` (refuses non-test DB names, #742)                                                                           | Workflow env only; no repository secrets needed for required checks                                                                 |
| Staging     | **Separate Supabase project** `brightboost-staging` (`sduhifvagbznswdkjldw`, us-west-1) — never production | `scripts/staging-fixtures.mjs` (refuses the production ref, loopback, unknown hosts; never wipes; rotates synthetic passwords) | Railway `staging` environment variables, its own `SESSION_SECRET`; GitHub `staging` environment secret `RAILWAY_TOKEN`              |
| Production  | Supabase production (`rjpztbtkdwwdmnbbrqmm`, us-west-2), daily physical backups                            | Never (`RUN_SEED`, `SEED_ALLOW_PRODUCTION`, `SEED_RESET` unset; the promotion job refuses if present)                          | Railway `production` variables (sealing = dashboard step); GitHub `production` environment secret `RAILWAY_TOKEN` gated by reviewer |

Rule: staging never reads or copies production data. Any fixture lands through migrations plus the synthetic fixture command.

## Hosts (observed 2026-09-03)

| Host                                     | Serves                                | Front                                                                                                | Indexable                                                             |
| ---------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `brightboost.org`                        | Railway `glorious-friendship` / `FE`  | Cloudflare proxy (`Server: cloudflare`, `cf-ray`)                                                    | yes (no robots.txt; SPA fallback answers `/robots.txt` with HTML 200) |
| `www.brightboost.org`                    | —                                     | **does not resolve**                                                                                 | —                                                                     |
| `fe-production-3552.up.railway.app`      | Railway `FE` origin (nginx image)     | Railway edge                                                                                         | yes (duplicate of the apex — BRAND_R1 SEO item)                       |
| `brightboost-production.up.railway.app`  | Railway `BE` origin (Express, helmet) | Railway edge                                                                                         | API only                                                              |
| `fe-staging-staging-126a.up.railway.app` | Railway `FE-staging` (staging env)    | Railway edge only — Cloudflare Access is an operator step (no Cloudflare credential in this session) | never: `X-Robots-Tag: noindex, nofollow` at origin                    |
| `be-staging-staging-99b2.up.railway.app` | Railway `BE-staging` (staging env)    | Railway edge                                                                                         | never                                                                 |

## Variables per service (target state)

| Service                          | Production                                                                                                                                                                                                                 | Staging                                                                                                                                                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend (`Dockerfile.backend`)   | `NODE_ENV=production`, **`APP_ENV=production`**, **`POSTHOG_KEY_ENV=production`** (both set 2026-09-03T17:14Z, effective on the next deploy), existing table in `DEPLOYMENT.md`                                            | `NODE_ENV=production`, `APP_ENV=staging`, staging `DATABASE_URL`/`DIRECT_URL`, its own `SESSION_SECRET`, `FRONTEND_ORIGINS`/`FRONTEND_URL` = staging FE URL; **no** `POSTHOG_KEY` until a staging PostHog project exists (then `POSTHOG_KEY_ENV=staging`) |
| Frontend (`Dockerfile.frontend`) | `VITE_API_BASE`, `BACKEND_URL`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, **`VITE_APP_ENV=production`**, **`VITE_POSTHOG_KEY_ENV=production`**, `ROBOTS_TAG` unset; `VITE_RAILWAY_ENVIRONMENT_NAME` forwarded automatically | `VITE_API_BASE=/api`, `BACKEND_URL=<staging BE URL>`, `VITE_APP_ENV=staging`, `ROBOTS_TAG="noindex, nofollow"`; no PostHog key                                                                                                                            |

`VITE_*` values are build-time: changing one requires a clean rebuild of the frontend image. `RAILWAY_ENVIRONMENT_NAME` and `RAILWAY_GIT_COMMIT_SHA` are injected by Railway (runtime and build args) and flow into `/health` and the page metas without operator action.

## Wire-level expectations (what the strict smoke checks)

| Check                                                                | Production                                       | Staging                                     |
| -------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `GET /` → `bb-app-env` (declaration)                                 | `production`                                     | `staging`                                   |
| `GET /` → `bb-railway-env` / `bb-env-effective` / `bb-env-source`    | `production` / `production` / `railway`          | `staging` / `staging` / `railway`           |
| `GET /` → `bb-env-mismatch`                                          | `none`                                           | `none`                                      |
| `GET /` → `bb-git-sha`                                               | expected SHA                                     | expected SHA                                |
| `GET /` → `X-Robots-Tag`                                             | absent                                           | contains `noindex`                          |
| `GET /api/health` → `env` / `envSource` / `declaredEnv` / `mismatch` | `production` / `railway` / `production` / `none` | `staging` / `railway` / `staging` / `none`  |
| `GET /api/health` → `sha`                                            | = page SHA = expected                            | = page SHA = expected                       |
| `GET /api/health` → `analytics`                                      | `enabled` (labelled)                             | `disabled` (until a staging project exists) |
| `GET /api/health` → `X-Robots-Tag`                                   | absent                                           | contains `noindex`                          |

`node scripts/verify-deploy-target.mjs --url <host> --expect-env <env> --expect-sha <sha> --require-declared-env --expect-analytics <enabled|disabled>` proves every row; finding codes `DT-000` … `DT-013`.
