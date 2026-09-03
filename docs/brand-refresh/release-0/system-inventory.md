> **Canonical for:** BRAND_R0 system inventory (recon record). Last verified against code: 2026-09-03.

# BRAND_R0 system inventory — recon record

Read-only reconnaissance against `main` at **`91e4071f0017fa508bb9cf385abc066ede6b07e1`** (clean tree, worktree `brand-r0-foundation`), 2026-09-03 00:40–01:25 UTC. Every "none" below names the search that bounded it.

## 1. Base

| Item       | Value                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Base SHA   | `91e4071f0017fa508bb9cf385abc066ede6b07e1` — `docs(product): canonize the Safe Exploration Contract (#837) (#847)` |
| Tree       | clean (`git status --porcelain` empty)                                                                             |
| Node / npm | 20.19.6 / 10.8.2 (`engines.node` 20.x)                                                                             |

## 2. Deployment paths

| Path                                                              | Status         | Evidence                                                                                                                                   |
| ----------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Railway backend (`Dockerfile.backend` → `predeploy.sh` → Express) | **Production** | `DEPLOYMENT.md`; `brightboost-production.up.railway.app/health` answers                                                                    |
| Railway frontend (`Dockerfile.frontend` → nginx)                  | **Production** | `fe-production-3552.up.railway.app` returns `Server: railway-hikari`, no helmet headers, `/health` → SPA HTML (nginx only proxies `/api/`) |
| Cloudflare in front of `brightboost.org`                          | **Production** | `Server: cloudflare`, `CF-RAY`, Cloudflare nameservers                                                                                     |
| Supabase Postgres                                                 | **Production** | `DATABASE_URL`/`DIRECT_URL` contract in `DEPLOYMENT.md`, `predeploy.sh` DIRECT_URL guard                                                   |
| Azure Static Web Apps / Functions                                 | Legacy         | `public/staticwebapp.config.json` (rewrites to an AWS API Gateway), `docker-compose.yml`, `docs/azure/*.bicep`, `prod-smoke.yml` header    |
| AWS Lambda / Aurora                                               | Legacy         | `backend/README.md` (per `docs/agents/overview.md`), `src/mocks/handlers.ts` still reads `VITE_AWS_API_URL`                                |

## 3. Deploy triggers

| Trigger                                     | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push to `main` → Railway auto-deploy        | **Confirmed** by GitHub deployment records: every `main` commit since at least `afacd7d` (2026-09-02T04:49Z) creates Railway deployments.                                                                                                                                                                                                                                                                                                                                                                             |
| **Two Railway projects deploy from `main`** | Deployment environments `glorious-friendship / production` (project `fd8b32c5-9922-4e93-b9a5-010591716300`) **and** `hospitable-art / production` (project `db645af8-d47a-4989-bab0-65e61b3999a9`) both receive every push. On `91e4071`: glorious-friendship `success` 23:09:21Z; hospitable-art **`failure`** 22:39:29Z. A third, `devoted-determination / production` (2025-12), has no recent records. Which project serves `brightboost.org` is an operator readback (Railway auth unavailable in this session). |
| GitHub Actions deploy job                   | **None.** `ci-cd.yml` has no deploy job (legacy Azure jobs removed, comment at the foot of the file); no other workflow deploys. `.github/workflows/`: `bundle-size-check`, `ci-cd`, `cypress-staging`, `pr-review-bot`, `prod-smoke`, `teacher-dashboard-ci`.                                                                                                                                                                                                                                                        |
| Railway config in repo                      | **None.** `find . -maxdepth 2 -iname "railway*"` and `railway.json`/`railway.toml`/nixpacks: no matches.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `cypress-staging.yml`                       | Targets `cypress/e2e/pilot-smoke.cy.ts`, which no longer exists at that path (it is under `cypress/e2e/legacy/`). Label/`workflow_dispatch` only; documented as a follow-up in `docs/ops/ci.md`.                                                                                                                                                                                                                                                                                                                      |
| `prod-smoke.yml`                            | `workflow_dispatch` only; curls the Railway FE and `POST /api/login`.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## 4. Required checks (admin readback, 2026-09-03T00:50Z, `main` @ `91e4071`)

