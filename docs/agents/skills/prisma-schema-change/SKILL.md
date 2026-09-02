---
name: prisma-schema-change
description: Change Prisma schema or migrations when models, indexes, or migration history must move with the code.
---

# Prisma schema change

Follow `docs/agents/rules/30-database.md`. Root schema is authoritative for deploys.

## Steps

1. Edit `prisma/schema.prisma` and keep `backend/prisma/schema.prisma` in sync.
2. Prefer additive, reviewable migrations on top of the `0_init` baseline (**#646**, landed). Do **not** rewrite applied history ad hoc.
3. Throwaway local scratch DB shortcut: `npx prisma db push --schema prisma/schema.prisma` → `npx prisma generate` → seed. `migrate deploy` also builds a fresh DB.
4. Run root and backend typecheck after client generate.
5. Never `db push` / `migrate reset` / migrate against non-local databases.

## Reminders

- CI `db-check` is required on `main` and green — a red `db-check` is a real migration failure on your PR.
- Docker Postgres tracked default host port is **5435**.
- Backend reads `backend/.env`; Prisma CLI often uses root `.env`.
