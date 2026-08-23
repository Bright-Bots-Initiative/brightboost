---
name: prisma-schema-change
description: Change Prisma schema or migrations when models, indexes, or migration history must move with the code.
---

# Prisma schema change

Follow `docs/agents/rules/30-database.md`. Root schema is authoritative for deploys.

## Steps

1. Edit `prisma/schema.prisma` and keep `backend/prisma/schema.prisma` in sync.
2. Prefer additive, reviewable migrations. Do **not** rewrite broken history ad hoc — that is **#646**.
3. Local scratch DB when migrate history cannot apply: `npx prisma db push --schema prisma/schema.prisma` → `npx prisma generate` → seed.
4. Run root and backend typecheck after client generate.
5. Never `db push` / `migrate reset` / migrate against non-local databases.

## Reminders

- CI `db-check` stays red until #646 — not a signal about unrelated PRs.
- Docker Postgres tracked default host port is **5435**.
- Backend reads `backend/.env`; Prisma CLI often uses root `.env`.
