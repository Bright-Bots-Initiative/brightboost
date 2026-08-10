# Spike #730 — Shared-engine build

> Branch: `jack/spike-730-shared-engine`  
> Date: 2026-07-30  
> Deliverable: stub module + config + placement decision with evidence. No game logic.
>
> Standing rule for contributors: [`docs/architecture/shared-code.md`](../architecture/shared-code.md).

## Decision (summary)

**Chosen: S-2** — keep `backend/tsconfig.json` `rootDir: "."`; compile `shared/` as a separate `tsc` project; backend consumes emitted JS/`.d.ts`.

**Rejected:**

| ID  | Why rejected for landing                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-1 | Moves emit to `dist/backend/src/server.js`, invalidates `main`/`start`, and breaks `__dirname`-relative static path math in unowned `server.ts`. Captured as evidence only (B3-01/B3-02). |
| S-3 | Paths + bundling adds a second emit strategy and more moving parts than a dedicated shared `tsc` project for the same preserved layout.                                                   |

Evidence sections below are filled as tasks complete.

---

## B1 — Baseline

### B1-01 — `backend/tsconfig.json` (verbatim, pre-change)

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2019"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": ["src/**/*"],
  "files": ["src/types/express.d.ts"],
  "ts-node": {
    "files": true
  }
}
```

### B1-02 — `backend/package.json` entrypoints (pre-change)

```json
"main": "dist/src/server.js",
"start": "npm run predeploy && node dist/src/server.js"
```

These are what S-1 invalidates when emit layout moves.

### B1-03 — Pre-existing `tsc` residuals (post-`prisma generate`)

From A9-04 (2026-07-30): after `npm run db:generate`, `cd backend; npm run typecheck` → **exit 0**, **0** residual errors.

Appendix: no residual error classes to file as product defects. Missing-`PrismaClient` errors without a generated client are the missing-client artifact, not inventory.

### B1-04 — `backend/scripts/predeploy.sh`

Path is `backend/scripts/predeploy.sh` (not root `scripts/`). Full read: Prisma schema/seed selection, `migrate deploy`, `generate`, optional seed/backfill. **No `dist/src` (or any `dist/`) references.** An S-1 emit move would not require edits to this file for path reasons.

### B1-05 — Dockerfiles

- Root `Dockerfile.backend` line 6: `COPY . .` from repo root — includes `shared/` today (undocumented, load-bearing).
- `backend/Dockerfile` exists. Grep of `.github/` for `Dockerfile` → **no matches**. Built by no workflow (OQ-05 — recorded, not fixed here).

---

## B2 — Frontend build (W-01)

### Module

- `shared/greatwork-engine/types.ts` — `GreatWorkEngineMeta` interface
- `shared/greatwork-engine/index.ts` — `GREAT_WORK_ENGINE_STUB_ID`, `describeGreatWorkEngine`

### Alias

- Root `tsconfig.json`: `include` adds `"shared"`; paths `"@shared/*": ["./shared/*"]`
- `vite.config.ts`: `resolve.alias["@shared"]` → `./shared`

### B2-04 — W-01 proof

- Import used from `src/main.tsx` (writes `dataset.greatWorkEngine` so Rollup cannot DCE).
- `npm run build` exit 0.
- Bundle grep: `dist/assets/index-scHqqeZM.js` contains `const bRe="greatwork-engine-stub-730"`.

### B2-05 — typecheck / lint

- `npm run typecheck` exit 0
- `npm run lint` exit 0
- **These prove nothing about W-04** (container start).

---

## B3 — Backend strategies

### B3-01 — S-1 emit layout (temporary)

Applied `rootDir: ".."`, `include: ["src/**/*", "../shared/**/*"]`, imported live `shared/` from `backend/src/sharedEngineProbe.ts`.

`npm run build:railway` exit 0. Emit listing (abbreviated):

```
dist/backend/src/server.js     ← entrypoint moved
dist/shared/greatwork-engine/index.js
dist/src/server.js             ← ABSENT (False)
```

`main` / `start` still pointed at `dist/src/server.js` → **invalid while gates green**.

### B3-02 — All-green while entrypoint invalid (S-1 temporary)

With S-1 emit still on disk and `main`/`start` unchanged:

| Command             | Exit                            |
| ------------------- | ------------------------------- |
| `npm run typecheck` | 0                               |
| `npm run lint`      | 0                               |
| `npm run test:unit` | 0 (98 files / 581 tests passed) |
| `npm run build`     | 0                               |

Canonical §15.2 row 7 evidence: compile/lint/unit/build green while container entrypoint path is wrong.

### B3-03 — S-2 vs S-3

| Strategy | Cost                                                        | Preserves                                                                                     |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| S-2      | Second `tsconfig` + `build:shared` in `build:railway`       | `dist/src/server.js`, `main`/`start`; originally claimed no `server.ts` edit (see note below) |
| S-3      | `paths` + bundling; must prove CommonJS resolves at runtime | Same layout if bundler inlines shared                                                         |

**Selected: S-2** — smallest blast radius inside §11.2 ownership. S-1 rejected for landing (entrypoint + unowned `server.ts` `__dirname` static-path risk). S-3 rejected as more moving parts for the same preserved layout.

**Round-1 correction:** the review fix **does** edit `server.ts` — one top-level import of `sharedEngineProbeLabel` and one `/health` field. That is acceptable under S-2: it does not touch `__dirname` static-path math, does not move `main`/`start`, and makes `/health` a load-bearing assertion rather than a proxy. The original “no `server.ts` edit” cell above is therefore outdated.

### B3-04 / B3-05 — Landed config (S-2)

- Reverted `backend/tsconfig.json` to `rootDir: "."`, `include: ["src/**/*"]` only.
- Added `shared/tsconfig.json` → emit CommonJS + declarations to `shared/dist/`.
- `backend/package.json`: `build:shared`, `build:railway` runs shared then `db:generate` then `tsc`; `typecheck` builds shared first.
- ~~Probe imports `../../shared/dist/greatwork-engine` (emitted, not live TS outside `rootDir`).~~ **Superseded by review fix below** — that relative path typechecked against source depth and failed at runtime under `dist/src/`.
- **`main` / `start` / `predeploy.sh` untouched** — S-2 preserves `dist/src/server.js`.

W-02 proof: `cd backend; npm run build:railway` exit 0; `dist/src/server.js` present.

### Review fix — runtime package-name resolution (PR #743)

**Defect (nwalker):** relative `../../shared/dist/greatwork-engine` from `backend/src/sharedEngineProbe.ts` resolves at compile time to `<repo>/shared/dist/…`, but after emit to `backend/dist/src/` the same specifier resolves to `backend/shared/dist/…` (`MODULE_NOT_FOUND`). Separately, nothing imported the probe, so `/health` 200 proved the server, not the shared engine.

**Resolution (Option 1):**

| Piece                  | Change                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `shared/package.json`  | `name: @brightboost/greatwork-engine`, `main`/`types` → `dist/greatwork-engine/index.{js,d.ts}`                |
| `backend/package.json` | `"@brightboost/greatwork-engine": "file:../shared"`                                                            |
| Probe import           | `from "@brightboost/greatwork-engine"` — Node resolves identically at compile and runtime                      |
| Boot                   | `server.ts` imports `sharedEngineProbeLabel`; `/health` returns `{ status, sharedEngine }`                     |
| Source contract        | `backend/src/__tests__/sharedEngineProbe.test.ts` — label from SOURCE only (cannot see emit-depth defect)      |
| Emit regression        | `backend/src/__tests__/sharedEngineProbe.emit.test.ts` — compiles probe to `dist/src/` and requires it in Node |

Rejected shortcuts: deepening to `../../../` (breaks compile), copying/symlinking `shared/` under `backend/` (spike anti-goal), S-1 / flatten `rootDir: "src"` (moves entrypoint; out of scope).

---

## B4 — Docker & container start

### B4-01 — Dockerfile comment

Added G-010 comment above `COPY . .` naming the load-bearing `shared/` dependency.

### B4-02 — W-03

Rebuilt 2026-08-10 after review-fix graph (`file:../shared`, `build:shared` in `build:railway`).

`docker build -f Dockerfile.backend -t brightboost-730-spike:local .` → **exit 0**  
`BUILD_EXIT=0`  
Image: `brightboost-730-spike:local` (`sha256:66d749f2f3664e9c3a4ed64985e79e32f6b777d1deef62dc4b0b0b364d49ec96`).

### B4-03 — Start path vs emit

```
$ docker run --rm brightboost-730-spike:local sh -c "ls -l /app/backend/dist/src/server.js /app/shared/dist/greatwork-engine/index.js"
-rwxr-xr-x    1 root     root         12257 Aug 10 13:00 /app/backend/dist/src/server.js
-rwxr-xr-x    1 root     root           484 Aug 10 13:00 /app/shared/dist/greatwork-engine/index.js
LS_EXIT=0
```

`backend/package.json` still: `"start": "npm run predeploy && node dist/src/server.js"`.

Note: default `npm start` → `predeploy.sh` failed in Alpine with `set: line 2: illegal option -` (CRLF / `set -e` on the committed script — pre-existing, not introduced by this spike). W-04 proves the **node entrypoint** S-2 preserves: `node dist/src/server.js` from `/app/backend` (**CMD bypassed**).

### B4-04 — W-04 (healthy)

```
docker run -d --name bb730-w04 -p 8318:3000 -w /app/backend \
  -e PORT=3000 -e NODE_ENV=production -e SESSION_SECRET=… \
  -e DATABASE_URL=… -e DIRECT_URL=… \
  brightboost-730-spike:local node dist/src/server.js
