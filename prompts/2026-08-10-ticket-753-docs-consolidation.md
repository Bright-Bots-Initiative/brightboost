# Docs consolidation, SETUP, guides, and audit hygiene (Issue #753)

**Author:** Jack
**Date:** 2026-08-10
**Sprint:** —
**Pod:** Build

## Intent

Ship stack PR 3/3: consolidate superseded docs, rewrite SETUP, add guides + docs map, Cypress duplicate hygiene, and wire `agent:check` / `docs:check` into CI — without redoing `#751` foundation scripts or `#752` agents tree.

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes — consolidating
docs and SETUP/guides, then hygiene, SETUP walk + loud docs:check falsify, and
CI/README front-door follow-ups before stacking the PR.
```

## What Claude Code Did

- Files created/modified: `SETUP.md`, `DEPLOYMENT.md`, `README.md`, `docs/README.md`, `docs/guides/*`, `docs/ops/*`, `docs/pilot/*`, `.github/workflows/ci-cd.yml`, `cypress/e2e/studentDashboard.cy.ts` (kept) / deleted kebab duplicate, `backend/scripts/predeploy.sh` + matching test string path, `prompts/2026-08-10-ticket-753-docs-consolidation.md`
- Tests passed: `npm run docs:check` ✓; `npm run agent:check` ✓; unit suite green on SETUP walk
- Build clean: not the gate for this docs PR; no Prisma / game content changes

## What Worked

- Lean posture (no Vitest docs-check sabotage suite); prove with real-tree `docs:check` + manual DC-001/002/003
- Keeping thin `docs/ci.md` stub for Cypress `requireEnv` string
- Filing stale facilitator/homepage docs as #758 instead of silent delete

## What Needed Editing

- Backend without `backend/.env` can listen; failure often on first DB use — clarified in SETUP / local-dev
- README → docs map hop landed here after earlier deferral note

## Lessons

- Stack PR bases must be previous stack branch (`#753` → `#752` tip), not `main`, or the diff swallows the whole stack

## Rating

5/5 — ownership split kept review scoped to consolidation + front-door/CI follow-ups
