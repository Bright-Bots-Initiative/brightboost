---
name: parallel-clones
description: Run two agents or keep a second local clone when work must stay isolated without sharing a dirty working tree.
---

# Parallel clones

Teach the **pattern** only. Repo `CONTRIBUTING.md` remains authoritative for branch naming.

## Pattern

1. Keep sibling clones under a **parent directory that is outside any git repo**.
2. Give each clone its own branch and working tree; do not share uncommitted edits across clones.
3. If ports collide, use a **contiguous local port band** for FE / API / Postgres. Treat any concrete band as an example for that machine — do not commit personal remap tables into this repository.
4. Some contributors use a fuller personal branch prefix scheme; follow whatever `CONTRIBUTING.md` and your team require.
5. Identity-check the process you think you hit (health endpoint / UI title) before trusting a bind on a familiar port.

## Do not

- Commit another project’s workspace name, personal branch prefixes as _the_ convention, or absolute machine paths into product docs.
- Edit tracked Vite / Compose / CORS defaults just to free a port on one laptop.
