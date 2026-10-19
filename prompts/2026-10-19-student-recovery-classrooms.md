# Student recovery, classes, and grade-appropriate content

**Author:** Codex (AI-assisted)
**Date:** 2026-10-19
**Sprint:** Backlog batch
**Pod:** Build / Experience

## Intent

Implement the four previously ranked tickets: #905, #744, #901, and #865.

## Prompt

```text
implement
```

The preceding recommendation identified startup recovery, enrolled-class visibility,
Gotcha Gears grade-band selection, and Modules locale parity as the next four items.

## What Codex Did

- Added bounded bootstrap recovery, a rendering error boundary, and storage-failure handling.
- Added a Classes membership page using the existing API and retained the existing join survey.
- Made Gotcha Gears content precedence explicit, including compatibility with existing seed data,
  authored overrides, normalized distractors, and Spanish upper-elementary questions.
- Filled Modules translation gaps in all supported locales and localized the remaining step label.
- Added focused regression tests. Verification outcomes and environment limitations are recorded in the PR.

## What Worked

Existing APIs, fixtures, and localized content conventions kept the work scoped.

## What Needed Editing

Standalone recovery copy must be available even when localization fails to load.
Legacy seeded rounds need recognition without requiring a database reseed.

## Lessons

Test the canonical content through the actual game, and retain healthy authored-content cases.
Keep explicit reload actions separate from automatic recovery attempts to prevent loops.

## Rating

Not rated by the requester.
