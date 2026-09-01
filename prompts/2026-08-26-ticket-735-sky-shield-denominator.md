# Ticket #735 — Sky Shield scoring: not every round is worth 20 points

**Author:** Nathaniel Walker with Claude Code
**Date:** 2026-08-26
**Sprint:** Post-program maintenance
**Pod:** Build

## Intent

Make Sky Shield's star rating reflect how the learner actually played. Perfect play was
arithmetically capped at 2 stars, so the 3-star band and the 100% badge could never be earned.

## Prompt

```
fix live defect #735 — Sky Shield scoring bug, not every round is worth 20 points
```

The prompt required a narrow scoping-only fix: no star-threshold retuning, no changes to
`GameShell` or any other game, red-then-green regression evidence for both grade bands, and
exact-head CI before the ticket is handed off for review.

## What Claude Code Did

- Files modified: `src/components/games/SkyShieldGame.tsx`,
  `src/components/games/__tests__/SkyShield.test.ts`
- File created: this prompt log
- Verification: lint, frontend typecheck, Prettier on the changed files, and the Sky Shield
  suites locally; the full unit run was compared against an `origin/main` baseline to confirm
  no new failures

## What Worked

Accumulating the achievable maximum inside `bump()` — the one place every scored round already
passes through — keeps the denominator correct no matter how the phases branch by grade band.
Deriving it from the round _count_ cannot work, because rounds are worth 10, 15, or 20 points
depending on the action.

## What Needed Editing

The existing "builds completion payload" test asserted `total: 420`, so it pinned the bug in
place. It was rewritten deliberately rather than worked around, and two all-correct-run cases
were added so a capped perfect score fails loudly in future.

## Lessons

When a score and its denominator are computed from different sources, they drift silently and
the failure lands on the learner. Tank Trek's `computeTankStars` comment records the same class
of bug, which suggests a shared rule: a game's maximum should be accumulated by the same code
path that awards the points.

## Rating

5/5