```

Logs: `Server running on port 3000`  
`GET http://127.0.0.1:8318/health` → **200**

```
{"status":"ok","sharedEngine":"greatwork-engine-stub-730@0.0.0"}
HEALTH_CURL_EXIT=0
```

### B4-05 — Falsify container start

Same env, wrong path: `node dist/backend/src/server.js` → **exit 1**

```
Error: Cannot find module '/app/backend/dist/backend/src/server.js'
```

Restored by removing the bad container (no lasting package.json change).

### B4-06 — Shared-module two-phase proof (separate sabotages)

Each sabotage asserts the path changed **before** asserting boot failure. Restored healthy `/health` after.

**Sabotage A — `/app/shared/dist` alone** (`@brightboost` link still present):

```
BEFORE: ls -ld /app/shared/dist → present
AFTER_RM: ls: /app/shared/dist: No such file or directory
LINK_STILL: /app/backend/node_modules/@brightboost/greatwork-engine -> ../../../shared
node dist/src/server.js →
Error: Cannot find module '/app/backend/node_modules/@brightboost/greatwork-engine/dist/greatwork-engine/index.js'. Please verify that the package.json has a valid "main" entry
  code: 'MODULE_NOT_FOUND'
  requestPath: '@brightboost/greatwork-engine'
NODE_EXIT=1
```

