# Database rules

- Two migration trees exist: `prisma/migrations/` (root) and `backend/prisma/migrations/`. **Root** schema/migrations are authoritative for deploys (`backend/scripts/predeploy.sh`, backend `db:*` prefer `../prisma/schema.prisma`).
- Keep `prisma/schema.prisma` and `backend/prisma/schema.prisma` in sync. Docker/backend generate from the **root** schema.
- The **#646** baseline landed (issue closed 2026-07-06). `prisma/migrations/0_init` creates every table from empty, and the two trees now hold the **same** migrations. Keep them identical; do not patch migration history ad hoc.
- Fresh-DB `prisma migrate deploy` works: CI `db-check` migrates an empty `postgres:15` on every run. `npx prisma db push --schema prisma/schema.prisma` → `generate` → seed remains a valid shortcut for throwaway scratch DBs, not a workaround.
- Never `db push`, `migrate reset`, or migrate against a non-local / production database.
- CI `db-check` is a **required** status check on `main` (`build-and-test`, `db-check`, `e2e-flows`) and has been green on every `main` push since 2026-08-26. A red `db-check` is a real failure — read it, do not wave it through.
- **#650** stays open for the production migration-history follow-up. `backend/scripts/predeploy.sh` now hard-fails a deploy when `migrate deploy` fails, instead of booting on a stale schema.
- Docker Postgres (tracked compose): host port **5435**.
- Backend does **not** read the root `.env`. Prisma CLI uses root; the running API needs `backend/.env`.
- `DATABASE_URL` and `DIRECT_URL` must match the Postgres you started. `SESSION_SECRET` is required for auth locally.
