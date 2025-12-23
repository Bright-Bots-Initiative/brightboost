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
3.  Copy the **Connection String** (URI). Select "Transaction Mode" (port 6543) or "Session Mode" (port 5432).
    - _Note: For Prisma migrations (`migrate deploy`), use Session Mode (5432)._
    - _Note: For the application connection, you can use Transaction Mode (6543) if you use a connection pooler, otherwise stick to Session Mode._
    - Ensure `?sslmode=require` is appended to the connection string.

## 2. Backend (Railway)

1.  Create a new project on Railway.
2.  Deploy from GitHub repo.
3.  Configure the service:
    - **Root Directory**: `backend`
    - **Build Command**: `npm run build`
    - **Start Command**: `npm run start`
4.  Set Environment Variables:
    - `DATABASE_URL`: Paste the Supabase connection string (Session Mode recommended for simplicity, or Transaction Mode if you know how to configure Prisma for it).
    - `PORT`: `3000` (Railway usually injects its own PORT, but setting a default is safe).
    - `NODE_ENV`: `production`

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
