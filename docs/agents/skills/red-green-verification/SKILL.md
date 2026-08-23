---
name: red-green-verification
description: Falsify a silent-logic guard or prove a check with Red-Green and two-phase evidence when verifying parsers, reconciles, dates, exits, or path handling.
---

# Red-Green verification

Use for **silent-logic** guards (parse, set reconcile, date/allowlist, exit mapping, path, idempotence). See `docs/agents/rules/10-testing.md`.

## Do not use for

- Documentation or thin adapter routers — write the files and confirm with `npm run agent:check`.
- Loud existence failures (missing file, oversized adapter) — one manual falsify pass is enough.

## Two-phase protocol

1. **Healthy:** run the check; confirm exit 0 / empty findings (or the healthy property).
2. **Break:** introduce the minimal fault; confirm the specific finding **code** (prefer `--json`).
3. **Restore:** undo the fault; confirm healthy again.

## Assert the property

| Proxy (avoid) | Assert instead                                       |
| ------------- | ---------------------------------------------------- |
| Non-zero exit | Exit **1** + code, or exit **2** for internal errors |
| File exists   | Pointer / bootstrap / parsed fields                  |
| Coverage %    | Targeted silent themes + loud manual list            |

## Commands

```bash
npm run agent:check
npm run agent:check -- --json
npx vitest run --project unit scripts/__tests__/agent-check.test.ts
```