`required_status_checks.contexts` = `build-and-test`, `db-check`, `e2e-flows`; `strict: false`; `required_approving_review_count: 1`; `dismiss_stale_reviews: true`; `require_last_push_approval: false`; `enforce_admins: false`; `required_linear_history: true`; force-push/deletion off; push restriction team `Team leads`; `GET /rulesets` → `[]`. Matches `docs/ops/branch-protection.md` (2026-08-25 readback) — no drift.

GitHub environments: six exist (`copilot`, `devoted-determination / production`, `glorious-friendship / production`, `hospitable-art / production`, `Preview`, `Production`), **all with `protection_rules: []` and `deployment_branch_policy: null`**. No required reviewer, no branch restriction anywhere.

## 5. Production container build/start in CI

**Not covered.** No workflow runs `docker build`, `cd backend && npm run build:railway`, or `backend/scripts/predeploy.sh` (grep of `.github/workflows/*.yml`). `build:shared` is exercised only incidentally via `prepare` and `typecheck`. This is #764, unchanged; BRAND_R0 does not absorb it and the exact-SHA smoke (`scripts/verify-deploy-target.mjs`) is post-deploy proof, not a build proof.

## 6. Staging representation in code

| Item                                      | Finding                                                                                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:e2e:staging`                | Runs `cypress/e2e/staging/smoke.cy.ts` (UI shell + `GET /api/module/stem-1` + optional dev-header checkpoint). Requires `CYPRESS_SWA_URL` and `VITE_API_BASE`; refuses silently missing env. |
| `docs/staging.md`                         | Described **production** under a "Staging" title (rewritten by BRAND_R0 as a pointer).                                                                                                       |
| Staging host                              | **None exists.** `brightboost-staging.up.railway.app` in `docs/staging-smoke.md` is an example, not a host.                                                                                  |
| Environment classifier / banner / noindex | **None before BRAND_R0** (`grep -rn noindex\|robots\|X-Robots` across `index.html public src docs/nginx.conf backend/src` → only game binaries and the CTF content).                         |

## 7. Analytics

| Item            | Finding                                                                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Init            | `src/main.tsx` → `initAnalytics()` (before render). `posthog.init` with `autocapture: false`, `capture_pageview: true`, `capture_pageleave: true`, session replay on with `maskAllInputs: true` + `maskTextSelector: "*"`, `persistence: "localStorage"`. |
| Identity        | `identifyUser(userId, role)` on login (`src/contexts/AuthContext.tsx:114`), `resetAnalytics()` on logout. distinct id = DB user id.                                                                                                                       |
| Server mirror   | `backend/src/services/analytics.ts` (`posthog-node`), flushed on SIGTERM/SIGINT.                                                                                                                                                                          |
| Events          | 13 typed funnel/marketing kinds + 11 legacy homepage kinds in `AnalyticsEvent` (`src/lib/analytics.ts`). Seen in PostHog last 30 days: `$pageview`, `homepage_viewed`, `login`, `signup_clicked`, `game_started`, `$web_vitals` only.                     |
| Build-time vars | `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` are Docker `ARG`s in `Dockerfile.frontend` — build-time, rebuild required on change (docs/analytics.md).                                                                                                         |
| Project         | One PostHog project (454866) in org "BB". No staging project.                                                                                                                                                                                             |

## 8. Feature flags and experiments

Zero flag calls in `src/`, `backend/src/`, `shared/` (grep for `isFeatureEnabled|getFeatureFlag|onFeatureFlags|featureFlag|feature_flag`). PostHog: 0 flags, 0 experiments. Database: `Experiment`, `ExperimentAssignment`, `ExperimentEvent` models + `backend/src/routes/experiments.ts` + `src/hooks/useExperiment.ts` (no consumer) + `/admin/experiments` dashboard (teacher-gated). Decision: `docs/experiments.md`.

## 9. Environment / SEO behaviour before BRAND_R0

- No `robots.txt`, no `sitemap.xml`: both URLs return the SPA `index.html` with `200 text/html`.
- No canonical link, no `hreflang`, `<html lang="en">` static; `document.title` set per page in six pages; Open Graph/Twitter tags and JSON-LD (`Organization`, `EducationalOrganization`) injected client-side on `/` only (`src/pages/Index.tsx`).
- Initial HTML is the 20-line shell (title `BrightBoost`, description "Bilingual K-8 STEM learning platform", `og:image`); everything else hydrates.
- `NODE_ENV` is the only environment signal in the backend (11 reads); `import.meta.env.DEV` gates `/dev/echo-spike`; `VITE_APP_VERSION` renders a corner version badge when set (unset in production).

## 10. Route contracts and redirects

Public: `/`, `/teacher-login`, `/student-login`, `/class-login`, `/signup`, `/teacher/signup`, `/student/signup`, `/forgot-password`, `/reset-password`, `/showcase`, `/try`, `/waterworks`, `/for-reviewers`, `/plans/:plan`, `/privacy`, `/terms`, `/feedback`, `/donate` (both scroll-redirect into `/`), `/students`, `/teachers`, `/parents`, `/parents/guide`, `/organizations`, `/pathways/about`; dev-only `/dev/echo-spike`.
Redirects: `/login`→`/student-login`, `/teacher/login`→`/teacher-login`, `/student/login`→`/student-login`, `/modules`→`/student/modules`, `/avatar`→`/student/avatar`, `/arena`→`/student/play?tab=pvp`, `/student/arena`→same.
Protected: `/teacher/*`, `/student/*`, `/admin/experiments`, `/admin/metrics`, `/pathways/*`, `/pathways/facilitator/*`, `/pathways/welcome/*`. Full list: `src/App.tsx`; contract: style reference §8–§9.

## 11. Visual tokens and component systems

`tailwind.config.ts`: `brightboost.{navy #1C3D6C, blue #46B1E6, lightblue #8BD2ED, yellow #FF9C81 (coral), green #69D681}`, `font-montserrat`, `font-sans` (Montserrat → Inter); shadcn HSL tokens in `src/index.css` (`--radius: 0.5rem`, light-only `color-scheme`, Pathways scoped `.dark`). Motion: `float*`, `spin-slow`, `pop`; reduced-motion handling in `src/App.css`, `src/index.css`, `src/components/games/shared/game-effects.css`, `useReducedGameEffects.ts`, Waterworks and Echo Avenue CSS. Components: `src/components/ui/*` (shadcn), `game-card`/`game-button`/`button-shadow` utilities (`App.css`), `GameBackground`, `LanguageToggle`. Two legacy components reference undefined `bg-brightbots-*` classes (`Robot.tsx`, `UserSelectionButton.tsx`).

## 12. Design-document conflicts

| Document                               | Last change       | Conflict                                                                                                  | Resolution                                              |
| -------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `docs/design-principles.md`            | 2026-09-02 (#847) | none — canonical                                                                                          | retained (decision §2)                                  |
| `docs/brightboost-style-reference.md`  | 2026-04-27 (#558) | "without redesigning the brand/UI"; route list predates `/try`, `/plans`, `/waterworks`, `/parents/guide` | current-state baseline (decision §4); status note added |
| `docs/brightboost-homepage-v2-spec.md` | 2026-04-27 (#564) | "This is not a rebrand"; planning language; #758 currency review open                                     | historical spec (decision §5); status note added        |

## 13. Bright Bots source

See [`../brand-architecture.md`](../brand-architecture.md): `brightbots.org` is a static S3/CloudFront site last modified 2023-11-07; no source repository in the GitHub organization; `HOLD_SOURCE_NOT_FOUND`.

## 14. Issue ownership touched by BRAND_R0 (not absorbed)

| Issue           | Owner of                                                                       | BRAND_R0 relationship                                                             |
| --------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| #641            | PostHog flags + `/try` experiment                                              | Decision + adapter delivered; experiment stays deferred; comment cross-links      |
| #764            | Explicit shared/Railway/container build proof                                  | Untouched; post-deploy smoke is complementary; comment cross-links                |
| #693            | Set 3 creation-shaped finish                                                   | None                                                                              |
| #704, #720–#725 | The Great Work Release 1                                                       | Naming only                                                                       |
| #838–#843       | Safe Exploration controls, Quantum Quest, My Lab, guided choice, a11y contract | Dependencies recorded in `brand-r1/README.md`; no implementation                  |
| #855, #856      | Set-ID drift; presentation-only set locks                                      | Progression authority preserved (decision §6–§7)                                  |
| #758            | Currency of homepage-v2 spec / facilitator guide                               | Status notes added; the review itself remains #758                                |
| #794            | Exception/rageclick capture, replay retention                                  | Readback confirms still off (`autocapture_exceptions_opt_in` null, retention 30d) |
| #632            | Marketing-surface i18n                                                         | Named as a BRAND_R1 dependency                                                    |
