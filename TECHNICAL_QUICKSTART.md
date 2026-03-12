# BrightBoost Technical Quickstart

## Prerequisites

- Node.js 20+
- PostgreSQL (or Docker for the database)

## Environment Setup

Copy the example env file and adjust values:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/brightboost` |
| `DIRECT_URL` | Direct PostgreSQL URL (bypasses connection pooler) | Same as DATABASE_URL for local dev |
| `JWT_SECRET` | Secret for signing auth tokens | Any random string (32+ chars) |
| `VITE_API_BASE` | Frontend API base URL | `http://localhost:3000/api` (local dev) |

### Optional Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `FRONTEND_URL` | Used in password reset email links | `http://localhost:5173` |
| `SMTP_HOST` | SMTP server for real email delivery | *(none — console fallback)* |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | *(none)* |
| `SMTP_PASS` | SMTP password | *(none)* |
| `MAIL_FROM` | Sender address for outbound emails | `noreply@brightboost.app` |
| `FRONTEND_ORIGINS` | Comma-separated allowed CORS origins | *(see server.ts defaults)* |

## Local Development

### 1. Install dependencies

```bash
npm install
cd backend && npm install && cd ..
```

### 2. Start the database

Using Docker Compose:
```bash
docker compose up -d db
```

Or connect to an existing PostgreSQL instance via `DATABASE_URL`.

### 3. Run migrations and seed

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma db seed
```

This creates demo accounts:
- Teacher: `teacher@school.com` / `password123`
- Student: `student@test.com` / `password`

### 4. Generate Prisma client

```bash
npx prisma generate
```

This generates clients for both frontend and backend from the root schema.

### 5. Start the backend

```bash
cd backend
npm run dev
```

Runs on `http://localhost:3000`.

### 6. Start the frontend

```bash
npm run dev
```

Runs on `http://localhost:5173` (Vite default).

## Prisma Schema

**Source of truth: `prisma/schema.prisma`** (repo root).

This file contains dual generators that output Prisma clients to both `node_modules/@prisma/client` (frontend/root) and `backend/node_modules/.prisma/client` (backend). All `prisma generate`, `prisma migrate`, and `prisma db seed` commands should use this schema.

A secondary copy exists at `backend/prisma/schema.prisma` for Docker builds that use `backend/` as their build context. If you modify models, **edit the root schema first**, then sync the backend copy.

| Command | Run from | Notes |
|---------|----------|-------|
| `npx prisma generate` | repo root | Generates both clients |
| `npx prisma migrate deploy --schema prisma/schema.prisma` | repo root | Applies migrations |
| `npx prisma studio` | repo root | Opens database GUI |
| `npx prisma db seed` | repo root | Seeds demo data |

Migrations live in `prisma/migrations/` (root) and `backend/prisma/migrations/` (backend). The root set is the superset.

## Password Reset (Email Delivery)

The password reset flow uses a mail abstraction (`backend/src/utils/mail.ts`):

- **With SMTP configured** (`SMTP_HOST` set + `nodemailer` installed): sends real email.
- **Without SMTP in development**: logs the full reset URL to the backend console.
- **Without SMTP in production**: logs a warning (no token leaked).

To enable real email:
```bash
cd backend && npm install nodemailer @types/nodemailer
```
Then set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` in `.env`.

## Project Structure

```
brightboost/
  prisma/             # SOURCE OF TRUTH — schema, migrations, seed
  src/                # React frontend (Vite + TypeScript + Tailwind)
    pages/            # Route-level page components
    components/       # Shared UI components
    services/         # API client and service layers
    locales/          # i18n translation files (en, es)
    contexts/         # React contexts (auth)
  backend/
    src/              # Express API server
      routes/         # API route handlers
      utils/          # Auth, security, Prisma client, mail
    prisma/           # Secondary schema copy, backend-specific migrations
  public/             # Static assets and game builds
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express 5, Prisma 6, PostgreSQL, JWT auth
- **i18n**: react-i18next (English + Spanish)

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start frontend dev server |
| `cd backend && npm run dev` | Start backend dev server |
| `npx prisma generate` | Regenerate Prisma clients (both) |
| `npx prisma migrate deploy --schema prisma/schema.prisma` | Apply pending migrations |
| `npx prisma db seed` | Seed demo data |
| `npx prisma studio` | Open Prisma database GUI |
| `npm run typecheck` | Run TypeScript type checker (frontend) |
| `cd backend && npx tsc --noEmit` | Run TypeScript type checker (backend) |
| `npm test` | Run frontend tests |
