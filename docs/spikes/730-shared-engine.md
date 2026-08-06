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

| Strategy | Cost                                                        | Preserves                                                 |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| S-2      | Second `tsconfig` + `build:shared` in `build:railway`       | `dist/src/server.js`, `main`/`start`, no `server.ts` edit |
| S-3      | `paths` + bundling; must prove CommonJS resolves at runtime | Same layout if bundler inlines shared                     |

**Selected: S-2** — smallest blast radius inside §11.2 ownership. S-1 rejected for landing (entrypoint + unowned `server.ts` `__dirname` static-path risk). S-3 rejected as more moving parts for the same preserved layout.

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

| Piece                  | Change                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `shared/package.json`  | `name: @brightboost/greatwork-engine`, `main`/`types` → `dist/greatwork-engine/index.{js,d.ts}`                      |
| `backend/package.json` | `"@brightboost/greatwork-engine": "file:../shared"`                                                                  |
| Probe import           | `from "@brightboost/greatwork-engine"` — Node resolves identically at compile and runtime                            |
| Boot                   | `server.ts` imports `sharedEngineProbeLabel`; `/health` returns `{ status, sharedEngine }`                           |
| Regression             | `backend/src/__tests__/sharedEngineProbe.test.ts` (root Vitest `unit` project — backend has no `test` script, OQ-06) |

Rejected shortcuts: deepening to `../../../` (breaks compile), copying/symlinking `shared/` under `backend/` (spike anti-goal), S-1 / flatten `rootDir: "src"` (moves entrypoint; out of scope).

---

## B4 — Docker & container start

### B4-01 — Dockerfile comment

Added G-010 comment above `COPY . .` naming the load-bearing `shared/` dependency.

### B4-02 — W-03

`docker build -f Dockerfile.backend -t brightboost-730-spike:local .` → **exit 0**
Image: `brightboost-730-spike:local` (`sha256:80b9f4e0e4e915f212e87786728a2be19f9462b98405bf7f7c39c2e7b3b95556`).

### B4-03 — Start path vs emit

Image contains:

- `/app/backend/dist/src/server.js` (S-2 entrypoint)
- `/app/shared/dist/greatwork-engine/index.js`

`backend/package.json` still: `"start": "npm run predeploy && node dist/src/server.js"`.

Note: default `npm start` → `predeploy.sh` failed in Alpine with `set: line 2: illegal option -` (CRLF / `set -e` on the committed script — pre-existing, not introduced by this spike). W-04 proved the **node entrypoint** S-2 preserves: `node dist/src/server.js` from `/app/backend`.

### B4-04 — W-04

```
docker run -d --name bb730-w04 -p 8318:3000 -w /app/backend \
  -e PORT=3000 -e NODE_ENV=production -e SESSION_SECRET=… \
  -e DATABASE_URL=… -e DIRECT_URL=… \
  brightboost-730-spike:local node dist/src/server.js
```

Logs: `Server running on port 3000`  
`GET http://127.0.0.1:8318/health` → **200** `{"status":"ok"}`

### B4-05 — Falsify container start

Same env, wrong path: `node dist/backend/src/server.js` → **exit 1**

```
Error: Cannot find module '/app/backend/dist/backend/src/server.js'
```

Restored by removing the bad container (no lasting package.json change).

---

## B5 — Scope check

`git diff --name-only 6cc86a1...HEAD` (after U2 + Q2-02 tsconfig exclude):

```
Dockerfile.backend
backend/package.json
backend/src/sharedEngineProbe.ts
docs/spikes/730-shared-engine.md
shared/greatwork-engine/index.test.ts
shared/greatwork-engine/index.ts
shared/greatwork-engine/types.ts
shared/tsconfig.json
src/main.tsx
tsconfig.json
vite.config.ts
vitest.config.ts
```

No `vitest.workspace.ts`, no root `package.json` script changes, no `.github/workflows/**`. Matches §11.2 (+ backend probe; U2 colocated test; U2 `@shared` in `vitest.config.ts` per blockers-log exception). `shared/tsconfig.json` excludes `greatwork-engine/**/*.test.ts` so `build:shared` does not typecheck Vitest files (Q2-02).

---

## Appendix A — Pre-existing error inventory

**0 residuals** after `prisma generate` (A9-04 / B1-03). No follow-up issues filed from this inventory.
