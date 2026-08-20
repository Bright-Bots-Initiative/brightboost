# Database rules

- Two migration trees exist: `prisma/migrations/` (root) and `backend/prisma/migrations/`. **Root** schema/migrations are authoritative for deploys (`backend/scripts/predeploy.sh`, backend `db:*` prefer `../prisma/schema.prisma`).
- Keep `prisma/schema.prisma` and `backend/prisma/schema.prisma` in sync. Docker/backend generate from the **root** schema.
- Trees are **diverged** pending **#646**. Do not patch migration history ad hoc.
- Fresh-DB `migrate deploy` / `migrate dev` can fail until #646. Prefer `npx prisma db push --schema prisma/schema.prisma` → `generate` → seed for local scratch DBs when migrate history cannot apply.
- Never `db push`, `migrate reset`, or migrate against a non-local / production database.
- CI `db-check` is expected **red** until #646. Do not make it a required check; do not treat it as a signal about unrelated PRs.
- Docker Postgres (tracked compose): host port **5435**.
- Backend does **not** read the root `.env`. Prisma CLI uses root; the running API needs `backend/.env`.
- `DATABASE_URL` and `DIRECT_URL` must match the Postgres you started. `SESSION_SECRET` is required for auth locally.
