> **Canonical for:** brand refresh decision (BRAND_R0 → BRAND_R1). Last verified against code: 2026-09-03.

# Brand refresh decision — BRAND_R0 authorizes BRAND_R1

> **Canonical decision.** Drafted 2026-09-03 by the BRAND_R0 release-engineering pass against `main` at `91e4071f0017fa508bb9cf385abc066ede6b07e1`. It becomes the standing decision when the BRAND_R0 pull request merges with owner approval (Nathaniel Walker). The external control-plane work it depends on is tracked in [`docs/brand-refresh/release-0/operator-checklist.md`](../brand-refresh/release-0/operator-checklist.md) and is **not** complete by virtue of this document existing.

## Naming — never drift

| Name                           | Meaning                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BRAND_R0**                   | This release. Operational safety foundation: staging, measurement baselines, release approval, environment isolation, design-document authority, experiment governance, rollback readiness, Bright Bots source ownership. |
| **BRAND_R1_DESIGN**            | The visual rebrand design phase. Not started. Entry criteria in [`docs/brand-refresh/brand-r1/README.md`](../brand-refresh/brand-r1/README.md).                                                                           |
| **BRAND_R1_BUILD**             | Implementation of the approved BRAND_R1_DESIGN. Not started.                                                                                                                                                              |
| **The Great Work — Release 1** | #704 and #720–#725. A Set 3 game release, unrelated to the rebrand. "Release 1" on its own always means The Great Work. Never call the rebrand "Release 1".                                                               |

## Decisions

1. **BRAND_R1 is authorized** to enter BRAND_R1_DESIGN once every BRAND_R0 exit criterion in the operator checklist is proven. Nothing in BRAND_R1 may reach production before that, and no visual rebrand change ships in BRAND_R0.
2. **[`docs/design-principles.md`](../design-principles.md) remains the canonical product-design source**, including the Safe Exploration Contract (principle 9, canonized by #837 / #847). BRAND_R1 changes visual identity; it does not change principles, and every BRAND_R1 surface is reviewed against them.
3. **Organizational architecture.** _Bright Bots Initiative_ is the nonprofit parent. _Bright Boost_ is the K–8 product — this repository, served at `brightboost.org`. _Bright Boost Pathways_ is the older-youth (ages 14–17) pathway, a program of Bright Bots Initiative delivered inside this product under `/pathways`. Copy, schema markup, and footers describe the three this way.
4. **[`docs/brightboost-style-reference.md`](../brightboost-style-reference.md) is a current-state baseline** — a 2026-04-27 snapshot of tokens, type, components, motion, and routes. Its scope sentence ("without redesigning the brand/UI") described the homepage work of that day and is superseded by this decision for BRAND_R1. Its route contract and legacy redirects (§8–§9) stay binding.
5. **[`docs/brightboost-homepage-v2-spec.md`](../brightboost-homepage-v2-spec.md) is a historical implementation spec** (2026-04-27, #564). "This is not a rebrand" described that ticket's scope; it does not constrain BRAND_R1. Its no-fake-counts, no-pricing-language, and privacy rules stay in force until BRAND_R1_DESIGN replaces them explicitly. Currency review of the file is #758.
6. **Preserved authorities**, unchanged by the brand decision and binding on BRAND_R1: route contracts and legacy redirects (style reference §8–§9); accessibility ([`docs/agents/learned/accessibility.md`](../agents/learned/accessibility.md), #843); privacy ([`docs/analytics.md`](../analytics.md) rules, the privacy policy page); localization ([`docs/agents/rules/20-i18n.md`](../agents/rules/20-i18n.md); the marketing surface is #632); progression and set gating (#856, #842); teacher-assignment authority (principle 9).
7. **No gameplay, scoring, progression, auth, or database-schema work is authorized** by this decision. Those changes stay with their owning issues (#693, #838–#843, #855, #856 and successors).
8. **Bright Bots architecture is deferred.** The parent organization's own web presence has no source in this organization's repositories and its host is unproven ([`docs/brand-refresh/brand-architecture.md`](../brand-refresh/brand-architecture.md)). No repository is created and no CMS or monorepo choice is made until the current source, host, and a verified backup exist.
9. **Experimentation.** PostHog owns assignment and analysis for anonymous/public experiments. The database `Experiment*` tables are reserved for logged-in, server-authoritative experiments. The same experiment is never assigned on both. Canonical: [`docs/experiments.md`](../experiments.md).
10. **Promotion model.** BRAND_R1 changes reach production only through the staging environment, the promotion runbook, and an exact-SHA verification (`scripts/verify-deploy-target.mjs`). Railway's unchecked auto-deploy from `main` is replaced by the checked path described in [`docs/brand-refresh/release-0/promotion-runbook.md`](../brand-refresh/release-0/promotion-runbook.md) — an operator action, not a repository change.

## What BRAND_R0 changes in the repository

| Change                                                                                                    | Where                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Typed deploy-environment classifier (`APP_ENV` → `RAILWAY_ENVIRONMENT_NAME` → `NODE_ENV`), browser mirror | `backend/src/utils/deployEnv.ts`, `src/lib/deployEnv.ts`                                 |
| `X-Robots-Tag: noindex, nofollow` on every non-production response (Express) and nginx via `ROBOTS_TAG`   | `backend/src/server.ts`, `docs/nginx.conf`, `Dockerfile.frontend`                        |
| `/health` and `/api/health` report `env`, `sha`, `noindex`, `analytics`                                   | `backend/src/server.ts`                                                                  |
| Build metadata in the page (`bb-app-env`, `bb-git-sha`)                                                   | `index.html`, `Dockerfile.frontend`                                                      |
| Staging-only banner                                                                                       | `src/components/EnvironmentBanner.tsx`, locale `envBanner.*`                             |
| Analytics environment guard (labelled keys; refuses production key outside production)                    | `backend/src/utils/analyticsGuard.ts`, `src/lib/analyticsGuard.ts`, both analytics shims |
| Typed feature-flag adapter with owner/expiry registry and explicit exposure                               | `src/lib/featureFlags.ts`                                                                |
| Exact-SHA deploy-target smoke with two-phase proof                                                        | `scripts/verify-deploy-target.mjs`, `.github/workflows/deploy-verify.yml`                |
| Documentation area, baselines, runbooks                                                                   | `docs/brand-refresh/`                                                                    |

## Related

- [`docs/brand-refresh/README.md`](../brand-refresh/README.md) — program index
- [`docs/brand-refresh/release-0/system-inventory.md`](../brand-refresh/release-0/system-inventory.md) — the recon record this decision rests on
- [`docs/architecture/grade-banding.md`](grade-banding.md) — the decision format this follows
- #641 (experiments foundation), #764 (container build proof), #758 (design-doc currency)
