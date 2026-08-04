# Bright Boost Test Credentials

Use these accounts to explore and test the platform during development.

All accounts are seeded in `prisma/seed.cjs` with bcrypt-hashed passwords. The seed runs on every Railway deploy and **refreshes every password on each run** — if login stops working, check Railway deploy logs for seed output.

## App URLs

- **Production app:** https://fe-production-3552.up.railway.app
- **Public site:** https://brightboost.org

## Teacher Account

| Email | Password | Notes |
|---|---|---|
| `teacher@school.com` | `password123` | Ms. Frizzle — demo class owner, K-2 class with join code `STARS1` |

## K-2 Student Accounts

| Email | Password | Notes |
|---|---|---|
| `student@test.com` | `password` | Fresh K-2 student, Set 1 incomplete |
| `explorer@test.com` | `explore123` | Set 1 complete, Set 2 unlocked |

**Class code (emoji-picker flow):** `STARS1` — enter under "I'm a Student" → "Join with a Code", then pick your emoji to log in without a password. Seeded class **"Ms. Frizzle's Star Class"** (band k2) with three emoji students, no PIN: **Nova ⭐ · Comet 🚀 · Luna 🌙**.

## Grade 3-5 Student Account

| Email | Password | Notes |
|---|---|---|
| `jordan@test.com` | `jordan123` | Enrolled in a g3_5 class — sees Data Dash and other 3-5 content |

## Pathways Accounts (Ages 14-17)

| Email | Password | Notes |
|---|---|---|
| `facilitator@test.com` | `pathway123` | Coach Davis — facilitator/program manager for the ETO Spring 2026 cohort |
| `marcus@test.com` | `marcus123` | Launch band (16-17), partial Cyber Launch progress (3/7 modules done) |
| `aisha@test.com` | `aisha123` | Explorer band (14-15), fresh account, 0 completions |

**Cohort join code:** `ETO2026` — for the "ETO Spring 2026 — Cyber Cohort"

## Notes

- All passwords above are the **plaintext values to type in the login form**. The seed stores bcrypt hashes.
- The seed is idempotent: it uses find-or-create + always-refresh-password, so re-running the seed never duplicates accounts but always fixes drifted passwords.
- If you need to add a new account for development, add it to `prisma/seed.cjs` **and** `backend/prisma/seed.cjs` (they must stay in sync — see CLAUDE.md "Schema Sync Warning").

## Accounts that came up in older docs but aren't seeded

These appeared in earlier prompts but are **not** in the current seed. Don't use them — they will fail login:

- `demo_teacher@brightboost.com` / `BrightBoost1`
- `prod-parent@test.com` / `password`

Use the seeded accounts above instead.
