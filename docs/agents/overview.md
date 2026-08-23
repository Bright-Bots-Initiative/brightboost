> **Canonical for:** agent-facing project overview. Last verified against code: 2026-08-10.

# Bright Boost — agent overview

Bright Boost is a multilingual (English/Spanish/Vietnamese/Chinese) K–8 STEM learning platform with a secondary-age **Pathways** layer (ages 14–17, cybersecurity-first). Current rollout priority is **K–2**; architecture and copy must support K–8 and Pathways.

Ranked product priorities: (1) K–2 usability/readability, (2) teacher-dashboard quality, (3) EN/ES consistency, (4) educational gamified learning, (5) pilot/demo readiness, (6) minimal regression risk.

## Before you change anything

1. Read every file under [`docs/agents/rules/`](./rules/).
2. Read `docs/agents/skills/overview.md` and load a skill only when the task matches its description.
3. Prefer the smallest diff that matches adjacent patterns.

## Commands (spot-checked 2026-08-10 against `package.json`)

| Command                           | Purpose                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `npm install`                     | Root deps; backend: `cd backend && npm install`                                      |
| `npm run dev`                     | Vite on `http://localhost:5173` (`strictPort`; proxies `/api` → `localhost:3000`)    |
| `cd backend && npm run dev`       | API on port `3000`; needs `DATABASE_URL` + `DIRECT_URL` in `backend/.env`            |
| `npm run lint`                    | ESLint, `--max-warnings 0`                                                           |
| `npm run typecheck`               | Frontend `tsc --noEmit` only                                                         |
| `cd backend && npm run typecheck` | Backend TypeScript                                                                   |
| `npm run test:unit`               | Vitest unit project (fast local gate)                                                |
| `npm test`                        | Unit + Storybook browser project (needs Playwright Chromium)                         |
| `npm run test:e2e`                | Cypress (app must be running)                                                        |
| `npm run storybook`               | Storybook on port `6006`                                                             |
| `npm run db:init`                 | Root `prisma migrate deploy` + seed — see [`30-database.md`](./rules/30-database.md) |
| `npx prisma generate`             | Root schema dual-generates frontend + backend clients                                |
| `npm run agent:check`             | Adapter / rule / skill graph                                                         |
| `npm run docs:check`              | Docs integrity checks                                                                |
| `npm run verify`                  | Local–CI parity gate                                                                 |

Traps:

- `npm run start` runs a **build**, not a server.
- Root `npm run typecheck` does not cover backend — run backend typecheck separately.
- `npm test` fails without Playwright browsers; use `test:unit` for the light path.
- Node: **20.x** (`package.json` `engines` + `.nvmrc`). Ignore stale Node 18 mentions in legacy docs.

## Architecture (short)

| Layer    | Stack                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite · Tailwind + shadcn/ui · React Router v6 · i18next |
| Backend  | Node 20 Express + Prisma → PostgreSQL                                           |
| Hosting  | Railway + Supabase (PostgreSQL)                                                 |
| Checks   | Vitest / Cypress / Storybook / ESLint + Prettier                                |

Auth: JWT in `localStorage` under `bb_access_token`; user object under `user`. Identity for self-actions comes from `req.user`, never body-supplied IDs.

Local Docker Postgres (tracked compose): host port **5435**.

## Source-of-truth ladder

When information conflicts, resolve in this order:

1. Actual code (imports, runtime behavior)
2. `package.json`
3. `prisma/schema.prisma` (root schema is authoritative for deploys)
4. Root `README.md`
5. Current passing tests
6. Docs in active use (`docs/agents/`, then other `docs/`)
7. Legacy docs

Known conflicts: `frontend/CONTRIBUTING.md` may say Node 18 (truth is 20); `backend/README.md` may describe retired AWS Lambda/Aurora (production is Railway + Supabase).

## Where rules and skills live

| Kind               | Path                                                                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Always-on rules    | [`docs/agents/rules/`](./rules/) — [`00-core`](./rules/00-core.md), [`10-testing`](./rules/10-testing.md), [`20-i18n`](./rules/20-i18n.md), [`30-database`](./rules/30-database.md), [`40-security`](./rules/40-security.md), [`50-docs`](./rules/50-docs.md), [`60-verification`](./rules/60-verification.md) |
| Skills (on demand) | `docs/agents/skills/**/SKILL.md` — index at `docs/agents/skills/overview.md`                                                                                                                                                                                                                                   |
| Learned notes      | [`docs/agents/learned/`](./learned/)                                                                                                                                                                                                                                                                           |
| MCP notes          | [`docs/agents/mcp.md`](./mcp.md)                                                                                                                                                                                                                                                                               |

Tool adapters (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/agent-context.mdc`) are thin routers into [`agent.md`](./agent.md). Do not paste rule bodies into adapters.
