# Security

> Canonical for: vulnerability reporting and secret-handling · Last verified: 2026-08-10

## Reporting a vulnerability

Do **not**   open a public GitHub issue for security reports.

Email the maintainers (pod leads / Nathaniel) via the private Slack channel used for
security, or open a private report with the GitHub Security Advisories flow for this
repository when enabled.

Include: impact, reproduction steps, and whether an exploit is known in the wild. Do not
include production secrets or real student data in the report body if you can avoid it.

## Never commit secrets

- Do **not** commit .env, .env.*, credentials, API keys, tokens, or session secrets.
- Prefer *.example templates with placeholder values only.
- A mechanical guard (
pm run agent:check, code AC-018) fails the build if a newly
  tracked .env* file is not allowlisted. Known tracked exceptions are allowlisted under
  issue **#754** (rotate and untrack — not remediated in this PR).
- Never paste real .env values into docs, fixtures, tests, commits, or PR descriptions.

See also [CONTRIBUTING.md](CONTRIBUTING.md) and [SETUP.md](SETUP.md).





const x=1
