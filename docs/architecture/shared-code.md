# Shared code (frontend + backend)

Standing rule from the #730 architecture decision. Evidence and strategy comparison live in [`docs/spikes/730-shared-engine.md`](../spikes/730-shared-engine.md).

## When code belongs in `shared/`

Put a module under `shared/<domain>/` only when **the same pure logic must run in the browser and in Node with identical results**.

That is required for The Great Work (`shared/greatwork-engine/`): server-authoritative scoring and replay re-run the same program the client uses. Most other games (Unity WebGL, FE-only React, API-scored quizzes) do **not** need a shared package.

**Do share (behaviour as source):** deterministic simulation, shared content schemas/types used on both sides, pure scoring of a machine definition.

**Do not share:** React/DOM code, Express handlers, Prisma clients, or “convenience” copies of backend helpers into the frontend tree.

> Duplicated **data** may be guarded (schemas, finite allowlists). Duplicated **behaviour** may not — behaviour is shared as source.

## Landed build pattern (S-2)

| Side     | How it consumes `shared/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | Source via `@shared/*` → `./shared/*` (`tsconfig.json` paths + `vite.config.ts` / `vitest.config.ts` aliases). Keep the alias string identical in all three.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Backend  | Separate project: `shared/tsconfig.json` emits CommonJS + `.d.ts` to `shared/dist/`. `backend/package.json` runs `build:shared` before `build` / `build:railway` / `typecheck`, and via lifecycle hooks `prepare` (install) + `predev` / `prestart:dev` (local TS entrypoints) so gitignored `shared/dist` is recreated on clean checkout. Import via the package name `@brightboost/greatwork-engine` (`file:../shared` → `shared/package.json` `main`/`types` pointing at `dist/greatwork-engine`). **Do not** use relative paths from `backend/src/` into `shared/dist/` — with `outDir: "dist"` and `rootDir: "."`, emit lands one directory deeper (`dist/src/…`), so a relative specifier that typechecks against source depth fails at runtime (`MODULE_NOT_FOUND` under `backend/shared/dist`). |
| Docker   | Root `Dockerfile.backend` uses `COPY . .` — that line **includes** `shared/` and must not be narrowed without proving the container still starts. Backend `npm ci` runs after `COPY . .`, so the `file:../shared` dependency resolves in the image.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Backend keeps `rootDir: "."` and `main` / `start` on `dist/src/server.js`. Do **not** admit live `../shared` into `backend/tsconfig` via `rootDir: ".."` unless you deliberately update emit layout, `main`, `start`, and any path math that assumes `dist/src/…` (that hazard is documented in the spike report).

## Authoring constraints

- Target **ES2019**, no DOM libs, no Node built-ins, no top-level `await`, no `import.meta`.
- Colocated `*.test.ts` under `shared/` must be **excluded** from `shared/tsconfig.json` `include` so `build:shared` does not typecheck Vitest imports.
- Registering the engine as its own Vitest project is a separate change (Great Work engine work), not part of the build-context spike.

## Packages

| Path                       | Role                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/greatwork-engine/` | Stub + future simulation engine (#720). Not a template for inventing parallel engines per game.                                                                                                          |
| `shared/progression/`      | Canonical STEM set activity-ID allowlists (#855). Pure data. Both runtimes gate on the same list: the app's progress meters and the backend's `POST /avatar/select-archetype` guard must never disagree. |

Add another `shared/<domain>/` only when a new feature hits the same cross-runtime identity requirement — not by default.

`shared/progression/` is a deliberate exception to the "duplicated **data** may be guarded" allowance above, and it should be read as a narrow one. #855 showed that guarding is only sufficient when the copies would drift _visibly_: the backend's Set 3 list had been wrong since it was typed, agreed with nothing, and nothing failed — the app's meter and the backend's 403 simply told students different stories. Where a finite allowlist is the **same gate** evaluated in both runtimes, share it; where it is merely similar data used for different purposes (module slugs, thumbnails, ordering) a guard still wins, and those stayed in `src/`.

### Consuming a shared module that is not the package `main`

`shared/package.json` declares no `exports` map, and `backend/tsconfig.json`
uses `moduleResolution: "node"`. Import a non-`main` module by its emitted
path so TypeScript and Node walk the **same** directory:

```ts
import { STEM_SET_3_IDS } from "@brightboost/greatwork-engine/dist/progression/stemSetIds";
```

Do not import `@brightboost/greatwork-engine/progression/stemSetIds` (no
`dist/`). Under `moduleResolution: "node"` that typechecks against the `.ts`
source inside the linked package and then fails at runtime with
`MODULE_NOT_FOUND` — the same "compiles, crashes" shape as the relative-path
hazard above.

## Freshness and parity — #720

The #720 issue and its handoff resolve the older S-2 question: keep frontend
source / backend emit, and keep the freshness/parity guard in #720's scope.
`npm run build:shared` now uses one compiler-selection path (root install first,
backend fallback) rather than whichever package's `tsc` happens to be on PATH.

`npm run verify:shared` recompiles into a disjoint temporary directory and compares
all emitted filenames and bytes, including `.d.ts` and progression output. It
rejects missing, stale, or orphaned output and never rebuilds the working `dist`
before checking it. Root `pretest`/development hooks and backend development hooks
invoke the check. After changing shared sources, explicitly rebuild then verify.

`npm run test:engine` runs source-versus-backend-package result/trace fixtures in
Node and a real Chromium Vitest project. A registered browser test is not evidence
of a browser pass; see the #720 review receipt for actual execution status.
The existing progression resolution test remains a separate consumer regression.

Draft mechanics and API extensions: [engine implementation](../games/greatwork-engine-720.md).
