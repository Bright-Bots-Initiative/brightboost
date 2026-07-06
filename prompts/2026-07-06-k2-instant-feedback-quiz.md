# K-2 instant-feedback quiz (Issue #623)

**Author:** Jacob (Cursor Agent)
**Date:** 2026-07-06
**Sprint:** —
**Pod:** Experience

## Intent

Implement K-2 one-question-at-a-time instant-feedback quiz for `story_quiz` INFO activities (ticket-626 / issue #623), preserve g3_5 legacy submit-all quiz, migrate tests into the repo, and prepare a PR.

## Prompt

```
Implement K-2 instant-feedback quiz per ticket-626 overview (Parts A–E, T1–T3).
Migrate tests from tests/ticket-626/ into brightboost/, run lint/typecheck/unit/coverage/e2e,
create branch feat/instant-feedback-for-K-2-INFO-quiz, commit, and write pr-req.md.
Sanity-check blast radius; only touch scoped UI and documented exceptions (App Toaster, analytics, api.completeActivity).
```

Follow-up prompts included: manual e2e completion, push branch to GitHub, add vi/zh-CN locale keys, and align with CONTRIBUTING.md workflow.

## What Claude Code Did

- Files created/modified: `src/components/activities/quiz/*`, `ActivityPlayer.tsx`, en/es/vi/zh-CN locales, `analytics.ts`, `App.tsx`, `api.ts`, colocated tests, `cypress/e2e/k2InstantQuiz.cy.js` + helpers, `vitest.config.ts`, `package.json`, `cypress.config.ts`
- Tests passed: lint ✓, typecheck ✓, `test:unit` 441 passed ✓, `test:coverage:quiz` ≥90% ✓, k2 e2e 5/5 ×2 ✓, `build` ✓
- Full `test:e2e` (11 specs): 9 legacy specs fail (pre-existing)

## What Worked

- Ticket isolation then one-time test migration into `brightboost/`
- Colocated `__tests__/` and `quizFixtures.ts` matched repo patterns
- Stub-mode Cypress with API intercepts avoided Docker for CI-like runs

## What Needed Editing

- Reverted accidental vi/zh-CN keys during scope check, then re-added per human request
- Branch name `feat/...` did not match CONTRIBUTING `your-name/short-description` convention
- Prompt log and contributing Cursor rule added after PR prep

## Lessons

- Confirm GitHub username before naming branches
- Run `npm run build` before PR handoff (CONTRIBUTING checklist)
- Log prompts in `prompts/` in the same PR as AI-produced commits
- Do not commit `coverage/` or Cypress artifact folders

## Rating

4/5 — strong for feature + test delivery; process gaps (branch naming, prompt log, PR open) caught late.
