# Bright Boost — Local Setup (Zero to Running)

**This is the canonical setup guide.** Follow it top to bottom on a fresh clone and you'll
have the app running with passing unit tests. Works on **macOS** and **Windows** (notes call
out where they differ). If another doc disagrees with this one, this one wins.

> New here? You only need three terminals: one for Postgres (Docker), one for the backend API,
> one for the frontend. Total time on a clean machine: ~15 minutes.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | **20.x** | Match `.nvmrc` (`nvm use`). The repo pins Node 20; 18 is not supported. |
| npm | 10+ | Ships with Node 20. |
| Docker Desktop | latest | For local Postgres. Optional if you already have Postgres 15+ (see §4). |
| Git | any | — |

- **macOS:** install Node via [nvm](https://github.com/nvm-sh/nvm) (`nvm install 20 && nvm use`), Docker via Docker Desktop.
- **Windows:** install Node via [nvm-windows](https://github.com/coreybutler/nvm-windows) or the [Node 20 MSI](https://nodejs.org/). Install Docker Desktop (needs WSL2). Run the commands below in **PowerShell** or **Git Bash**.

---

## 2. Clone & Install

```bash
git clone https://github.com/BrightBotsInitiative/brightboost.git
cd brightboost

# Install root (frontend + Prisma + tooling) AND backend deps
npm install
cd backend && npm install && cd ..
```

`npm install` at the root also generates the Prisma client (both the root and backend copies)
from `prisma/schema.prisma`. If you ever see *"@prisma/client did not initialize"*, run
`npx prisma generate` from the repo root.

---

## 3. Environment Variables

There are **two** env files, in two places. This trips people up — read carefully.

### 3a. Root `.env` — used by Vite (frontend) and all `npx prisma …` commands

```bash
cp .env.example .env
```

The defaults in `.env.example` are correct for local Docker Postgres. Key values:

```env
VITE_API_BASE=/api                                                   # relative — Vite proxies /api -> backend
DATABASE_URL=postgresql://postgres:brightboostpass@localhost:5435/brightboost
DIRECT_URL=postgresql://postgres:brightboostpass@localhost:5435/brightboost
SESSION_SECRET=local-dev-secret
PORT=3000
```

### 3b. `backend/.env` — used by the backend API server at runtime

```bash
cp backend/.env.example backend/.env
```

**Why a second file?** The backend server does **not** read the root `.env`. The Prisma *CLI*
loads the root `.env` (so `prisma migrate/push/seed` from the root work), but the Express
server + Prisma *Client* read `process.env` directly with no `.env` loader. So the backend
gets its DB credentials from `backend/.env`, loaded via dotenv when you start it (see §5).

### ⚠️ Three gotchas

1. **`VITE_API_BASE` must be `/api`, not a bare host.** The backend serves *every* route under
   `/api`. If you set `VITE_API_BASE=http://localhost:3000` (no `/api`), module/avatar/progress
   calls 404 — but **login still works** (it hardcodes `/api`), which makes the failure look
   mysterious. `/api` is proxied to the backend by Vite (`vite.config.ts`) and matches production.
2. **`DATABASE_URL` must match `docker-compose-pg.yml`** — host port **5435** (not the default
   5432), user `postgres`, password `brightboostpass`, db `brightboost`. A placeholder/wrong host
   gives Prisma error **P1001**.
3. **`.env` precedence trap.** In dev, Vite loads `.env.development` *over* `.env`. If you change
   a `VITE_*` value in `.env` and it seems ignored, it's because `.env.development` (committed,
   already correct) takes priority. To override locally, use `.env.development.local` (gitignored).

---

## 4. Database

### 4a. Start Postgres (Docker — recommended)

```bash
docker compose -f docker-compose-pg.yml up -d
```

Postgres comes up on **localhost:5435** (user `postgres` / password `brightboostpass` / db `brightboost`).
Check it's healthy: `docker ps`.

**Direct-Postgres fallback (no Docker):** install Postgres 15+, create a `brightboost` database,
and point `DATABASE_URL` / `DIRECT_URL` (in both `.env` and `backend/.env`) at it. Everything else
is identical.

### 4b. Create the schema and seed

Run these **from the repo root** (the Prisma CLI reads the root `.env`):

```bash
npx prisma db push --schema prisma/schema.prisma   # creates all tables from the schema
npx prisma generate                                 # (re)generate the Prisma clients
npx prisma db seed                                  # demo accounts, modules, games
```

> ⚠️ **Do not use `npm run db:init` or `prisma migrate deploy` on a fresh database.** They fail
> partway (migration-baseline bug **#646**) and leave ~13 tables — including `Avatar` — never
> created, which then shows up as 500s/404s in the app. `prisma db push` builds the schema
> directly from `prisma/schema.prisma` and is the supported local path until #646 is fixed.
> (Production is unaffected: its deploy script falls back to `db push` automatically.)

Seeded demo accounts (passwords are refreshed on every seed run):

| Role | Email | Password |
|------|-------|----------|
| Teacher | `teacher@school.com` | `password123` |
| Student | `student@test.com` | `password` |
| Student (Set 1 done) | `explorer@test.com` | `explore123` |

(Full account list is in `CLAUDE.md`.) Class code for K‑2 emoji login: **STARS1**.

---

## 5. Run the App (two servers)

Local dev needs **both** the backend API and the frontend running. Use two terminals.

### Terminal 1 — Backend API (port 3000)

```bash
cd backend
node -r dotenv/config -r ts-node/register src/server.ts
```

This loads `backend/.env` (`-r dotenv/config`) and runs the TypeScript server via ts-node.
You should see `Server running on port 3000`.

> Plain `npm run dev` in `backend/` does **not** load `backend/.env` yet (it runs
> `ts-node src/server.ts` with no dotenv), so it can't find `DATABASE_URL`. Use the command
> above. (A follow-up will fold dotenv into `npm run dev` — see Troubleshooting / follow-ups.)

### Terminal 2 — Frontend (port 5173)

```bash
npm run dev
```

Open **http://localhost:5173**. The frontend calls `/api/*`, which Vite proxies to the backend
on :3000. Log in with a seeded account above.

---

## 6. Tests

```bash
npm run test:unit      # Vitest unit tests (jsdom) — fast, no browser
```

Use **`test:unit`**, not bare `npm test`. `npm test` (and bare `vitest run`) loads the Storybook
browser-test project, which requires **Playwright** and will prompt to download Chromium —
unnecessary for normal dev, and the install can hang on Windows. `test:unit` runs only the jsdom
**unit** project (`vitest run --project unit`), so it never initializes the Storybook browser
project and never needs Playwright — on any machine.

- **Type/lint:** `npm run lint`, `npm run typecheck`, and `cd backend && npm run typecheck`.
- **E2E (optional):** `npm run test:e2e` (Cypress) — needs both servers running and a browser.
  Only needed if you're working on end-to-end flows.
- **Playwright** is only for Storybook component tests and Cypress isn't Playwright — you do
  **not** need Playwright for a normal content/feature ticket.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| **"Failed to load modules" + `404` in console, but login worked** | `VITE_API_BASE` is a bare host (no `/api`). Login hardcodes `/api` so it masks the problem. | Set `VITE_API_BASE=/api` in `.env` (and don't forget `.env.development` precedence). Restart Vite. |
| **Prisma `P1001: Can't reach database server`** | Postgres not up, wrong host/port, or placeholder `DATABASE_URL`. | `docker compose -f docker-compose-pg.yml up -d`; confirm `DATABASE_URL` uses `localhost:5435` and matches the compose creds. |
| **`P3009` / `P3018` / migrate fails; Avatar or other tables missing** | Migration-baseline bug **#646** — `migrate deploy`/`db:init` can't apply from scratch. | Use `npx prisma db push --schema prisma/schema.prisma`, then `npx prisma generate` and `npx prisma db seed`. |
| **Backend can't find `DATABASE_URL` / `Environment variable not found`** | `npm run dev` in `backend/` doesn't load `backend/.env`. | Start it with `node -r dotenv/config -r ts-node/register src/server.ts` (and create `backend/.env`). |
| **`npx playwright install` hangs at extraction (Windows)** / `vitest` prompts to install Playwright | Bare `npm test` pulls in the Storybook browser project. | Run `npm run test:unit` instead. If you truly need it: `npx playwright install chromium`, clear `%LOCALAPPDATA%\ms-playwright`, retry as admin. |
| **Docker won't start / fights you** | Docker Desktop/WSL2 issues. | Use the direct-Postgres fallback (§4a). |
| **Editing `.env` has no effect** | `.env.development` overrides `.env` for `VITE_*` in dev. | Edit `.env.development`, or create `.env.development.local` (gitignored). |
| **`@prisma/client did not initialize`** | Client not generated. | `npx prisma generate` from the repo root. |

### macOS vs Windows quick notes
- **Paths:** use forward slashes in commands; Git Bash on Windows accepts them.
- **Docker:** Windows needs Docker Desktop + WSL2 enabled.
- **Playwright hang** is a Windows-specific issue — `test:unit` sidesteps it entirely.

---

## 8. Where things live (source-of-truth pointers)

- **Prisma schema (source of truth):** `prisma/schema.prisma` (backend copy `backend/prisma/schema.prisma` is kept in sync for Docker builds).
- **Backend routes:** `backend/src/routes/` (all mounted under `/api`).
- **Frontend API client:** `src/services/api.ts` (`resolveApiBase()`), `src/contexts/AuthContext.tsx`.
- **Vite dev proxy:** `vite.config.ts` (`/api` → `http://localhost:3000`).
- **Production deploy:** [DEPLOYMENT.md](DEPLOYMENT.md) (Railway + Supabase).
- **Project brief / conventions / full account list:** [CLAUDE.md](CLAUDE.md).
