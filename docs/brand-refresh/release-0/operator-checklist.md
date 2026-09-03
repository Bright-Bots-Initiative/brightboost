> **Canonical for:** BRAND_R0 operator checklist and terminal state. Last verified against code: 2026-09-03.

# BRAND_R0 operator checklist

Every row is an exit criterion. A row is terminal only with evidence (a register entry with UTC time and, where relevant, SHA). The terminal state of BRAND_R0 is the **worst** row: any `OPEN` → `HOLD_EXTERNAL_CONFIGURATION`; a row marked `BLOCKING` → `HOLD_BLOCKING_RISK`; the Bright Bots row → `HOLD_SOURCE_NOT_FOUND` while open.

**Terminal state as of 2026-09-03: `HOLD_EXTERNAL_CONFIGURATION`** (repository work verified; every control-plane row open; Bright Bots source not found).

| #   | Criterion                                                                                                                                                          | Runbook                | Evidence required                                                  | State 2026-09-03               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------ | ------------------------------ |
| 1   | BRAND_R0 pull request merged with review                                                                                                                           | —                      | merge SHA                                                          | OPEN (PR open)                 |
| 2   | Exactly one Railway project deploys from `main`; the failing `hospitable-art` records explained                                                                    | staging B.0            | register row: project, services, domain                            | OPEN                           |
| 3   | GitHub `production` environment: required reviewer, prevent self-review, `main` only                                                                               | staging A.2–A.4        | `gh api …/environments/production` readback                        | OPEN                           |
| 4   | GitHub `staging` environment exists; environment-scoped secrets                                                                                                    | staging A.1, A.5       | readback                                                           | OPEN                           |
| 5   | Railway `staging` environment (empty, not duplicated) with both services and its own domain                                                                        | staging B.1–B.3        | `railway environment`; staging URL                                 | OPEN                           |
| 6   | Staging variables isolated; `/api/health` shows `env: staging`, `noindex: true`                                                                                    | staging B.4            | curl output                                                        | OPEN                           |
| 7   | Production declared (`APP_ENV=production`, `VITE_APP_ENV=production`), variables sealed                                                                            | staging B.5            | curl output; sealed flag                                           | OPEN                           |
| 8   | `RAILWAY_GIT_COMMIT_SHA` reaches both builds (`bb-git-sha` and `/api/health.sha` non-empty)                                                                        | staging B.6            | curl outputs                                                       | OPEN                           |
| 9   | Wait for CI on; production auto-deploy on push disabled; staging auto-deploys                                                                                      | staging B.7–B.8        | Railway settings screenshots; a pushed commit deploys staging only | OPEN                           |
| 10  | Rollback rehearsed on staging                                                                                                                                      | staging B.10; rollback | register row with times                                            | OPEN                           |
| 11  | Supabase staging project with isolated credentials; migrations applied; synthetic fixtures only                                                                    | staging C.1–C.5        | predeploy log; seed output                                         | OPEN                           |
| 12  | Backup/restore proven on staging; production backup state recorded; DB password rotated                                                                            | staging C.6–C.8        | register rows                                                      | OPEN                           |
| 13  | PostHog staging project; labelled keys; guard proven live (`refused` observed then cleared)                                                                        | staging D.1–D.3        | health outputs both states                                         | OPEN                           |
| 14  | Replay masking verified; test-user cohorts set                                                                                                                     | staging D.4–D.5        | screenshot; cohort ids                                             | OPEN                           |
| 15  | Cloudflare: `staging` DNS proxied; Access deny-by-default; CI service token; noindex verified through the edge; WAF/rate-limit/Turnstile inventory; `www` decision | staging E.1–E.6        | curl outputs; inventory table                                      | OPEN                           |
| 16  | Bright Bots: host, source, backup, forms/donations/analytics/redirects inventory, architecture decision                                                            | staging F.1–F.5        | register rows                                                      | OPEN — `HOLD_SOURCE_NOT_FOUND` |
| 17  | Donation/email sandboxes on staging; production deliverability verified                                                                                            | staging G.1–G.4        | sandbox inbox evidence; DNS records                                | OPEN                           |
| 18  | Staging E2E (`test:e2e:staging`) and exact-SHA smoke pass on staging                                                                                               | staging (end)          | exit codes + finding codes                                         | OPEN                           |
| 19  | Production exact-SHA smoke passes (no noindex, SHA matches)                                                                                                        | promotion 6–7          | exit 0                                                             | OPEN                           |
| 20  | `/admin/metrics` baseline row captured on the production SHA                                                                                                       | analytics-baseline B   | JSON pasted with UTC time                                          | OPEN                           |
| 21  | Lab a11y / reduced-motion / keyboard / reflow / Lighthouse rows captured (Chrome attached once)                                                                    | a11y-perf baseline     | register rows                                                      | OPEN                           |
| 22  | #641 and #764 cross-linked; issues for the Railway finding and the BRAND_R0 operator work exist                                                                    | —                      | issue links                                                        | see PR                         |

## Blocking-risk watch

Rows that would flip the state to `HOLD_BLOCKING_RISK` if their readback comes back wrong:

- Row 2: if the project serving `brightboost.org` turns out to be the **failing** one, production is currently not receiving deploys and BRAND_R1 must not start until that is understood.
- Row 12: if production has no restorable backup, no destructive migration may ship and BRAND_R1 must not start.
- Row 15: if Cloudflare Access cannot be applied to staging (plan limits), staging must not carry any real-looking data and must stay noindexed; the exact-SHA smoke still runs.

## Repository-side criteria (done in BRAND_R0, verified in the PR)

| Criterion                                                                                    | Proof                                                                                                 |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Typed environment classifier, both sides, with red/green tests                               | `backend/src/utils/deployEnv.test.ts`, `src/lib/__tests__/deployEnv.test.ts`                          |
| Noindex header on non-production only, proven on the wire                                    | `backend/src/health_env.test.ts`                                                                      |
| `/health` posture fields                                                                     | same                                                                                                  |
| Analytics guard (six rows), both sides                                                       | `backend/src/utils/analyticsGuard.test.ts`, `src/lib/__tests__/analyticsGuard.test.ts`                |
| Staging banner, i18n keys in four locales, story                                             | `src/components/__tests__/EnvironmentBanner.test.tsx`, `src/components/EnvironmentBanner.stories.tsx` |
| Feature-flag adapter: safe default/off/loading, exposure on render, expiry registry          | `src/lib/__tests__/featureFlags.test.ts`                                                              |
| Exact-SHA smoke: healthy production + staging pass, six sabotage codes fail, CLI exits 0/1/2 | `scripts/__tests__/verify-deploy-target.test.ts`                                                      |
| Workflow with GitHub environments and concurrency                                            | `.github/workflows/deploy-verify.yml` (tier declared in `docs/ops/ci.md`)                             |
| Documentation area, ADR, experiments governance                                              | `docs/brand-refresh/`, `docs/architecture/brand-refresh-decision.md`, `docs/experiments.md`           |
