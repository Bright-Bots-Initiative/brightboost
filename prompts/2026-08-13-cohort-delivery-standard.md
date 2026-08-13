# Cohort Delivery Standard

**Author:** Codex
**Date:** 2026-08-13
**Sprint:** Closeout
**Pod:** Build/Experience

## Intent

Turn recurring intern feedback into permanent repository policy for future cohorts.

## Prompt

```text
Add the issues Alice flagged to the relevant docs so they become canonical going forward.
```

## What Claude Code Did

- Expanded `docs/team-workflow.md`, the existing canonical workflow source, with a cohort delivery standard
- Added two-week preboarding, a small acclimation PR, explicit deadlines, dependency-chain fields,
  post-meeting ownership recaps, and small/frequent PR expectations
- Linked the PR size and cadence standard from `CONTRIBUTING.md`
- Files created/modified: `docs/team-workflow.md`, `CONTRIBUTING.md`, and this prompt log
- Tests passed: documentation formatting and link-target checks
- Build clean: not applicable; documentation-only change

## What Worked

Extending the existing canonical workflow document avoids creating a second, competing source of truth.
Numeric PR-size triggers make "keep PRs manageable" actionable while leaving room for translation and
generated-file exceptions.

## What Needed Editing

The feedback was broadened into delivery contracts so deadlines also name dependencies, reviewers, and
handoffs rather than becoming isolated dates.

## Lessons

Program feedback becomes durable only when it changes the operating contract contributors see before
work begins.

## Rating

5/5
