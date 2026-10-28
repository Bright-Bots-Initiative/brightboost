# Quiz scores, Move & Measure translations, and safety guards

**Author:** Codex with Nathaniel Walker
**Date:** 2026-10-27
**Pod:** Build / Experience

## Intent

Implement the next four value/effort tickets: #807, #792, #818, and #811.

## Prompt

```text
implement
```

The preceding recommendation identified the localhost seed-wipe gap,
missing legacy quiz results, Move & Measure locale gaps, and the unregistered
Chromium installation prerequisite.

## Work

- Require a designated test database name for automatic local seed cleanup,
  retaining the separate write gate and explicit reset controls.
- Carry the legacy quiz's final score and total through ActivityPlayer to
  persistence and analytics without changing completion or XP rules.
- Reconcile Spanish and Vietnamese Move & Measure keys and feedback with
  the English bundle.
- Register the existing Chromium install command and prove its removal
  fails the real CI manifest.
- Pin the three Playwright-installing jobs to Ubuntu 24.04 after hosted CI
  demonstrated that Playwright 1.57 rejects the new Ubuntu 26.04 runner.

## Verification

Regression tests reproduced the reported defects before the fixes. Coverage
includes safe/unsafe database-name classification, quiz retries and real
ActivityPlayer submissions, localized game playthroughs, locale parity, and
temporary-workflow sabotage. Full verification results are recorded in the PR.

No production seed, database migration, or deployment is part of this work.

## Rating

Not rated by the user.
