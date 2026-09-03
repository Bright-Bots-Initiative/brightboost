> **Canonical for:** BRAND_R1 entry criteria. Last verified against code: 2026-09-03.

# BRAND_R1 — entry criteria

BRAND_R1_DESIGN starts only when every **hard** criterion below is proven (not planned). Each row names the evidence that proves it. Rows in the second table are dependencies that bind the design and its implementation but do **not** postpone starting the design work once the hard criteria hold.

## Hard entry criteria (release controls, staging, exact promotion, backups, source recovery, evidence, security, design authority)

| #   | Criterion                                                                                                     | Proof                                                                                                                                                               | Status 2026-09-03                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | BRAND_R0 pull request (#858) merged with an independent review of the decision document                       | Merge commit on `main` = `BRAND_R0_SHA`                                                                                                                             | Open — reconciled and pushed; awaiting a `team-leads` reviewer (author cannot self-approve)         |
| 2   | Release controls: one canonical Railway project; production auto-deploy off; Wait for CI on                   | `docs/brand-refresh/release-0/evidence-register.md` rows E-30…E-33                                                                                                  | Done for `glorious-friendship`; the duplicate `hospitable-art` is in another Railway account (#859) |
| 3   | Persistent isolated staging exists and passes the **strict** exact-SHA smoke                                  | `node scripts/verify-deploy-target.mjs --url <staging> --expect-env staging --expect-sha <sha> --require-declared-env --expect-analytics disabled` → exit 0, logged | Environment, services, database, variables provisioned; first exact-SHA deploy in flight            |
| 4   | Production passes the strict smoke (declared, indexable, expected SHA, labelled analytics)                    | Same command with `--expect-env production --expect-analytics enabled` → exit 0                                                                                     | Open — requires promoting `BRAND_R0_SHA`                                                            |
| 5   | Exact-SHA, approval-bound promotion is the only production path                                               | `.github/workflows/deploy-promote.yml` merged; GitHub `production` environment gated; a recorded run                                                                | Workflow on the PR; environment gated; Railway credential secret is an operator step (#860)         |
| 6   | Backups: production backup series recorded; staging restore rehearsed                                         | Supabase readback (daily physical backups); staging restore row in the evidence register                                                                            | Production series recorded (E-24); staging rehearsal open                                           |
| 7   | Bright Bots deployed source recovered from AWS, or an approved canonical source proven                        | `docs/brand-refresh/brand-architecture.md`; recovery manifest with SHA-256 checksums                                                                                | `HOLD_SOURCE_NOT_FOUND` — AWS credentials on this machine are invalid                               |
| 8   | Evidence: every operator-checklist row terminal with UTC time, owner, and verification                        | `docs/brand-refresh/release-0/operator-checklist.md`                                                                                                                | Open                                                                                                |
| 9   | Security: no production data in staging; secrets environment-scoped; keys labelled                            | Staging fixture guard tests; GitHub environment secret scope; `/health` `analytics: enabled` on production after labels deploy                                      | Partial                                                                                             |
| 10  | Design authority: `docs/design-principles.md` + Safe Exploration Contract canonical; decision document merged | `docs/architecture/brand-refresh-decision.md`                                                                                                                       | On the PR                                                                                           |

## Binding dependencies (do not block starting BRAND_R1_DESIGN)

| Issue                              | Ownership                                                                                                                            | Relationship to BRAND_R1                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #838 (closed by PR #857)           | Shared Safe Exploration controls — **complete**                                                                                      | No longer a blocker. BRAND_R1 restyles the shared controls through their tokens; it does not fork them                                                                                                   |
| #843 (open)                        | Per-surface accessibility verification of Safe Exploration flows; definition half landed as `docs/safe-exploration-accessibility.md` | A **binding design contract and implementation-verification dependency**: every BRAND_R1 surface is designed against it and verified before it ships. Not a reason to postpone design-system exploration |
| #632 (open)                        | Localization of the current marketing surface (landing page, plan pages)                                                             | A **localization/content input** to BRAND_R1_DESIGN and an implementation dependency for BRAND_R1_BUILD. It does not require localizing the old design before the new design begins                      |
| #693, #839, #841, #842, #855, #856 | Creation-shaped finish; Quantum Quest redesign; My Lab; guided choice; set-ID drift; presentation-only locks                         | Each keeps its behaviour ownership. BRAND_R1 must not absorb their feature work; it restyles what they ship                                                                                              |

## What BRAND_R1_DESIGN must respect (from the decision)

- `docs/design-principles.md` and the Safe Exploration Contract; `docs/safe-exploration-accessibility.md` for every exploratory surface.
- Route contracts and legacy redirects (`docs/brightboost-style-reference.md` §8–§9).
- Accessibility, privacy, localization, progression, and teacher-assignment authority.
- No gameplay, scoring, progression, auth, or schema changes ride on the rebrand.
- Every public claim it introduces has a row in the evidence register before it ships.
- Every change reaches production only through the exact-SHA promotion workflow after strict staging verification.

## Deliverables BRAND_R1_DESIGN produces

1. Token proposal (color, type, radius, motion) as a diff against the style-reference baseline, with contrast results.
2. Component inventory: which `src/components/ui/*` primitives change, which stay; how the shared Safe Exploration controls take the new tokens.
3. Page-by-page spec for public routes with copy in `en` and `es` keys (#632 as input).
4. Measurement plan: which baseline rows must not regress, and the experiment plan per `docs/experiments.md` if any variant is tested.

Next authorized prompt after BRAND_R0_COMPLETE: **BRAND_R1_DESIGN_INPUT**.
