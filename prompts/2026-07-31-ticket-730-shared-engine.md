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

---

# Review-2 remediation (PR #743) — 2026-08-10

**Author:** Jack Goetzmann
**Date:** 2026-08-10
**Sprint:** —
**Pod:** Build

## Intent

Close proof-quality gaps on PR #743 so Nathan can re-review once: emit-depth regression that can fail, rebuilt container evidence in the spike doc, backend `build` wiring, root `shared/dist` exclude, and PR-body decisions left for him.

## Prompt

```
Followed the ticket review-2 handoff and drove work in Cursor: replace the
proxy regression with an emit-depth two-phase test (F1–F4), rebuild W-03/W-04
evidence on the current image, wire build:shared into backend build, exclude
shared/dist from root typecheck, and write Nathan decision items into the PR.
```

## What Claude Code Did

- Files created/modified: `backend/src/__tests__/sharedEngineProbe.test.ts`, `backend/src/__tests__/sharedEngineProbe.emit.test.ts`, `backend/package.json`, `tsconfig.json`, `docs/spikes/730-shared-engine.md`, `docs/architecture/shared-code.md`, `prompts/2026-07-31-ticket-730-shared-engine.md`
- Tests passed: yes (F1/F4: emit + source-contract green; F2: emit RED under broken relative import; F3: source-contract still green under that break)
- Build clean: yes (`docker build` exit 0; `/health` includes `sharedEngine` label; separate shared/dist and `@brightboost` sabotages exit 1)

## What Worked

- Emitting the probe inside the Vitest test (no workflow edits) caught the depth-fragility defect that source imports cannot see.
- Separate sabotages for `shared/dist` vs the package link showed each link is load-bearing.

## What Needed Editing

- PowerShell interpolates `$?` inside double-quoted `docker … sh -c` strings — use single-quoted shell scripts to record real `NODE_EXIT`.

## Lessons

- A regression test that imports TypeScript source is not a runtime resolution proof when the defect only exists after emit.

## Rating

5/5 — the handoff spelled the failing test shape; AI executed falsification and evidence rebuild without widening scope.
