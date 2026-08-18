# Grade-Band and Within-Band Difficulty Contract

> **Canonical decision.** Nathaniel Walker and Build lead Alice Lin approved the grade-band boundary on
> 2026-08-13, resolving #699. This document separates what is decided from what remains to be designed.

## Decided architecture boundary

1. The platform resolves a student's grade band from their course and injects one normalized value into
   the activity.
2. A game consumes that injected value. It must not independently fetch, infer, or maintain another
   source of truth for the student's grade band.
3. Each game owns how its content, complexity, pacing, and scaffolding respond to the injected band.
4. A missing or invalid band falls back safely to K–2.
5. Existing inconsistencies are corrected when an individual game is next touched. This decision does
   not authorize a repository-wide migration.

The target K–8 bands are:

- `k2` — kindergarten through grade 2;
- `g3_5` — grades 3 through 5; and
- `g6_8` — grades 6 through 8.

The current application supports only `k2` and `g3_5`. `g6_8` is a target contract, not implemented
behavior.

## Personalization direction: 12 stages per band

Each grade band will ultimately provide **12 ordered difficulty stages**. This creates a supported path
from foundational practice through advanced challenge without moving a student into content intended
for a different age band.

The stages should be configuration and content variations inside one game, not 12 forked game
components. Depending on the learning goal, a stage may vary:

- concept and vocabulary complexity;
- number of elements, steps, or interacting rules;
- hint frequency and amount of scaffolding;
- speed, precision, or working-memory demand; and
- openness, choice, and independence in the creative task.

Stage 1 should offer the strongest mastery support; Stage 12 should provide the highest appropriate
ceiling within that band. Advancement must remain encouraging and reversible, never a permanent label
or punishment.

## Still open: placement and progression

The repository does not yet define or implement how a student receives or moves between the 12 stages.
Issue [#772](https://github.com/Bright-Bots-Initiative/brightboost/issues/772) owns the separate product
and architecture decision that must settle:

- initial placement and whether teachers or students can adjust it;
- the evidence window and thresholds for advancing, holding, or stepping back;
- whether stage is per game, per subject, or shared across the learner profile;
- how creation-first games show growth without relying on a single correct answer;
- storage, analytics, privacy, explainability, and safe fallback behavior; and
- how content and scoring changes are validated for fairness and accessibility.

Until that decision lands, games may author richer difficulty data, but they must not claim cross-game
adaptive placement or introduce a competing learner-level system.

## Review rule for future game work

When a game is created or materially revised, reviewers should confirm that it:

- consumes the platform-injected grade band;
- keeps the learning goal coherent across its supported bands;
- uses data/configuration rather than component forks for difficulty variation;
- has tests proving its supported band variants and K–2 fallback; and
- clearly distinguishes implemented stages from planned ones.
