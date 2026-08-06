# Shared code (frontend + backend)

Standing rule from the #730 architecture decision. Evidence and strategy comparison live in [`docs/spikes/730-shared-engine.md`](../spikes/730-shared-engine.md).

## When code belongs in `shared/`

Put a module under `shared/<domain>/` only when **the same pure logic must run in the browser and in Node with identical results**.

That is required for The Great Work (`shared/greatwork-engine/`): server-authoritative scoring and replay re-run the same program the client uses. Most other games (Unity WebGL, FE-only React, API-scored quizzes) do **not** need a shared package.

**Do share (behaviour as source):** deterministic simulation, shared content schemas/types used on both sides, pure scoring of a machine definition.

**Do not share:** React/DOM code, Express handlers, Prisma clients, or “convenience” copies of backend helpers into the frontend tree.

> Duplicated **data** may be guarded (schemas, finite allowlists). Duplicated **behaviour** may not — behaviour is shared as source.

## Landed build pattern (S-2)

| Side     | How it consumes `shared/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | Source via `@shared/*` → `./shared/*` (`tsconfig.json` paths + `vite.config.ts` / `vitest.config.ts` aliases). Keep the alias string identical in all three.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Backend  | Separate project: `shared/tsconfig.json` emits CommonJS + `.d.ts` to `shared/dist/`. `backend/package.json` runs `build:shared` before `build:railway` / `typecheck`. Import via the package name `@brightboost/greatwork-engine` (`file:../shared` → `shared/package.json` `main`/`types` pointing at `dist/greatwork-engine`). **Do not** use relative paths from `backend/src/` into `shared/dist/` — with `outDir: "dist"` and `rootDir: "."`, emit lands one directory deeper (`dist/src/…`), so a relative specifier that typechecks against source depth fails at runtime (`MODULE_NOT_FOUND` under `backend/shared/dist`). |
| Docker   | Root `Dockerfile.backend` uses `COPY . .` — that line **includes** `shared/` and must not be narrowed without proving the container still starts. Backend `npm ci` runs after `COPY . .`, so the `file:../shared` dependency resolves in the image.                                                                                                                                                                                                                                                                                                                                                                                |

Backend keeps `rootDir: "."` and `main` / `start` on `dist/src/server.js`. Do **not** admit live `../shared` into `backend/tsconfig` via `rootDir: ".."` unless you deliberately update emit layout, `main`, `start`, and any path math that assumes `dist/src/…` (that hazard is documented in the spike report).

## Authoring constraints

- Target **ES2019**, no DOM libs, no Node built-ins, no top-level `await`, no `import.meta`.
- Colocated `*.test.ts` under `shared/` must be **excluded** from `shared/tsconfig.json` `include` so `build:shared` does not typecheck Vitest imports.
- Registering the engine as its own Vitest project is a separate change (Great Work engine work), not part of the build-context spike.

## First package

| Path                       | Role                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `shared/greatwork-engine/` | Stub + future simulation engine (#720). Not a template for inventing parallel engines per game. |

Add another `shared/<domain>/` only when a new feature hits the same cross-runtime identity requirement — not by default.