**Sabotage B — `/app/backend/node_modules/@brightboost` alone** (`shared/dist` still present):

```
BEFORE: link present; /app/shared/dist present
AFTER_RM: ls: /app/backend/node_modules/@brightboost: No such file or directory
SHARED_STILL: /app/shared/dist/greatwork-engine/index.js present
node dist/src/server.js →
Error: Cannot find module '@brightboost/greatwork-engine'
Require stack:
- /app/backend/dist/src/sharedEngineProbe.js
- /app/backend/dist/src/server.js
NODE_EXIT=1
```

**Restored:** fresh `docker run` with same env → logs `Server running on port 3000`;  
`GET http://127.0.0.1:8318/health` → `{"status":"ok","sharedEngine":"greatwork-engine-stub-730@0.0.0"}` (`RESTORE_EXIT=0`).

---

## B5 — Scope check

`git diff --name-only $(git merge-base origin/main HEAD)...HEAD` (2026-08-10, post review-2 remediation commits):

```
Dockerfile.backend
backend/package-lock.json
backend/package.json
backend/src/__tests__/sharedEngineProbe.emit.test.ts
backend/src/__tests__/sharedEngineProbe.test.ts
backend/src/server.ts
backend/src/sharedEngineProbe.ts
docs/architecture/shared-code.md
docs/spikes/730-shared-engine.md
prompts/2026-07-31-ticket-730-shared-engine.md
shared/greatwork-engine/index.test.ts
shared/greatwork-engine/index.ts
shared/greatwork-engine/types.ts
shared/package.json
shared/tsconfig.json
src/main.tsx
tsconfig.json
vite.config.ts
vitest.config.ts
```

