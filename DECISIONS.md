# Project Decisions

## Supabase Configuration (2025-05-03)
- Fixed configuration by removing invalid 'id' key in [api] section
- Set up migrations folder structure
- Added sample migration template
- DB major version: 16
- **Note**: Current Supabase CLI (v2.22.11) doesn't support PostgreSQL 16 yet. For local development and testing with the CLI, temporarily set `major_version = 15` in config.toml. The remote database remains on version 16.

## Environment Variables
- Added .env.example with required Supabase variables
- Updated .gitignore to exclude .env files but include .env.example

## Authentication
- Supabase CLI requires authentication via `supabase login` or setting the `SUPABASE_ACCESS_TOKEN` environment variable for operations like `link` and `db pull`
- For CI/CD, GitHub Actions secrets need to be configured with `SUPABASE_DB_PASSWORD` and `SUPABASE_ACCESS_TOKEN`
