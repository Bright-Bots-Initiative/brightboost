# Cohort Delivery Standard

**Author:** Codex  
**Date:** 2026-08-13  
**Sprint:** Closeout  
**Pod:** Build/Experience

## Intent

Turn recurring intern feedback into permanent repository policy for future cohorts.

## Prompt

```text
Add the cohort-delivery issues identified during closeout to the relevant docs so they become canonical going forward.
```

## What Claude Code Did

- Reconciled the durable delivery rules from #771 into the dedicated internship operating standard and program-plan template introduced by #778.
- Added a 7–10 day preboarding window, product and workflow orientation, a small reversible acclimation PR, explicit deadlines and dependencies, post-meeting ownership recaps, and small/frequent PR expectations.
- Preserved one canonical program-policy source rather than adding a competing cohort section to `docs/team-workflow.md`.
- Files created/modified for the reconciliation: `docs/internship-program/OPERATING_STANDARD.md`, `docs/internship-program/PROGRAM_PLAN_TEMPLATE.md`, `docs/internship-program/README.md`, and this prompt log.

## What Worked

Moving the delivery rules into the dedicated program standard keeps the useful specificity from #771 while preserving #778's privacy boundary, planning template, and year-neutral governance.

## What Needed Editing

The original proposal called for a fixed two-week preboarding period and a second canonical policy section in `docs/team-workflow.md`. The final standard uses a 7–10 day window consistent with the program template and keeps cohort policy in one canonical location.

## Lessons

Program feedback becomes durable only when it changes the operating contract contributors see before work begins, but each policy topic still needs one source of truth.

## Rating

5/5
