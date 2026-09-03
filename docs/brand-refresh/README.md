> **Canonical for:** brand refresh program index. Last verified against code: 2026-09-03.

# Brand refresh — program index

Bright Boost's brand refresh is delivered in named releases. This directory is the working record; the decision itself lives in [`docs/architecture/brand-refresh-decision.md`](../architecture/brand-refresh-decision.md).

| Release             | Status (2026-09-03)                                            | Scope                                                                                                                                 |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **BRAND_R0**        | Repository work delivered; external control-plane actions open | Operational safety: staging, baselines, approval, isolation, design authority, experiment governance, rollback, Bright Bots ownership |
| **BRAND_R1_DESIGN** | Not started — blocked                                          | Visual rebrand design                                                                                                                 |
| **BRAND_R1_BUILD**  | Not started                                                    | Implementation of the approved design                                                                                                 |

"Release 1" alone means The Great Work (#704, #720–#725). Do not shorten BRAND_R1 to "Release 1".

## Release 0 documents

| Document                                                                                             | Purpose                                                                                       |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`brand-architecture.md`](brand-architecture.md)                                                     | Bright Bots Initiative / Bright Boost / Pathways; domains; what is proven about each host     |
| [`release-0/system-inventory.md`](release-0/system-inventory.md)                                     | Recon record: deploy paths, triggers, required checks, analytics, flags, routes, tokens, docs |
| [`release-0/baseline.md`](release-0/baseline.md)                                                     | Baseline summary: every metric with timestamp, SHA, source, definition, value, confidence     |
| [`release-0/environment-matrix.md`](release-0/environment-matrix.md)                                 | Local / CI / staging / production: variables, data, analytics project, indexability           |
| [`release-0/analytics-baseline.md`](release-0/analytics-baseline.md)                                 | PostHog and `/admin/metrics` readbacks and reproduction queries                               |
| [`release-0/seo-content-baseline.md`](release-0/seo-content-baseline.md)                             | Public routes, metadata, initial HTML vs hydrated, robots/sitemap/canonical/schema            |
| [`release-0/accessibility-performance-baseline.md`](release-0/accessibility-performance-baseline.md) | Accessibility, reduced motion, keyboard, reflow, performance, bundle size procedures          |
| [`release-0/evidence-register.md`](release-0/evidence-register.md)                                   | Control-plane readbacks and public-claim evidence, dated                                      |
| [`release-0/staging-runbook.md`](release-0/staging-runbook.md)                                       | Operator steps: GitHub, Railway, Supabase, PostHog, Cloudflare, email/donation sandboxes      |
| [`release-0/promotion-runbook.md`](release-0/promotion-runbook.md)                                   | Exact-SHA promotion to production                                                             |
| [`release-0/rollback-runbook.md`](release-0/rollback-runbook.md)                                     | Rollback and backup/restore proof                                                             |
| [`release-0/operator-checklist.md`](release-0/operator-checklist.md)                                 | Exit criteria and terminal state for BRAND_R0                                                 |
| [`brand-r1/README.md`](brand-r1/README.md)                                                           | Entry criteria and blockers for BRAND_R1_DESIGN                                               |

## Repository controls shipped by BRAND_R0

- `backend/src/utils/deployEnv.ts`, `src/lib/deployEnv.ts` — typed environment classifier
- `backend/src/server.ts` — `X-Robots-Tag` on non-production, `/health` + `/api/health` posture
- `docs/nginx.conf`, `Dockerfile.frontend` — `ROBOTS_TAG`, `VITE_APP_ENV`, `VITE_GIT_SHA`, `VITE_POSTHOG_KEY_ENV`
- `src/components/EnvironmentBanner.tsx` — staging banner
- `backend/src/utils/analyticsGuard.ts`, `src/lib/analyticsGuard.ts` — production key never leaves production
- `src/lib/featureFlags.ts` — typed flags, registry, explicit exposure ([`docs/experiments.md`](../experiments.md))
- `scripts/verify-deploy-target.mjs`, `.github/workflows/deploy-verify.yml` — exact-SHA smoke

Operational rules for these live in [`DEPLOYMENT.md`](../../DEPLOYMENT.md) and [`docs/analytics.md`](../analytics.md); this directory does not duplicate them.