**19 files.** No `.github/workflows/**`, no `scripts/**`, no `prisma/**`, no `backend/scripts/predeploy.sh`, no `DEPLOYMENT.md`.

---

## Falsification log — emit regression (F1–F4)

Governing question: _Could this pass for a reason other than the thing being claimed?_

| Step | Action                                                                                                | Result                                                                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1   | `npm run test:unit -- --reporter=verbose "backend/src/__tests__/sharedEngineProbe"` with landed probe | **GREEN** — 2 files / 4 tests passed (`F4_EXIT` path; F1 same)                                                                                                                                                                           |
| F2   | Temporarily change probe to `from "../../shared/dist/greatwork-engine"`                               | Emit test **RED** on phase-1 (`resolves the shared engine when the EMITTED artifact is required`); `EMIT_EXIT=1`; stderr includes `Cannot find module '../../shared/dist/greatwork-engine'` from `backend/dist/src/sharedEngineProbe.js` |
| F3   | Same break; run source-contract test only                                                             | **GREEN** — `sharedEngineProbe.test.ts` 1 passed (`F3_EXIT=0`) — proves source-only test cannot catch the defect                                                                                                                         |
| F4   | Restore `@brightboost/greatwork-engine`; re-run both                                                  | **GREEN** — 2 files / 4 tests; `F4_EXIT=0`                                                                                                                                                                                               |

### F1 verbatim (healthy)

```
 ✓ |unit| backend/src/__tests__/sharedEngineProbe.test.ts > sharedEngineProbe (source contract) > computes the expected label when resolved from source 1ms
 ✓ |unit| backend/src/__tests__/sharedEngineProbe.emit.test.ts > sharedEngineProbe emitted-artifact resolution > emits the probe to backend/dist/src/ (the real S-2 depth) 2ms
 ✓ |unit| backend/src/__tests__/sharedEngineProbe.emit.test.ts > sharedEngineProbe emitted-artifact resolution > resolves the shared engine when the EMITTED artifact is required 62ms
 ✓ |unit| backend/src/__tests__/sharedEngineProbe.emit.test.ts > sharedEngineProbe emitted-artifact resolution > fails at this emit depth when the old relative specifier is used 56ms

 Test Files  2 passed (2)
      Tests  4 passed (4)
```

### F2 verbatim (broken relative import — emit RED)

```
 × |unit| backend/src/__tests__/sharedEngineProbe.emit.test.ts > sharedEngineProbe emitted-artifact resolution > resolves the shared engine when the EMITTED artifact is required 75ms
   → Command failed: … require('./dist/src/sharedEngineProbe.js')
Error: Cannot find module '../../shared/dist/greatwork-engine'
Require stack:
- …\backend\dist\src\sharedEngineProbe.js
 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
EMIT_EXIT=1
```

### F3 verbatim (source contract still green under F2 break)

```
 ✓ |unit| backend/src/__tests__/sharedEngineProbe.test.ts > sharedEngineProbe (source contract) > computes the expected label when resolved from source 3ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
F3_EXIT=0
```

### F4 verbatim (restored)

```
 Test Files  2 passed (2)
      Tests  4 passed (4)
F4_EXIT=0
```

---

## Decision required (nwalker) — S-2 vs #730 §7 A1

**Decision required (nwalker):** S-2 makes the frontend consume shared **source** (`@shared/greatwork-engine` → `shared/greatwork-engine/index.ts`) and the backend consume shared **built output** (`@brightboost/greatwork-engine` → `shared/dist/…`). This is the A4 trade #730 §4 rejected (build artifact + ordering + skew risk). Accepting it means #720 needs a freshness/parity guard on `shared/dist` before byte-identical output can be claimed. Confirm S-2 is accepted, and confirm whether that guard is #720 scope or a new issue.

---

## Appendix A — Pre-existing error inventory

**0 residuals** after `prisma generate` (A9-04 / B1-03). No follow-up issues filed from this inventory.
