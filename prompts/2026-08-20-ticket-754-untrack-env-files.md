# Untrack legacy .env leftovers (Issue #754)

**Author:** Jack
**Date:** 2026-08-20
**Sprint:** —
**Pod:** Build

## Intent

Get `.env`, `.env.development`, `.env.production`, and `.env.local-be` out of the tree so audits stop reading them as live production credentials, and retire the temporary allowlist that had been holding the guard green while they stayed tracked. Written after the fact — PR #755 merged 2026-08-21 without a log.

## Prompt

```
Followed the ticket spec and drove the work in a few passes — read the files before deleting
them, untrack the four legacy env leftovers, then clear the allowlist and rebuild on current
main before PR prep.
```

## What Claude Code Did

- Files created/modified: deleted `.env`, `.env.development`, `.env.production`, `.env.local-be`; updated `.env.example` with a `#754` note explaining what was removed and why; reset `trackedEnvFiles` to `[]` in `scripts/agent-check.allowlist.json`
- Tests passed: `build-and-test`, `db-check`, and `e2e-flows` green on the rebuilt branch; `npm run agent:check` clean with the allowlist emptied
- Build clean: yes; no `src/`, Prisma, or Cypress changes

## What Worked

- Reading the four files before deleting them instead of treating the filename as the finding. They hold localhost Postgres URLs, placeholders, and an Aurora-era `DATABASE_SECRET_ARN` shape with the real values commented out — leftovers from before `.gitignore` covered `.env*`, not live secrets. That conclusion now lives in `.env.example` so the next audit does not reopen it from scratch.
- Checking `npm run local` before removing `.env.local-be`: Vite mode `local-be` still reads the base `.env` a developer copies from `.env.example`, where `VITE_API_BASE="/api"` is defined, so no tracked mode file is required.
- Confirming `SETUP.md` already tells a fresh clone to copy both `.env.example` → `.env` and `backend/.env.example` → `backend/.env` before touching anything, rather than assuming it.

## What Needed Editing

- This branch predates #756, and #756 is what introduced `scripts/agent-check.allowlist.json` with four dated `trackedEnvFiles` exceptions naming this ticket. AC-018 only flags a tracked `.env*` that is **not** allowlisted, so deleting the files on their own would have left the check green with four exception rows pointing at paths that no longer exist — the acceptance criterion unmet and nothing red to say so. Merging `main` and clearing the entries back to `[]` had to happen in the same PR.
- Rebuilt on current `main` again after #762 and #768 so the diff came out as exactly six files and nothing else.
- Scope stayed at untracking. No credential rotation, no history rewrite — history-aware scanners are a separate concern and remain open.

## Lessons

- When a guard is satisfied by an exception, deleting the subject is only half the work. The exception has to go in the same change, or the green is measuring nothing.
- Untracking is not rotation. Say which one you actually did, in the file the next person will open.
- Legacy `.env*` files cost more in repeated audit alarm than they ever saved in convenience; the explanatory comment is the part that stops the loop.

## Rating

4/5 — the deletions were mechanical; the value was in reading the contents first and catching that the allowlist would have masked the result.
