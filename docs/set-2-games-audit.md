# Set 2 Games — Existing Architecture Audit

## 1. Unity Game Structure on Disk

Four Unity projects exist at the repo root:
```
unity-bounce-buds/    → Pattern recognition (Breakout-style)
unity-rhyme-ride/     → Phonics (target clicking)
unity-gotcha-gears/   → Pattern matching (conveyor catching)
unity-spacewar/       → Arcade arena (standalone, not a curriculum activity)
```

Each follows standard Unity layout:
- `Assets/Scripts/` — C# game logic (GameManager, WebBridge, entity scripts)
- `Assets/Scenes/` — Unity scene files
- `Assets/Plugins/WebGL/WebBridge.jslib` — JS interop for WebGL
- `ProjectSettings/` — Unity config

## 2. WebGL Build Export + Embedding

Pre-built WebGL artifacts live in `public/games/{game-name}/Build/`:
- `{buildname}.loader.js` — Unity bootstrap
- `{buildname}.framework.js` — Unity runtime
- `{buildname}.wasm` — WebAssembly binary
- `{buildname}.data` — Game assets
- Brotli-compressed variants (`.br`) for production

The shared React component `src/components/unity/UnityWebGL.tsx`:
1. Dynamically loads the `.loader.js` script
2. Calls `window.createUnityInstance()` with build config
3. Shows loading progress bar with rotating fun messages
4. On load, calls `instance.SendMessage("WebBridge", "SetPlayerConfig", json)`
5. Handles focus/blur for keyboard capture
6. Shows "Game Not Available" fallback when builds are missing

## 3. How React Launches a Game Activity

`src/pages/ActivityPlayer.tsx` is the universal activity router:
1. Fetches activity data via `api.get(/modules/{slug})` by `activityId`
2. Parses `activity.content` as JSON
3. Routes by `activity.kind`:
   - `INFO` → Story slides + quiz questions
   - `INTERACT` → Dispatches by `content.gameKey`:
     - `sequence_drag_drop` → `SequenceDragDropGame` (pure React)
     - `rhyme_ride_unity` → `RhymeRideUnityActivity`
     - `bounce_buds_unity` → `BounceBudsUnityActivity`
     - `gotcha_gears_unity` → `GotchaGearsUnityActivity`

Each Unity wrapper:
- Generates a `sessionId` via `crypto.randomUUID()`
- Resolves localized text fields before sending to Unity
- Listens for `unity{GameName}Ready` and `unity{GameName}Complete` window events
- Sends config via `SendMessage("WebBridge", "InitFromJson", json)`
- Calls `onComplete(result)` which triggers `api.completeActivity()`

## 4. Completion / Progress Reporting

`POST /api/progress/complete-activity` accepts:
```json
{
  "moduleSlug": "k2-stem-rhyme-ride",
  "lessonId": "...",
  "activityId": "...",
  "timeSpentS": 120,
  "result": {
    "gameKey": "rhyme_ride_unity",
    "score": 5,
    "total": 7,
    "streakMax": 3,
    "roundsCompleted": 7
  }
}
```

Backend flow:
1. Validates via Zod (`completeActivitySchema`)
2. Upserts `Progress` record (status=COMPLETED, increments timeSpentS)
3. Awards XP based on `roundsCompleted`
4. Updates Avatar (level, xp, hp, energy)
5. Checks ability unlocks
6. Returns `{ reward: { xpDelta, levelDelta, energyDelta, hpDelta } }`

## 5. Data Fields Tracked

**Progress model**: studentId, moduleSlug, lessonId, activityId, status (IN_PROGRESS|COMPLETED), timeSpentS
**Result payload**: gameKey, score, total, streakMax, roundsCompleted
**Validation caps**: timeSpentS ≤ 86400, score/total ≤ 10000, roundsCompleted ≤ 1000

## 6. Localization

- `react-i18next` with `en` and `es` bundles in `src/locales/{lang}/common.json`
- `LocalizedField` type: `string | { en: string; es: string } | { i18nKey: string }`
- `resolveText(t, field)` utility resolves any of these forms
- Activity content uses `i18nKey` references for game round data
- Unity games receive pre-resolved strings; localization happens React-side

## 7. UI / Gamification Conventions

- Tailwind CSS with BrightBoost color palette (navy, blue, lightblue, yellow, green)
- Card/Button components from `@/components/ui/`
- `ActivityHeader` component for consistent activity page headers
- XP/level/avatar progression system
- Ability unlocks
- Toast notifications for completion
- Break-time interstitial every 3 completions

## 8. Shared Patterns New Games Must Follow

1. Activity content stored as JSON string in `Activity.content`
2. `gameKey` field dispatches to the correct React component
3. `onComplete(result)` callback triggers progress reporting
4. Localized fields use `LocalizedField` + `resolveText()`
5. Module → Unit → Lesson → Activity hierarchy in seed data
6. `ActivityKind.INTERACT` for games, `ActivityKind.INFO` for stories
7. Build artifacts served from `public/games/{name}/Build/`

## 9. Missing Abstractions to Create

1. **No shared game result type** — each wrapper defines its own result shape
2. **No shared mission briefing component** — stories use ActivityPlayer's INFO mode
3. **No shared reward/results screen** — completion is handled by ActivityPlayer toast
4. **No shared level/chapter data pattern** — each game defines ad-hoc round arrays
5. **No shared localization table for game content** — embedded in i18n JSON
6. **No build/export documentation** — tribal knowledge
7. **Pure React games (SequenceDragDropGame) are an underused pattern** — immediately playable without Unity Editor, good for rapid iteration
