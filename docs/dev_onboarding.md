# Developer Onboarding Guide

Welcome to the Bright Bots Initiative development team! This guide will help you set up your development environment and understand the workflow.

## Prerequisites

- Node.js (v18+)
- npm (v8+)
- Git

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Bright-Bots-Initiative/brightboost.git
   cd brightboost
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with the correct values for your development environment. You'll need:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE`
   - `SUPABASE_DB_PASSWORD`

4. Working with Supabase:
   
   **Pulling database schema from remote:**
   ```bash
   export SUPABASE_DB_PASSWORD=your-password-here
   npx supabase db pull
   ```
   This will generate SQL migration files in the `supabase/migrations` folder.
   
   **Pushing local changes to remote:**
   ```bash
   export SUPABASE_DB_PASSWORD=your-password-here
   npx supabase db push
   ```
   
   **Checking Supabase status:**
   ```bash
   export SUPABASE_DB_PASSWORD=your-password-here
   npx supabase status
   ```

5. (Optional) Running local Supabase stack:
   If you have Docker Desktop installed, you can run a local Supabase instance:
   ```bash
   npx supabase start
   ```
   This will start all Supabase services locally.

## Development Workflow

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and regularly commit:
   ```bash
   git add <changed-files>
   git commit -m "Description of changes"
   ```

3. Before pushing, make sure your changes don't break anything:
   ```bash
   npm run lint
   ```

4. Push your changes and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```
   Then go to GitHub and create a pull request.

5. CI will automatically check if your changes affect the Supabase configuration or migrations.

## Important Notes

- Never commit sensitive information like passwords or API keys
- Always keep the `supabase/migrations` folder in sync with the remote database
- If you make schema changes, always run `npx supabase db pull` to update migrations
