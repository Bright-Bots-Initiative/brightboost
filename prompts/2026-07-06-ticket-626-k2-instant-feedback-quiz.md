# Ticket 626 — K-2 instant-feedback quiz

**Author:** Jack
**Date:** 2026-07-06
**Ticket:** ticket-626 / Issue #623
**Pod:** Experience

## Intent

Ship a one-question-at-a-time instant-feedback quiz for K-2 students on every `story_quiz` INFO activity, without changing the submit-all experience for g3_5. Cover it with unit tests, Cypress, and manual checks, then get it PR-ready.

## Prompt

I worked from the ticket spec in `.cursor/ticket-626/` and drove the work in Cursor in a few passes:

```
First I had Cursor read the ticket rules and overview, then implement the feature in parts —
extract the legacy quiz, add the k2 gate and instant-feedback UI, wire analytics and i18n,
and keep tests outside the repo until the ticket was done.

When the build was stable, I asked it to run the full QA gate (lint, typecheck, unit, coverage,
e2e), migrate tests into brightboost/, sanity-check that we only touched scoped files,
commit on a feature branch, and write up the PR description.

After manual testing on the local stack (375px, Spanish toggle, screen reader), I had it push
the branch, add vi/zh-CN locale keys, and align everything with CONTRIBUTING.md — including
one prompt log at the end of the ticket, written in my voice.
```

## Outcome

- Shipped: `src/components/activities/quiz/` (instant path + legacy extraction), `ActivityPlayer` gate, en/es/vi/zh-CN strings, analytics event, completion toast via `App.tsx`, tests colocated + `k2InstantQuiz` Cypress spec
- Tests: lint ✓ · typecheck ✓ · `test:unit` 441 passed ✓ · `test:coverage:quiz` 97.76% lines ✓ · k2 Cypress 5/5 (×2) ✓ · `build` ✓
- Full repo `test:e2e` still has legacy failures unrelated to this ticket; CI smoke is the bar today

## What worked

- Keeping tests in `tests/ticket-626/` during development, then one migration into the repo before the PR
- Stub Cypress with API intercepts so I didn't need Docker for every e2e run
- The ticket spec's blast-radius list made review straightforward

## What I changed manually

- Ran manual empathy sweeps on the live stack (mobile width, es, screen reader) using our checklist
- Caught out-of-scope vi/zh-CN keys during review — dropped them first, then added proper translations in a follow-up commit
- Reviewed generated PR copy and prompt log wording before push

## Lessons

- Pull latest `main` before branching; use `your-name/short-description` for branch names per CONTRIBUTING
- Log prompts once at ticket close, not after every commit
- Don't commit `coverage/` or Cypress video/result folders

## Rating

4/5 — Cursor carried most of the implementation and test migration; I still owned manual QA, scope review, and PR hygiene.
