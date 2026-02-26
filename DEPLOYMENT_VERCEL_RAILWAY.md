# Deployment: Vercel (FE) + Railway (BE) + Supabase (DB)

This guide provides instructions for deploying the BrightBoost application stack.

## Architecture

- **Frontend**: React (Vite) hosted on Vercel.
- **Backend**: Node.js (Express) hosted on Railway.
- **Database**: PostgreSQL hosted on Supabase.

## Prerequisites

- Accounts on [Vercel](https://vercel.com), [Railway](https://railway.app), and [Supabase](https://supabase.com).
- GitHub repository with the codebase.

## 1. Database (Supabase)

1.  Create a new project on Supabase.
2.  Go to **Project Settings** -> **Database**.
3.  Copy **two** connection strings from **Project Settings → Database → Connection String**:
    - **Transaction Mode (port 6543)** → used as `DATABASE_URL` (runtime queries via pooler).
    - **Session Mode (port 5432)** → used as `DIRECT_URL` (Prisma migrations, which require a direct/session connection).
    - Ensure both strings end with `?sslmode=require`.
    - _Note: if the direct host `db.<ref>.supabase.co:5432` is blocked by your hosting provider, use the **pooler Session** string (`<ref>.pooler.supabase.com:5432`) as `DIRECT_URL` instead._

## 2. Backend (Railway)

1.  Create a new project on Railway.
2.  Deploy from GitHub repo.
3.  Configure the service:
    - **Root Directory**: `backend`
    - **Build Command**: `npm run build`
    - **Start Command**: `npm run start`
4.  Set Environment Variables:
    - `DATABASE_URL`: Supabase **Transaction Mode** connection string (port 6543). Used by the app at runtime.
    - `DIRECT_URL`: Supabase **Session Mode** connection string (port 5432). Used by Prisma Migrate during predeploy.
    - `PORT`: `3000` (Railway usually injects its own PORT, but setting a default is safe).
    - `NODE_ENV`: `production`
    - _For local dev, `DIRECT_URL` can equal `DATABASE_URL` (both point at your local Postgres)._

## 3. Frontend (Vercel)

1.  Create a new project on Vercel.
2.  Import the GitHub repo.
3.  Configure the project:
    - **Framework Preset**: Vite
    - **Root Directory**: `.` (default)
    - **Build Command**: `npm run build`
    - **Output Directory**: `dist`
4.  Set Environment Variables:
    - `VITE_AWS_API_URL`: The URL of your deployed Railway backend (e.g., `https://brightboost-backend.up.railway.app`). **Important:** Do not add a trailing slash.

## 4. Database Initialization

After deploying, you need to initialize the database schema and seed it.

1.  Locally, create a `.env` file in the root directory with:
    ```
    DATABASE_URL="your-supabase-connection-string"
    ```
2.  Run the initialization command:

    ```bash
    npm run db:init
    ```

    This will run `prisma migrate deploy` and `prisma db seed`.

    _Alternatively, you can run these commands manually:_

    ```bash
    npx prisma migrate deploy --schema prisma/schema.prisma
    npx prisma db seed
    ```

## Troubleshooting

- **Prisma Errors**: Ensure your `DATABASE_URL` is correct and the database is reachable. If you see connection limit errors, consider using the Supabase Transaction pooler (port 6543) for the app, but keep using Session pooler (port 5432) for migrations.
- **CORS Issues**: If the frontend cannot talk to the backend, check the browser console. You might need to configure CORS in `backend/src/server.ts` to accept requests from your Vercel domain.
