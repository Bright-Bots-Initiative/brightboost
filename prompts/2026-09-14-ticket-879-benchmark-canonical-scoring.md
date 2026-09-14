# Ticket #879 — Benchmark scores can no longer exceed the question count

**Author:** Claude Code (Fable 5.1)
**Date:** 2026-09-14
**Sprint:** Audit remediation (tracker #870)
**Pod:** Build

## Intent

Close the audit's DATA-03 finding: the benchmark submit handler scored every
submitted answer whose index matched, so ten copies of one correct answer on a
five-question benchmark persisted as 10 of 5 and skewed the class growth
report. Score the template's canonical question set once each and refuse any
submission that does not answer every question exactly once with an index
into that question's choices.

## Prompt

```text
PR C — #879: retain canonical scoring and expand historical inspection.
Proceed with bounded inputs, rejection of duplicate/unknown/missing question
IDs, per-question choice-index validation, canonical answer ordering, and
scoring each canonical question once. D5: reject incomplete submissions with
400. Expand the historical audit to compare attempts with their assigned
template: the proposed query misses submissions with the expected number of
unique answers where one ID is unknown or one choice index is out of range.
Identify affected records and explain the correction options. Distinguish
preventing new malformed submissions from resolving existing reporting
corruption.
```

## What Claude Code Did

- `backend/src/services/benchmarkScoring.ts` (new): a pure
  `scoreBenchmarkSubmission(questions, answers)` that refuses duplicates,
  unknown ids, missing questions and out-of-range choices, and otherwise scores
  the canonical questions in template order. `0 ≤ score ≤ questions.length` by
  construction.
- `backend/src/routes/benchmarks.ts`: the submit schema bounds the array (200),
  the id (100 chars), the index (0–100) and reuses the shared 24-hour
  `timeSpentSchema`; the handler delegates to the scorer and persists its
  canonical-order answers.
- Tests: `benchmarkSubmit.test.ts` (route, 9 cases: canonical 201 with score
  3 of 5; duplicates, unknown, incomplete, out-of-range and oversized inputs
  refused with no write; shuffled input persisted in template order; 409 on a
  second attempt; 404/400/403 preserved) and `benchmarkScoring.test.ts` (4
  cases on the pure scorer, including a 50-sample bound check).
- Tests passed: yes. Build clean: yes (lint, backend and frontend typecheck).

## What Worked

Pulling scoring into a pure function made the bound a property of the code
rather than of the tests, and let the route test stay about HTTP contract.

## What Needed Editing

Nothing after the first green run; the RED run on the untouched tree showed
the audit's exact result (201, score 10, total 5).

## Lessons

Validate against the canonical set, not the submitted multiplicity, whenever
a client-supplied array feeds an aggregate that other people read.

## Rating

5/5 — small, mechanical, and the historical-data query is the part that needed
thought.
