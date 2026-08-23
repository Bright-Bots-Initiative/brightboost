> **Canonical for:** running multiple local clones in parallel. Last verified against code: 2026-08-10.

# Parallel agents / multiple clones

Use this when two agents (or two humans) need isolated working trees without sharing a dirty checkout.

For agent-facing procedure, also see the skill [`docs/agents/skills/parallel-clones/SKILL.md`](../agents/skills/parallel-clones/SKILL.md).

## Pattern

1. Keep a **parent directory** that holds sibling clones. That parent is outside any single git repo.
2. Clone the product repo once per parallel stream (separate directories, separate branches).
3. Give each clone its **own** Postgres data (or container) and its **own** free port band for frontend, backend, and database host port.
4. Keep the port assignment in **one file outside the clones** (notes, sheet, or local script you do not commit into the product repo).
5. Do **not** edit tracked `vite.config`, Docker Compose, or CORS defaults inside a clone just to free ports.

## Example port band (example only)

These numbers are an **example**, not a required mapping for this repository:

| Role          | Example ports |
| ------------- | ------------- |
| Frontend      | `82x7`        |
| Backend       | `82x8`        |
| Postgres host | `82x9`        |

Pick any contiguous free band on your machine. Identity-check health endpoints on the ports you actually started — a `200` on someone else's default port is not your app.

## Branches

Follow [`CONTRIBUTING.md`](../../CONTRIBUTING.md): `your-name/short-description`. Some contributors use a fuller scheme that embeds ticket type and id; that is optional.

## Ticket planning

Ticket planning and manual walkthrough packages often live **outside** the product repo (sibling folders next to clones). Do not invent a second planning tree inside the app unless your team already stores it there.

## Database caution

Never point two clones at the same database if they will migrate or seed differently. Prefer one Postgres instance (or container) per clone. Never `migrate reset` / `db push` against a non-local database.

## Related

- [`SETUP.md`](../../SETUP.md) — single-clone zero-to-running
- [`docs/guides/local-dev.md`](local-dev.md) — env and Prisma troubleshooting
- [`docs/agents/skills/parallel-clones/SKILL.md`](../agents/skills/parallel-clones/SKILL.md)
