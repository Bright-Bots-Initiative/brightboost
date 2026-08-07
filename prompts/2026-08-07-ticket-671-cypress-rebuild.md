# Cypress E2E rebuild (Issue #671)

**Author:** Jack
**Date:** 2026-08-07
**Sprint:** —
**Pod:** Build

## Intent

Replace the fossil Cypress shell suite with flow-level specs against a real remapped stack and deterministic seed, including CI wait-on/env seams and falsification before PR.

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes: Cypress config/seed/login, flow specs for auth dashboard and student quiz, QA falsification, rebase onto #740, then PR hygiene fixes for lint and E2E env leaking into Vitest.
```

## What Claude Code Did

- Files created/modified: `cypress.config.ts`, `cypress/e2e/*` (smoke/auth/session/dashboard/student/activity), `cypress/support/*`, `cypress/fixtures/seed-contract.json`, `scripts/e2e-seed.mjs`, `scripts/__tests__/e2e-seed-prod-refusal.test.ts`, `vitest.config.ts`, `.github/workflows/ci-cd.yml`, `package.json`, `docs/ci.md`, `eslint.config.js`, `backend/src/utils/security.ts`, `backend/src/services/module.ts` (E2E-only relax seam), small #740 shell-gate/`ciWiring` compat
- Tests passed: `npm run test:unit` 670 passed / 20 skipped; rebuilt Cypress suite 14/14; `npm run test:e2e:ci` smoke green; prod-shaped seed refusal exit 1
- Build clean: `npm run lint` / `typecheck` / `build` yes after Cypress ESLint override and Vitest guard on `E2E_RELAX_AUTH_LIMIT`

## What Worked

- Extending the existing `requireEnv` / #677 Cypress env seams instead of new silent defaults
- Falsifying each live flow before trusting the suite
- Rebase `--onto` current #740 tip avoided `ci-cd.yml` step collisions

## What Needed Editing

- Coverage denominator when Cypress support files landed (exclude Cypress-only entry; unit-test pure helpers)
- Auth rate limit + module cache needed a local E2E relax flag; Vitest must ignore it when `.env.local` leaks the flag
- Chai `expect(...).to.*` tripped `@typescript-eslint/no-unused-expressions` until Cypress ESLint overrides

## Lessons

- A local-only E2E env flag that changes backend behavior must be inert under Vitest or unit cache/rate-limit tests go red
- Specs that `e2e:reset` in `before` rehash the teacher password — bad-password falsification needs a non-reseed spec

## Rating

4/5 — strong for suite scaffolding and falsification loops; human still needed for port remap, E2E env provisioning (OQ-13), and calling out backend ownership of the relax seam.
