> **Canonical for:** BRAND_R1 entry criteria. Last verified against code: 2026-09-03.

# BRAND_R1 — entry criteria

BRAND_R1_DESIGN starts only when every row below is **proven** (not planned). Each row names the evidence that proves it. Until then this release is blocked; no visual rebrand work is scheduled.

| #   | Criterion                                                                                                   | Proof                                                                                                                                          | Status 2026-09-03         |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | BRAND_R0 pull request merged with owner approval                                                            | Merge commit on `main`                                                                                                                         | Open                      |
| 2   | Every operator-checklist item terminal                                                                      | [`../release-0/operator-checklist.md`](../release-0/operator-checklist.md) — no row left in `OPEN`                                             | Open                      |
| 3   | A persistent, protected staging host exists and passes the exact-SHA smoke                                  | `node scripts/verify-deploy-target.mjs --url <staging> --expect-env staging --expect-sha <main sha>` → exit 0, logged in the evidence register | Open (no staging)         |
| 4   | Production passes the same smoke without noindex and with the expected SHA                                  | Same command with `--expect-env production` → exit 0                                                                                           | Open (no SHA exposed yet) |
| 5   | The two-Railway-project deploy finding is resolved                                                          | Only one Railway project deploys from `main`; evidence register row                                                                            | Open                      |
| 6   | Analytics baseline row captured on the production SHA, including `/admin/metrics`                           | [`../release-0/analytics-baseline.md`](../release-0/analytics-baseline.md) — no `PENDING_EXTERNAL_READ` left                                   | Partial                   |
| 7   | Accessibility, reduced-motion, keyboard, reflow, and performance baselines captured                         | [`../release-0/accessibility-performance-baseline.md`](../release-0/accessibility-performance-baseline.md)                                     | Partial (RUM only)        |
| 8   | Bright Bots web source, host, and a restorable backup identified                                            | [`../brand-architecture.md`](../brand-architecture.md) — no `HOLD_SOURCE_NOT_FOUND`                                                            | Open                      |
| 9   | Marketing-surface localization owner and plan agreed (#632)                                                 | Issue comment naming the BRAND_R1 dependency                                                                                                   | Open                      |
| 10  | Safe Exploration a11y contract (#843) and shared controls (#838) landed or explicitly out of BRAND_R1 scope | PR merged or decision recorded on the issue                                                                                                    | In flight (#853, #857)    |

## What BRAND_R1_DESIGN must respect (from the decision)

- `docs/design-principles.md` and the Safe Exploration Contract.
- Route contracts and legacy redirects (`docs/brightboost-style-reference.md` §8–§9).
- Accessibility, privacy, localization, progression, and teacher-assignment authority.
- No gameplay, scoring, progression, auth, or schema changes ride on the rebrand.
- Every public claim it introduces has a row in the evidence register before it ships.

## Deliverables BRAND_R1_DESIGN produces

1. Token proposal (color, type, radius, motion) as a diff against the style-reference baseline, with contrast results.
2. Component inventory: which `src/components/ui/*` primitives change, which stay.
3. Page-by-page spec for public routes with copy in `en` and `es` keys.
4. Measurement plan: which baseline rows must not regress, and the experiment plan per `docs/experiments.md` if any variant is tested.
