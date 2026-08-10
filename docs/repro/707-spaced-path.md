# #707 RED evidence — Storybook on a spaced path

Captured **before** any `vitest.workspace.ts` fix (A3-02 / A3-03).

| Field             | Value                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| Date              | 2026-07-31                                                               |
| Clone             | `brightboost-707`                                                        |
| Branch            | `jack/fix-707-storybook-spaced-path`                                     |
| Base SHA          | `6cc86a19`                                                               |
| Working path      | `D:/Programming Projects/Bright Bots/brightboost-707` (contains a space) |
| Command           | `npm test -- --watch=false`                                              |
| Process exit code | **1**                                                                    |

## Storybook project (defect under test)

Vitest registered the `storybook` project and attempted five story files. Each failed with Storybook/Vitest issue **#29572** (“No test suite found” when the workspace path contains spaces).

| Metric                               | Value                                    |
| ------------------------------------ | ---------------------------------------- |
| Storybook files attempted            | 5                                        |
| Storybook tests collected / executed | **0** (each file: “No test suite found”) |
| Storybook suites failed              | 5                                        |
| Overall process exit code            | 1                                        |

> Note: RED (`6cc86a19`, 110 files / 597 tests, 2026-07-31) and GREEN (`94ff89c`, 113 files / 661 tests,
> 2026-08-07) are **different tips**. The counts are not a like-for-like delta; the load-bearing evidence
> is the presence/absence of the `|storybook|` project and the exit code, not the totals.

Note: overview §1.1 described an empty suite reporting green. On this tip the Storybook project fails loudly (exit 1) with zero executable tests — still dishonest relative to CI (space-free paths run Storybook successfully), and still owned by the path-conditional skip in #707.

Unrelated to #707 (do not fix here): `backend/tests/security.test.ts` also failed (`@prisma/client` not generated — OQ-03).

## Verbatim Storybook failure output

```
 Vitest  No browser "instances" were defined for the "storybook" project. Running tests in "chromium" browser. The "browser.name" field is deprecated since Vitest 3. Read more: https://vitest.dev/guide/browser/config#browser-instances

 RUN  v3.2.4 D:/Programming Projects/Bright Bots/brightboost-707

⎯⎯⎯⎯⎯⎯ Failed Suites 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |storybook (chromium)| src/components/AvatarPicker.stories.tsx [ src/components/AvatarPicker.stories.tsx ]
Error: No test suite found in file D:/Programming Projects/Bright
Bots/brightboost-707/src/components/AvatarPicker.stories.tsx
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  |storybook (chromium)| src/stories/Button.stories.ts [ src/stories/Button.stories.ts ]
Error: No test suite found in file D:/Programming Projects/Bright Bots/brightboost-707/src/stories/Button.stories.ts
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  |storybook (chromium)| src/stories/Header.stories.ts [ src/stories/Header.stories.ts ]
Error: No test suite found in file D:/Programming Projects/Bright Bots/brightboost-707/src/stories/Header.stories.ts
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯

 FAIL  |storybook (chromium)| src/stories/Page.stories.ts [ src/stories/Page.stories.ts ]
Error: No test suite found in file D:/Programming Projects/Bright Bots/brightboost-707/src/stories/Page.stories.ts
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/6]⎯

 FAIL  |storybook (chromium)| src/pages/QuantumDemo.stories.tsx [ src/pages/QuantumDemo.stories.tsx ]
Error: No test suite found in file D:/Programming Projects/Bright
Bots/brightboost-707/src/pages/QuantumDemo.stories.tsx
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯

 FAIL  |unit| backend/tests/security.test.ts [ backend/tests/security.test.ts ]
Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.

 Test Files  6 failed | 97 passed | 7 skipped (110)
      Tests  577 passed | 20 skipped (597)
   Start at  02:47:37
   Duration  87.06s (transform 20.92s, setup 257.66s, collect 147.82s, tests 36.47s, environment 684.12s, prepare 123.79s)
```

EXIT_CODE=1

---

## C2 — Independent W-05 verification (after A3-04)

Captured independently of A3-02 on tip with the path-conditional skip already present. Method: `BB_VITEST_PATH_HAS_SPACE` override (same seam as A3-06). `npx prisma generate` run first so unit red from OQ-03 does not obscure Storybook results.

