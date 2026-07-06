# K-2 instant-feedback quiz (Issue #623)

**Author:** Jack
**Date:** 2026-07-06
**Sprint:** —
**Pod:** Experience

## Intent

Ship a one-question-at-a-time instant-feedback quiz for K-2 students on every `story_quiz` INFO activity, without changing the submit-all experience for g3_5. Cover it with unit tests, Cypress, and manual checks, then get it PR-ready.

## Prompt

```
I worked from the ticket spec in .cursor/ticket-623/ and drove the work in Cursor in a few passes —
extract the legacy quiz, add the k2 gate and instant-feedback UI, wire analytics and i18n, and keep
tests outside the repo until the ticket was done.

When the build was stable, I ran the full QA gate (lint, typecheck, unit, coverage, e2e), migrated
tests into brightboost/, sanity-checked scoped files, and prepared a feature branch and PR description.

After manual testing on the local stack (375px, Spanish toggle, screen reader), I added vi/zh-CN
locale keys and aligned with CONTRIBUTING.md.
```

## What Claude Code Did

- Files created/modified: `src/components/activities/quiz/*`, `ActivityPlayer.tsx`, en/es/vi/zh-CN locales, `analytics.ts`, `App.tsx`, `api.ts`, colocated tests, `cypress/e2e/k2InstantQuiz.cy.js` + helpers, `vitest.config.ts`, `package.json`, `cypress.config.ts`
- Tests passed: lint ✓, typecheck ✓, `test:unit` 441 passed ✓, `test:coverage:quiz` ≥90% ✓, k2 e2e 5/5 (×2) ✓, `build` ✓

## What Worked

- Ticket isolation then one-time test migration into the repo
- Stub Cypress with API intercepts for deterministic e2e without Docker every run
- Blast-radius list in the spec kept review focused

## What Needed Editing

- Manual empathy sweeps on the live stack
- vi/zh-CN locale keys reviewed and added in a follow-up commit
- PR copy and this prompt log reviewed before push

## Lessons

- Pull latest `main` before branching; prefer `your-name/short-description` branch names per CONTRIBUTING
- One prompt log at ticket close; follow `prompts/README.md` format
- Ignore `coverage/` and Cypress artifact folders (now in `.gitignore`)

## Rating

4/5 — AI carried most of implementation and test migration; manual QA and PR hygiene still on me.
