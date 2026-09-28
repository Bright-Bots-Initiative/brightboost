# Four learning-flow backlog fixes

**Author:** Codex, at the repository user's request
**Date:** 2026-09-28
**Pod:** Build / Experience

## Intent

Implement the four selected value/effort tickets: #896, #902, #895, and #907.

## Prompt

```text
implement the next four
```

## What Codex Did

- Give all unanswered Gotcha Gears options the same appearance and retain post-choice feedback.
- Separate arcade points from learning accuracy and preserve final-catch, missed-round, and attempt counts.
- Scope personal-best reads and completion writes to the initiating student/session.
- Share courses, isolate optional dashboard requests, and bound/cancel requests while preserving canonical access policy and priority.
- Add regressions for early exits, final catches, account changes, delayed completions, request counts, deadlines, and out-of-order structure responses.

## Verification

The focused regression command passed 105 tests in 13 files. Lint, frontend/backend type checks, schema drift, agent/docs checks, and the production build passed. The combined test command and Storybook guard stopped on this runtime's `uv_interface_addresses` error. The full unit run was interrupted after reporting 209 files while the subprocess guard suite remained active; it is not a complete-suite pass. The bundle-size command fails on the unchanged baseline too because its CommonJS script runs as an ES module. Database checks were skipped without a designated test database. The same synthetic connection profile reproduced Play Next at 5,500 ms with three course requests before the fix and 250 ms with one request after it; these are test-fixture timings, not live production measurements.

## Lessons

Test through the actual game shell and dashboard: helper-only checks missed stale final-catch values and optional requests blocking the primary action.

## Rating

Awaiting human review.
