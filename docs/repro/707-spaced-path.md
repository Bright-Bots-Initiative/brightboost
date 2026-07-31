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