| Field        | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Date         | 2026-07-31                                                               |
| Tip SHA      | `7230890d` (fix commit present)                                          |
| Working path | `D:/Programming Projects/Bright Bots/brightboost-707` (contains a space) |

### C2-01 / C2-02 — Failing state (force-include Storybook)

Command: `$env:BB_VITEST_PATH_HAS_SPACE='0'; npm test -- --watch=false`

Storybook project re-registered on the spaced path and hit storybookjs/storybook#29572 again.

| Metric                               | Value                                    |
| ------------------------------------ | ---------------------------------------- |
| Storybook files attempted            | 5                                        |
| Storybook tests collected / executed | **0** (each file: “No test suite found”) |
| Storybook suites failed              | 5                                        |
| Process exit code                    | **1**                                    |

```
 FAIL  |storybook (chromium)| src/components/AvatarPicker.stories.tsx [ src/components/AvatarPicker.stories.tsx ]
Error: No test suite found in file D:/Programming Projects/Bright
Bots/brightboost-707/src/components/AvatarPicker.stories.tsx

 FAIL  |storybook (chromium)| src/pages/QuantumDemo.stories.tsx [ src/pages/QuantumDemo.stories.tsx ]
Error: No test suite found in file D:/Programming Projects/Bright
Bots/brightboost-707/src/pages/QuantumDemo.stories.tsx

 FAIL  |storybook (chromium)| src/stories/Button.stories.ts [ src/stories/Button.stories.ts ]
Error: No test suite found in file D:/Programming Projects/Bright Bots/brightboost-707/src/stories/Button.stories.ts

 FAIL  |storybook (chromium)| src/stories/Header.stories.ts [ src/stories/Header.stories.ts ]
Error: No test suite found in file D:/Programming Projects/Bright Bots/brightboost-707/src/stories/Header.stories.ts

 FAIL  |storybook (chromium)| src/stories/Page.stories.ts [ src/stories/Page.stories.ts ]
Error: No test suite found in file D:/Programming Projects/Bright Bots/brightboost-707/src/stories/Page.stories.ts

 Test Files  5 failed | 98 passed | 7 skipped (110)
      Tests  581 passed | 20 skipped (601)
```

EXIT_CODE=1

### C2-03 — Isolate space as the cause

Force-include on this spaced checkout reproduces #29572 (above). The include branch is therefore exercised; failure is path-space, not “Playwright / Chromium / Storybook config missing.” True space-free success remains CI’s checkout path (A3-06). No clone relocate used.

### C2-04 — Prove W-05 (explicit named skip)

Command: unset `BB_VITEST_PATH_HAS_SPACE`; `npm test -- --watch=false`

```
[vitest.workspace] Skipping Storybook project (#707): checkout path contains a space (storybookjs/storybook#29572). Reason: path-conditional project skip.

 Test Files  98 passed | 7 skipped (105)
      Tests  581 passed | 20 skipped (601)
```

EXIT_CODE=0

No `|storybook|` project in the run. W-05 satisfied via **explicit named skip**.

---

> ## ⚠️ RETRACTED — §C3 and §Q4-03 below are superseded (2026-08-10)
>
> The W-06 claim recorded below is **false**. Vitest evaluates `passWithNoTests` on the **aggregate**
> spec list using the **root** config (`cli-api`: `if (!files.length) { … this.config.passWithNoTests ? 0 : 1 }`).
> A project-level `passWithNoTests` is never consulted, and the branch is not entered at all when any
> sibling project contributes files.
>
> Consequently:
>
> - `passWithNoTests: false` on the Storybook project was **inert**. It has been removed.
> - Phase 2 exited non-zero because `--project storybook` made the _global_ file count zero — not because
>   of the fix. Re-running phase 2 with `passWithNoTests: false` deleted produces an **identical** exit 1.
> - The real property is **false**: a full `npm test` where `unit` collects tests and `storybook` collects
>   zero exits **0**. Verified on vitest 3.1.3 and 3.2.4.
>
> W-06 is therefore **not delivered by this PR** and moves in full to #749.
> §C2 (W-05, the path-conditional skip) and §Q4-02 (RED-before-fix ordering) are **unaffected and stand**.

