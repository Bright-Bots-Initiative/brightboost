> **Canonical for:** experimentation governance (feature flags and A/B tests). Last verified against code: 2026-09-03.

# Experimentation governance

Decision record for #641, reconciled against `main` at `91e4071` (2026-09-03). Builds the reusable foundation only; **no production experiment is activated by this document or by BRAND_R0.**

## Verified state (2026-09-03, PostHog project 454866 "Default project")

| Fact                                                            | Readback                                                                                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Feature flags defined                                           | **0** (`feature-flag-get-all` → `count: 0`)                                                                                 |
| Experiments defined                                             | **0** (`experiment-list` → `count: 0`)                                                                                      |
| PostHog projects in org "BB"                                    | **1** — no staging project yet                                                                                              |
| Flag calls in `src/`, `backend/src/`, `shared/` before BRAND_R0 | **0** (`isFeatureEnabled` / `getFeatureFlag` / `onFeatureFlags` — bounded grep, three roots)                                |
| Database experiment tables                                      | `Experiment`, `ExperimentAssignment` (requires `userId`), `ExperimentEvent` — `prisma/schema.prisma`                        |
| Database experiment API                                         | `backend/src/routes/experiments.ts` (teacher-gated admin, per-user assignment), `src/hooks/useExperiment.ts` (no consumers) |

## Ownership decision

| Concern                                                                 | Owner                                                                                   | Why                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous / public assignment (`/try`, homepage, plan pages)            | **PostHog feature flags + experiments**                                                 | Assignment must exist before a user does. PostHog keys on the anonymous distinct id and stitches it to the DB user id at signup, so the demo → `account_registered` funnel stays measurable. |
| Logged-in, server-authoritative experiments (scoring rules, XP, gating) | **Database `Experiment*` tables**, only when the server must enforce the variant        | These tables key on `userId` and the server writes the events. Reserve them; they are dormant today.                                                                                         |
| Analysis                                                                | PostHog for anything assigned by PostHog; `/admin/experiments` for database experiments | Never analyse one experiment across both stores.                                                                                                                                             |

**Dual assignment is prohibited.** One experiment lives in exactly one store. If a database experiment needs PostHog analysis, mirror the assignment as a **person property** set server-side (`experiment:<slug> = <variant>`), never as a second assignment.

## Exposure

Exposure is recorded **only when the variant is actually rendered** — not when the flag is read, not on route mount, not while loading. The adapter reads flags with `send_event: false`; the render site calls `recordFlagExposure(key, value)` (`src/lib/featureFlags.ts`), which emits PostHog's standard `$feature_flag_called` so experiment analysis attributes correctly.

## Flag lifecycle

Every flag the code reads is an entry in `FLAG_REGISTRY` (`src/lib/featureFlags.ts`):

| Field      | Rule                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `key`      | Matches the PostHog key exactly. Kebab-case.                                                                               |
| `owner`    | A GitHub handle or team that removes the flag.                                                                             |
| `issue`    | The issue that owns the flag's lifecycle (`#123`).                                                                         |
| `expires`  | `YYYY-MM-DD`. The registry test fails after this date until the flag is removed or the date is extended on purpose.        |
| `fallback` | What renders when PostHog is disabled, refused, loading, unset, or returns an unknown value. Always the current behaviour. |
| `variants` | Every value the code can render. Anything else resolves to `fallback`.                                                     |
| `purpose`  | One line.                                                                                                                  |

Safe loading/default/off behaviour is proven by `src/lib/__tests__/featureFlags.test.ts`. **Kill switch:** disable the flag in PostHog (everyone gets `fallback`), or ship the fallback and delete the entry. Environment isolation: a staging build never evaluates production flags because the analytics guard refuses the production key outside production (`docs/analytics.md`).

## Randomization unit

| Unit           | When                                                                                      | How                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Visitor        | Public, anonymous surfaces (`/try`, homepage, plan pages)                                 | PostHog default (distinct id)                                                                                                 |
| User           | Logged-in behaviour that must be consistent across devices                                | PostHog with `identifyUser()` already applied, or database experiment                                                         |
| Class / school | Anything a teacher sees together with their students, or that students compare with peers | Group-level: PostHog group analytics on `class_id`, or a database experiment keyed by course. Never randomize within a class. |

## Never experiment on

Privacy, consent, security, accessibility, authorization, factual accuracy, required learning objectives, teacher assignments, set gating, mastery, XP, or ranking. These follow principle 9 of `docs/design-principles.md`: surprise never changes access, assessment, safety, or dignity.

## Before activation — required written plan

An experiment is not switched on until an issue (or a section in the owning issue) records:

1. hypothesis;
2. primary metric (an event in `docs/analytics.md` taxonomy, named exactly);
3. guardrail metrics (at minimum: `game_completed` rate for the affected surface, error rate, and any accessibility signal the surface has);
4. eligibility (surfaces, grade bands, roles, environments);
5. baseline value of the primary metric and where it was read ([`docs/brand-refresh/release-0/analytics-baseline.md`](brand-refresh/release-0/analytics-baseline.md) is the BRAND_R0 row);
6. minimum meaningful effect;
7. sample size and run conditions (traffic floor, minimum duration, stop date);
8. decision rule (what ships, what is reverted, who decides);
9. the flag's registry entry (owner, issue, expiry, fallback).

Below the traffic floor, the flag stays at `fallback` for everyone. #641's own note stands: with ~17 visitors in the last 30 days, running now would measure noise.

## First experiment (deferred, #641)

`/try` variant games. Foundation is ready when: a staging PostHog project exists (operator checklist), the flag is registered with owner/expiry, exposure is recorded on render, and the plan above is written on #641.

## Related

- `docs/analytics.md` — event taxonomy, privacy rules, environment guard
- `src/lib/featureFlags.ts`, `src/lib/analytics.ts`
- `backend/src/routes/experiments.ts`, `src/hooks/useExperiment.ts` (database path, dormant)
- `docs/architecture/brand-refresh-decision.md` §9
