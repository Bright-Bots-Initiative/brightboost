# Set 2 Games — Implementation Summary

## Architecture Decision

Both games are implemented as **pure React components** following the existing `SequenceDragDropGame` pattern. This is the same approach used by the first curriculum game in the repo and provides:

- Immediate playability without Unity Editor builds
- Zero external dependencies beyond the existing React stack
- Full touch + mouse + keyboard support
- Instant loading (no WebGL boot time)
- Easy iteration and hot-reload during development

The games can optionally be upgraded to Unity WebGL builds later using the same `UnityWebGL.tsx` integration bridge.

## Shared Infrastructure Created

### `src/components/games/shared/GameShell.tsx`
Reusable wrapper for all BrightBoost mini-games providing:
- **Mission briefing screen** — story text, icon, tips, start button
- **Results/reward screen** — star rating, score, accuracy, achievements, play-again
- **Star rating calculation** — configurable thresholds (default: 30%/60%/90%)
- **GameResult type** — standardized result payload with extended fields

### GameResult Payload
Every game reports:
```typescript
{
  gameKey, score, total, streakMax, roundsCompleted,
  starsEarned, accuracy, levelReached, hintsUsed,
  firstTryClear, achievements, gameSpecific
}
```

This maps directly to the existing `completeActivitySchema` validation (score, total, streakMax, roundsCompleted) while also carrying richer data for future analytics.

## Game 1: Tank Trek

**File**: `src/components/games/TankTrekGame.tsx`
**Game key**: `tank_trek`
**Module slug**: `k2-stem-tank-trek`

### Gameplay
- Child sees a grid-based maze with a robot, walls, collectibles, and a goal
- Child builds a command queue (Forward, Turn Left, Turn Right)
- Robot executes the plan step by step with animation
- Reaching the goal earns stars; collecting data chips earns bonuses
- Fewer commands = more stars (par-based scoring)

### Progression
- **Chapter 1**: Simple paths (3 levels) — teaches basic sequencing
- **Chapter 2**: Obstacles & collectibles (3 levels) — teaches planning ahead
- **Chapter 3**: Pattern thinking (2 levels) — teaches efficiency and patterns
- 8 total built-in levels with difficulty ramp

### Features
- 3-star per-level rating based on command efficiency
- Data chip collectibles
- Hint system
- Retry without penalty
- Bilingual story snippets and hints per level
- Command queue visualization
- Step-by-step robot animation
- Achievements: First Try Fixer, Chip Collector, Maze Master

## Game 2: Quantum Quest

**File**: `src/components/games/QuantumQuestGame.tsx`
**Game key**: `quantum_quest`
**Module slug**: `k2-stem-quantum-quest`

### Gameplay
- Math problem displayed as HUD prompt
- Answer targets float around a space-themed field
- Child taps the correct answer target
- Correct = streak bonus points; wrong = lose a life
- 3 lives per run, bonus life between sectors

### Progression
- **Sector 1**: Star Counting (5 problems) — counting and comparison
- **Sector 2**: Addition Nebula (6 problems) — basic addition
- **Sector 3**: Quantum Challenges (7 problems) — mixed math with patterns
- 18 total built-in problems across 3 sectors

### Features
- Animated floating targets with bounce physics
- Streak/combo multiplier with visual feedback
- Lives system with hearts display
- Sector-based progression with story beats
- Bilingual prompts
- Achievements: Sharp Scanner, Perfect Orbit, Quantum Explorer

## Integration

### ActivityPlayer Dispatch
Both games are registered in `src/pages/ActivityPlayer.tsx`:
```typescript
if (key === "tank_trek") → <TankTrekGame config={content} onComplete={handleComplete} />
if (key === "quantum_quest") → <QuantumQuestGame config={content} onComplete={handleComplete} />
```

### Seed Data
Both games have full module → unit → lesson → activity chains in `backend/prisma/seed.cjs`:
- Module 4: Tank Trek (`k2-stem-tank-trek`)
- Module 5: Quantum Quest (`k2-stem-quantum-quest`)
- Each has a story (INFO) activity and a game (INTERACT) activity
- Game activities use `gameKey` dispatch with empty config (built-in levels used as default)

### Localization
- i18n keys added in both `en/common.json` and `es/common.json` under `games.tankTrek.*`, `games.quantumQuest.*`, and `games.shared.*`
- Game content (level names, story snippets, math prompts) includes inline `Es` variants
- `resolvedLanguage` used for language detection

### Completion Flow
Both games follow the identical completion path:
1. Game calls `onFinish(GameResult)` → GameShell shows results screen
2. User clicks "Finish" → GameShell calls `onComplete(result)`
3. ActivityPlayer calls `api.completeActivity()` with the result
4. Backend awards XP based on `roundsCompleted`, updates progress

## Build/Export Checklist for Future Games

1. Create game component in `src/components/games/`
2. Wrap with `GameShell` for briefing + results screens
3. Export `GameResult` payload in `onFinish` callback
4. Add `gameKey` dispatch case in `ActivityPlayer.tsx`
5. Add i18n keys in both `en/common.json` and `es/common.json`
6. Add module/unit/lesson/activity seed data in `seed.cjs`
7. Run `node -c backend/prisma/seed.cjs` + `npx tsc --noEmit`
8. Test: launch from module list → story → game → completion → XP award

## Files Created/Modified

### New Files
- `docs/set-2-games-audit.md` — Architecture audit
- `docs/set-2-games-implementation.md` — This document
- `src/components/games/shared/GameShell.tsx` — Shared game wrapper
- `src/components/games/TankTrekGame.tsx` — Tank Trek game
- `src/components/games/QuantumQuestGame.tsx` — Quantum Quest game

### Modified Files
- `src/pages/ActivityPlayer.tsx` — Added import + dispatch for both games
- `src/locales/en/common.json` — Added `games.*` i18n keys
- `src/locales/es/common.json` — Added Spanish translations
- `backend/prisma/seed.cjs` — Added Module 4 + 5 seed data