## C3 — W-06 empty-suite guard (two-phase)

Guard: `scripts/verify-storybook-empty-suite.mjs` · npm script `verify:storybook-empty-suite`.
Storybook project sets `passWithNoTests: false` in `vitest.workspace.ts`.

Command: `npm run verify:storybook-empty-suite` → **GUARD_EXIT=0** (2026-07-31; sabotage rewritten to Vitest empty-collection path)

### C3-02 — Two-phase proof

| Phase      | What ran                                                                             | Result                                                              |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 1 Healthy  | `BB_VITEST_PATH_HAS_SPACE=1 npm test -- --watch=false`                               | exit **0**; named skip line present                                 |
| 2 Sabotage | Non-empty stories glob matching **zero** files; force-include; `--project storybook` | exit **1**; Vitest `No test files found` (`passWithNoTests: false`) |

Rejected proxy: `stories: []` → Storybook `InvalidStoriesEntryError` (never reaches Vitest). Guard fails if that appears.

Phase 1 excerpt:

```
[vitest.workspace] Skipping Storybook project (#707): checkout path contains a space (storybookjs/storybook#29572). Reason: path-conditional project skip.
PASS phase 1: exit 0 with named Storybook skip
```

Phase 2 excerpt:

```
WARN No story files found for the specified pattern: src\**\*.stories.__empty_collection__.@(ts|tsx)
No test files found, exiting with code 1
PASS phase 2: empty Vitest collection exited non-zero (status=1) with "No test files found"
```

`.storybook/main.ts` restored after sabotage (finally + exit/signal handlers).

### C3-03 — Explicit skip vs silent collapse

| Mode                        | Observable                                                                                     | Exit                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Explicit skip**           | Prints named skip reason; no storybook project                                                 | 0 (unit only)                          |
| **Empty Vitest collection** | No skip marker; Vitest prints `No test files found` (not Storybook `InvalidStoriesEntryError`) | non-zero when `passWithNoTests: false` |

Distinguishable — not the §15.2 row-11 proxy.

### C3-04 — Parity handoff (#740)

Do **not** edit `scripts/verify-parity.mjs` here. #740 PR #742 ships `npm run verify` / `verify-parity.mjs` but does **not** yet include `verify:storybook-empty-suite` (script lives on #707). Wire after merge/rebase: add step to STEPS + `package.json` when both land.

---

## Q4 — Independent QA (2026-07-31)

### Q4-02 — W-05 RED before fix (commit order)

| Commit | SHA                                        | Timestamp (−0700)   | Message                                                       |
| ------ | ------------------------------------------ | ------------------- | ------------------------------------------------------------- |
| RED    | `14ca9c143236b85eeb3bdbfca5438bcdb743f1c8` | 2026-07-31 02:50:25 | `docs(test): capture #707 Storybook spaced-path RED evidence` |
| Fix    | `7230890df8f6a391e07f86f2845f57c16626c8d5` | 2026-07-31 02:53:21 | `fix(test): skip Storybook Vitest project on spaced paths`    |

`git merge-base --is-ancestor 14ca9c14 7230890d` → **OK**. RED was captured before the fix.

### Q4-03 — W-06 independent re-run

Command: `npm run verify:storybook-empty-suite` → **GUARD_EXIT=0**

| Phase      | Result                                                                              |
| ---------- | ----------------------------------------------------------------------------------- |
| 1 Healthy  | exit 0; `[vitest.workspace] Skipping Storybook project (#707): …`                   |
| 2 Sabotage | exit 1; Vitest `No test files found`; no `InvalidStoriesEntryError`; no skip marker |

`.storybook/main.ts` clean after run. Skip vs collapse still distinguishable (C3-03).

### Q4-04 — A3-06 include branch (simulation)

Method: `BB_VITEST_PATH_HAS_SPACE=0` + `npm test -- --watch=false --project storybook` (no relocate).

- No named skip line
- `|storybook (chromium)|` registered — 5 files attempted, 0 tests (`#29572` on spaced path — expected)
- EXIT_CODE=1

True space-free Storybook green remains CI’s path (H-3).
