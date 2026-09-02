> **Canonical for:** local development troubleshooting. Last verified against code: 2026-09-01.

# Local development guide

Companion to [`SETUP.md`](../../SETUP.md). Use SETUP to get running; use this page when something breaks.

## Environment file precedence

| File                          | Who reads it                                   | Notes                                              |
| ----------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| Root `.env`                   | Prisma CLI; Vite (base)                        | Copy from `.env.example`                           |
| Root `.env.development`       | Vite in `npm run dev`                          | Overrides `.env` for `VITE_*` (committed defaults) |
| Root `.env.development.local` | Vite                                           | Gitignored local overrides                         |
| `backend/.env`                | Express when started with dotenv (§5 in SETUP) | Backend does **not** read root `.env`              |

## `VITE_API_BASE` must be `/api`

Set:

```env
VITE_API_BASE=/api
```

Do **not** set a bare host like `http://localhost:3000`. Login may still work (hardcoded `/api`) while module, avatar, and progress calls return 404.

Vite proxies `/api` → the backend (`vite.config.ts`). Production nginx uses the same `/api` shape.

## Prisma error codes

| Code      | Meaning                           | Fix                                                                                                                                                                                                                              |
| --------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1001** | Cannot reach the database         | Start Postgres (`docker compose -f docker-compose-pg.yml up -d`). Confirm `DATABASE_URL` / `DIRECT_URL` use host port **5435** and match compose credentials. Copy the same URL into `backend/.env`.                             |
| **P3009** | Failed migrations / migrate state | A migration genuinely failed against this database — read the migrate output. To rebuild a local DB from scratch, drop it, then `npx prisma db push --schema prisma/schema.prisma`, `npx prisma generate`, `npx prisma db seed`. |
| **P3018** | Migration failed to apply         | Same as P3009. The `0_init` baseline (**#646**) does build from empty — CI's `db-check` proves it on every run — so this points at local DB state or a new migration, not at the committed history.                              |

## Backend cannot see `DATABASE_URL`

Symptoms: Prisma errors on the first DB-backed API call, or `Environment variable not found: DATABASE_URL`.

1. Confirm `backend/.env` exists (`cp backend/.env.example backend/.env`).
2. Start with:

```bash
cd backend
node -r dotenv/config -r ts-node/register src/server.ts
```

Plain `npm run dev` in `backend/` does not load dotenv today. The HTTP server may still **listen** without `DATABASE_URL`; the failure often appears on the first database request.

## Unit tests vs full `npm test`

| Command             | Use when                                                                        |
| ------------------- | ------------------------------------------------------------------------------- |
| `npm run test:unit` | Everyday local gate (jsdom unit project)                                        |
| `npm test`          | Full Vitest including Storybook browser — needs Playwright; can hang on Windows |

Prefer `test:unit` unless you are working on Storybook browser tests.

## Ports

Tracked defaults: frontend **5173**, backend **3000**, Docker Postgres host **5435**. If another process already owns those ports, free them or remap **outside** this clone — do not edit tracked Vite/compose config just for local port conflicts.

## Related

- [`SETUP.md`](../../SETUP.md) — zero-to-running
- [`DEPLOYMENT.md`](../../DEPLOYMENT.md) — production
- [`docs/guides/parallel-agents.md`](parallel-agents.md) — multiple local clones
- [`docs/agents/rules/30-database.md`](../agents/rules/30-database.md) — schema / migrate rules for agents
