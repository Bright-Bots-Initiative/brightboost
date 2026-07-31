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

## C3 — W-06 empty-suite guard (two-phase)

Guard: `scripts/verify-storybook-empty-suite.mjs` · npm script `verify:storybook-empty-suite`.
Storybook project sets `passWithNoTests: false` in `vitest.workspace.ts`.

Command: `npm run verify:storybook-empty-suite` → **GUARD_EXIT=0** (2026-07-31)

### C3-02 — Two-phase proof

| Phase      | What ran                                                                       | Result                                                                   |
| ---------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1 Healthy  | `BB_VITEST_PATH_HAS_SPACE=1 npm test -- --watch=false`                         | exit **0**; named skip line present                                      |
| 2 Sabotage | Empty `.storybook/main.ts` `stories: []`, force-include, `--project storybook` | exit **1**; `InvalidStoriesEntryError` (empty stories array) — not green |

Phase 1 excerpt:

```
[vitest.workspace] Skipping Storybook project (#707): checkout path contains a space (storybookjs/storybook#29572). Reason: path-conditional project skip.
PASS phase 1: exit 0 with named Storybook skip
```

Phase 2 excerpt:

```
SB_CORE-COMMON_0004 (InvalidStoriesEntryError): Storybook could not index your stories.
Your main configuration somehow does not contain a 'stories' field, or it resolved to an empty array.
PASS phase 2: empty collection exited non-zero (status=1)
```

`.storybook/main.ts` restored after sabotage (finally).

### C3-03 — Explicit skip vs silent collapse

| Mode                 | Observable                                                                                                   | Exit      |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | --------- | --------- | ------------- |
| **Explicit skip**    | Prints `[vitest.workspace] Skipping Storybook project (#707):… Reason: path-conditional project skip.`; no ` | storybook | ` project | 0 (unit only) |
| **Empty collection** | No skip marker; Storybook fails indexing empty `stories` / non-zero (cannot report green)                    | non-zero  |

Distinguishable — not the §15.2 row-11 proxy.

### C3-04 — Parity handoff (#740)

Do **not** edit `scripts/verify-parity.mjs` here. #740 must add `npm run verify:storybook-empty-suite` to `npm run verify` and the §15.3.2 parity table.
