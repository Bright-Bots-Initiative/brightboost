> **Canonical for:** zero-to-running setup. Last verified against code: 2026-08-10.

# Bright Boost — Local Setup (Zero to Running)

Follow this guide top to bottom on a fresh clone. You will have the app running with passing unit tests. Works on **macOS** and **Windows** (notes call out where they differ). If another doc disagrees with this one, this one wins.

> You need three terminals: one for Postgres (Docker), one for the backend API, one for the frontend. On a clean machine budget about 15 minutes.

Deep-dive troubleshooting lives in [`docs/guides/local-dev.md`](docs/guides/local-dev.md). This file stays the only path you must follow to get running.

---

## 1. Prerequisites

| Tool           | Version  | Notes                                                                   |
| -------------- | -------- | ----------------------------------------------------------------------- |
| Node.js        | **20.x** | Match `.nvmrc` (`nvm use`). The repo pins Node 20; 18 is not supported. |
| npm            | 10+      | Ships with Node 20. CI runs `npm ci`.                                   |
| Docker Desktop | latest   | For local Postgres. Optional if you already have Postgres 15+ (see §4). |
| Git            | any      | —                                                                       |

### OS install notes

| OS      | Node                                                                                            | Docker                             | Shell                  |
| ------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------- |
| macOS   | [nvm](https://github.com/nvm-sh/nvm) (`nvm install 20 && nvm use`)                              | Docker Desktop                     | zsh / bash             |
| Windows | [nvm-windows](https://github.com/coreybutler/nvm-windows) or [Node 20 MSI](https://nodejs.org/) | Docker Desktop (**WSL2 required**) | PowerShell or Git Bash |

### OS gotchas (read once)

| Gotcha                                         | What to do                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Docker on Windows needs WSL2                   | Enable WSL2 before Docker Desktop; if Docker fights you, use the direct-Postgres fallback in §4a. |
| Path with spaces (issue **#707**)              | Quote every path in scripts and shells. Prefer cloning into a path without spaces when you can.   |
| PowerShell blocks `.ps1`                       | `powershell -ExecutionPolicy Bypass -File path\to\script.ps1`                                     |
| `npm test` hangs / wants Playwright on Windows | Use `npm run test:unit` only (see §6).                                                            |
| Backend missing `DATABASE_URL`                 | You skipped `backend/.env` or started with plain `npm run dev` in `backend/` — see §3b and §5.    |

---

## 2. Clone & Install

```bash
git clone https://github.com/BrightBotsInitiative/brightboost.git
cd brightboost

# Install root (frontend + Prisma + tooling) AND backend deps
npm install
cd backend && npm install && cd ..
```

`npm install` at the root also generates the Prisma client (root and backend copies) from `prisma/schema.prisma`. If you see _"@prisma/client did not initialize"_, run `npx prisma generate` from the repo root.

---

## 3. Environment Variables

There are **two** env files. This trips people up.

### 3a. Root `.env` — Vite (frontend) and all `npx prisma …` commands

```bash
cp .env.example .env
```

Defaults in `.env.example` match local Docker Postgres:

```env
VITE_API_BASE=/api
DATABASE_URL=postgresql://postgres:brightboostpass@localhost:5435/brightboost
DIRECT_URL=postgresql://postgres:brightboostpass@localhost:5435/brightboost
SESSION_SECRET=local-dev-secret
PORT=3000
```

Optional (password-reset email, CORS): `FRONTEND_URL`, `SMTP_*`, `MAIL_FROM`, `FRONTEND_ORIGINS` — see `.env.example`.

### 3b. `backend/.env` — backend API at runtime

```bash
cp backend/.env.example backend/.env
```

**Why a second file?** The backend does **not** read the root `.env`. The Prisma CLI loads the root `.env` (so `prisma` from the root works), but the Express server reads `process.env` via dotenv when started as in §5 — from `backend/.env`.

### Three gotchas

1. **`VITE_API_BASE` must be `/api`, not a bare host.** Routes live under `/api`. A bare `http://localhost:3000` makes module/avatar calls 404 while login still works (it hardcodes `/api`).
2. **`DATABASE_URL` must match `docker-compose-pg.yml`** — host port **5435**, user `postgres`, password `brightboostpass`, db `brightboost`. Wrong host → Prisma **P1001**.
3. **`.env` precedence.** In dev, Vite loads `.env.development` over `.env` for `VITE_*`. Override locally with `.env.development.local` (gitignored).

---

## 4. Database

### 4a. Start Postgres (Docker — recommended)

```bash
docker compose -f docker-compose-pg.yml up -d
```

Postgres: **localhost:5435** (`postgres` / `brightboostpass` / `brightboost`). Check with `docker ps`.

**Direct-Postgres fallback (no Docker):** install Postgres 15+, create a `brightboost` database, and point `DATABASE_URL` / `DIRECT_URL` in **both** `.env` and `backend/.env` at it.

### 4b. Create the schema and seed

From the **repo root** (Prisma CLI reads root `.env`):

```bash
npx prisma db push --schema prisma/schema.prisma
npx prisma generate
npx prisma db seed
```

> **Do not use `npm run db:init` or `prisma migrate deploy` on a fresh local database.** They fail partway (migration-baseline bug **#646**) and leave tables missing. `prisma db push` is the supported local path until #646 is fixed. Production deploy uses migrate via predeploy — see [`DEPLOYMENT.md`](DEPLOYMENT.md).

Seeded demo logins (hashes refresh every seed). Short list:

| Role                 | Email                | Password      |
| -------------------- | -------------------- | ------------- |
| Teacher              | `teacher@school.com` | `password123` |
| Student              | `student@test.com`   | `password`    |
| Student (Set 1 done) | `explorer@test.com`  | `explore123`  |

Full list: [`docs/pilot/demo-accounts.md`](docs/pilot/demo-accounts.md). K-2 class code: **STARS1**.

---

## 5. Run the App (two servers)

### Terminal 1 — Backend API (port 3000)

```bash
cd backend
node -r dotenv/config -r ts-node/register src/server.ts
```

You should see `Server running on port 3000`.

> Plain `npm run dev` in `backend/` does **not** load `backend/.env` (no dotenv), so it cannot find `DATABASE_URL`. Use the command above.

### Terminal 2 — Frontend (port 5173)

```bash
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` → `http://localhost:3000`.

If another project already owns the default ports on your machine, stop those processes or run this app on a free contiguous band — keep any remap outside the product clone (do not edit tracked Vite/compose ports for local convenience).

---

## 6. Tests

```bash
npm run test:unit
```

Use **`test:unit`**, not bare `npm test`. `npm test` loads the Storybook browser project (Playwright) and can hang on Windows. `test:unit` is the jsdom unit project only.

- Lint/typecheck: `npm run lint`, `npm run typecheck`, `cd backend && npm run typecheck`.
- Local–CI parity gate: `npm run verify` (see [`docs/agents/rules/60-verification.md`](docs/agents/rules/60-verification.md)).
- E2E (optional): `npm run test:e2e` — needs both servers and a browser.

---

## 7. Troubleshooting

| Symptom                                 | Cause                                         | Fix                                                                                                 |
| --------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Modules 404 but login works             | `VITE_API_BASE` missing `/api`                | Set `VITE_API_BASE=/api`; restart Vite. See [`docs/guides/local-dev.md`](docs/guides/local-dev.md). |
| Prisma `P1001`                          | Postgres down / wrong URL                     | `docker compose -f docker-compose-pg.yml up -d`; fix `DATABASE_URL`.                                |
| `P3009` / `P3018` / missing tables      | `#646` migrate path                           | `npx prisma db push --schema prisma/schema.prisma` then generate + seed.                            |
| Backend `DATABASE_URL` not found        | Missing `backend/.env` or plain `npm run dev` | Copy `backend/.env.example` → `backend/.env`; start with the §5 dotenv command.                     |
| Playwright hang / Vitest wants Chromium | Bare `npm test`                               | `npm run test:unit`.                                                                                |
| Docker / WSL2 pain                      | Docker Desktop                                | Direct-Postgres fallback (§4a).                                                                     |
| Editing `.env` ignored                  | `.env.development` wins for `VITE_*`          | Edit `.env.development` or `.env.development.local`.                                                |
| `@prisma/client did not initialize`     | Client not generated                          | `npx prisma generate` from repo root.                                                               |

More detail: [`docs/guides/local-dev.md`](docs/guides/local-dev.md).

---

## 8. Where things live

- **Prisma schema:** `prisma/schema.prisma` (backend copy kept in sync for Docker builds).
- **Backend routes:** `backend/src/routes/` (under `/api`).
- **Frontend API:** `src/services/api.ts`, `src/contexts/AuthContext.tsx`.
- **Vite proxy:** `vite.config.ts` (`/api` → `http://localhost:3000`).
- **Deploy:** [`DEPLOYMENT.md`](DEPLOYMENT.md).
- **Docs map:** [`docs/README.md`](docs/README.md).
- **Demo accounts:** [`docs/pilot/demo-accounts.md`](docs/pilot/demo-accounts.md).
- **Agent bootstrap:** [`docs/agents/agent.md`](docs/agents/agent.md).
