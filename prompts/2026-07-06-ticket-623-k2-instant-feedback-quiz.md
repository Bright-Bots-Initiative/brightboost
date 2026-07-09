# K-2 instant-feedback quiz (Issue #623)

**Author:** Jack
**Date:** 2026-07-06
**Sprint:** —
**Pod:** Experience

## Intent

Ship a one-question-at-a-time instant-feedback quiz for K-2 students on every `story_quiz` INFO activity, without changing the submit-all experience for g3_5. Cover it with unit tests, Cypress, and manual checks.

## Prompt

```
I followed the ticket spec and drove the work in Cursor in a few passes — extract the legacy quiz,
add the k2 gate and instant-feedback UI, wire analytics and i18n, and build out tests alongside
the feature.

When things were stable, I ran lint, typecheck, unit tests, coverage, and Cypress, then
sanity-checked that only the intended files changed and opened a PR.

I did manual passes for mobile width, Spanish copy, and screen reader, and added vi/zh-CN locale
keys before merge.
```

## What Claude Code Did

- Files created/modified: `src/components/activities/quiz/*`, `ActivityPlayer.tsx`, en/es/vi/zh-CN locales, `analytics.ts`, `App.tsx`, `api.ts`, colocated tests, `cypress/e2e/k2InstantQuiz.cy.js` + helpers, `vitest.config.ts`, `package.json`, `cypress.config.ts`
- Tests passed: lint ✓, typecheck ✓, `test:unit` 441 passed ✓, `test:coverage:quiz` ≥90% ✓, k2 e2e 5/5 (×2) ✓, `build` ✓

## What Worked

- Building the feature and tests incrementally, then hardening before PR
- Stub Cypress with API intercepts for repeatable e2e runs
- Keeping the change set scoped to the quiz flow and activity player

## What Needed Editing

- Manual checks on a running dev build (layout, locales, accessibility)
- vi/zh-CN strings added in a follow-up commit after review
- Wording pass on this log before submit

## Lessons

- Pull latest `main` before branching; use `your-name/short-description` branch names per CONTRIBUTING
- One prompt log at ticket close; follow `prompts/README.md` format
- Keep prompt logs vague — no workspace-only paths or tooling; stick to what ships in the repo

## Rating

4/5 — AI carried most of implementation and tests; manual QA and review still on me.
