# Shared-engine build spike (Issue #730)

**Author:** Jack Goetzmann
**Date:** 2026-07-31
**Sprint:** —
**Pod:** Build

## Intent

Prove a shared TypeScript stub module survives frontend, backend, and Docker builds, and that the resulting container starts — then record a placement decision with evidence (no game logic).

## Prompt

```
Followed the ticket spec and drove work in Cursor in a few passes:
bootstrap and settle Prisma generate vs typecheck, land the stub module and
S-2 backend emit, unit-contract the @shared alias, then QA-falsify builds and
container start before drafting the PR.
```

## What Claude Code Did

- Files created/modified: `shared/greatwork-engine/*`, `shared/tsconfig.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `backend/package.json`, `backend/src/sharedEngineProbe.ts`, `Dockerfile.backend`, `src/main.tsx`, `docs/spikes/730-shared-engine.md`, `prompts/2026-07-31-ticket-730-shared-engine.md`
- Tests passed: yes (`npm run test:unit` — 583 passed; colocated shared unit RED/GREEN)
- Build clean: yes (`npm run build`, `cd backend && npm run build:railway`, Docker image build + `/health` 200)

## What Worked

- Capturing temporary S-1 emit layout as evidence while landing S-2 kept `main`/`start` valid.
- Falsifying W-04 with a wrong entrypoint (`MODULE_NOT_FOUND`) made the `tsc`≠runtime hazard concrete.

## What Needed Editing

- Excluding colocated `*.test.ts` from `shared/tsconfig.json` so `build:shared` did not typecheck Vitest imports.
- Documenting a one-line Vitest `@shared` alias so unit resolution matches Vite.

## Lessons

- A green frontend/backend compile is not enough for shared modules that change emit layout — prove container start.
- Colocated tests under a shared emit `include` can silently break Railway builds.

## Rating

4/5 — AI was useful for scaffolding, evidence capture, and QA passes; placement decision and ownership exceptions still needed human judgment.
