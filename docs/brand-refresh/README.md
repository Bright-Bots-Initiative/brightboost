> **Canonical for:** brand refresh program index. Last verified against code: 2026-09-03.

# Brand refresh — program index

Bright Boost's brand refresh is delivered in named releases. This directory is the working record; the decision itself lives in [`docs/architecture/brand-refresh-decision.md`](../architecture/brand-refresh-decision.md).

| Release             | Status (2026-09-03)                                                                                                                                                                                                    | Scope                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **BRAND_R0**        | Repository work delivered and reconciled (PR #858); canonical Railway project controlled; staging provisioned; **`HOLD_EXTERNAL_AUTH`** on three accounts and one blocked credential step; merge awaits a second human | Operational safety: staging, baselines, approval, isolation, design authority, experiment governance, rollback, Bright Bots ownership |
| **BRAND_R1_DESIGN** | Not started — hard entry criteria in [`brand-r1/README.md`](brand-r1/README.md)                                                                                                                                        | Visual rebrand design                                                                                                                 |
| **BRAND_R1_BUILD**  | Not started                                                                                                                                                                                                            | Implementation of the approved design                                                                                                 |

"Release 1" alone means The Great Work (#704, #720–#725). Do not shorten BRAND_R1 to "Release 1".

## Release 0 documents

| Document                                                                                             | Purpose                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`brand-architecture.md`](brand-architecture.md)                                                     | Bright Bots Initiative / Bright Boost / Pathways; domains; what is proven about each host                        |
| [`release-0/system-inventory.md`](release-0/system-inventory.md)                                     | Recon record: deploy paths, triggers, required checks, analytics, flags, routes, tokens, docs; closure readbacks |
| [`release-0/baseline.md`](release-0/baseline.md)                                                     | Baseline ledger: every metric with timestamp, SHA, source, definition, value, confidence                         |
| [`release-0/environment-matrix.md`](release-0/environment-matrix.md)                                 | Local / CI / staging / production: classification contract, variables, data, hosts, wire expectations            |
| [`release-0/analytics-baseline.md`](release-0/analytics-baseline.md)                                 | PostHog and `/admin/metrics` readbacks and reproduction queries                                                  |
| [`release-0/seo-content-baseline.md`](release-0/seo-content-baseline.md)                             | Public routes, metadata, initial HTML vs hydrated, robots/sitemap/canonical/schema                               |
| [`release-0/accessibility-performance-baseline.md`](release-0/accessibility-performance-baseline.md) | Accessibility, reduced motion, keyboard, reflow, performance, bundle size procedures                             |
| [`release-0/evidence-register.md`](release-0/evidence-register.md)                                   | Every control-plane readback and change (E-01…E-43) and the public-claim register                                |
| [`release-0/staging-runbook.md`](release-0/staging-runbook.md)                                       | Operator steps with DONE/OPEN state: GitHub, Railway, Supabase, PostHog, Cloudflare, Bright Bots, sandboxes      |
| [`release-0/promotion-runbook.md`](release-0/promotion-runbook.md)                                   | Approval-bound exact-SHA promotion (Deploy promote workflow)                                                     |
| [`release-0/rollback-runbook.md`](release-0/rollback-runbook.md)                                     | Rollback through the same workflow; staging rehearsal; backup/restore proof                                      |
| [`release-0/operator-checklist.md`](release-0/operator-checklist.md)                                 | 27 exit criteria with owner, UTC, evidence, verification, rollback; the terminal state                           |
| [`brand-r1/README.md`](brand-r1/README.md)                                                           | Hard entry criteria and binding dependencies for BRAND_R1_DESIGN                                                 |

## Repository controls shipped by BRAND_R0

- `shared/deploy-env/index.ts` — the deploy-environment contract (Railway authoritative; declaration must agree; mismatch never production) and the exact-label analytics guard, shared by Node and the browser
- `backend/src/utils/deployEnv.ts`, `src/lib/deployEnv.ts` — thin adapters; `backend/src/server.ts` — `X-Robots-Tag` on non-production, `/health` + `/api/health` posture (`env`, `envSource`, `declaredEnv`, `railwayEnv`, `mismatch`, `configError`, `sha`, `noindex`, `analytics`), one startup error on mismatch
- `vite.config.ts` `bb-build-metadata` plugin + `index.html` metas (`bb-app-env`, `bb-railway-env`, `bb-env-effective`, `bb-env-source`, `bb-env-mismatch`, `bb-git-sha`); `Dockerfile.frontend` forwards `RAILWAY_ENVIRONMENT_NAME`; `docs/nginx.conf` emits `ROBOTS_TAG`
- `src/components/EnvironmentBanner.tsx` — staging banner, red on configuration mismatch
- `src/lib/featureFlags.ts` — typed flags, registry, explicit exposure ([`docs/experiments.md`](../experiments.md))
- `scripts/verify-deploy-target.mjs` — compat and **strict** (`--require-declared-env`) smoke, codes `DT-000`…`DT-013`
- `scripts/railway-promote.mjs` + `.github/workflows/deploy-promote.yml` — approval-bound exact-SHA promotion; `.github/workflows/deploy-verify.yml` — verifier only
- `scripts/staging-fixtures.mjs` — bounded synthetic fixtures for the staging database

Operational rules for these live in [`DEPLOYMENT.md`](../../DEPLOYMENT.md) and [`docs/analytics.md`](../analytics.md); this directory does not duplicate them.
