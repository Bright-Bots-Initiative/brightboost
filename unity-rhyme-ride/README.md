# Rhyme & Ride - Unity WebGL Minigame

A K-2 reading/rhyming minigame built with Unity for BrightBoost. Gotcha-style gameplay where word targets move horizontally across lanes.

## Quick Start (Zero Manual Work)

1. Open Unity Hub and open the `unity-rhyme-ride` project
2. In Unity Editor, go to **Tools → BrightBoost → Rhyme & Ride → Generate + Build WebGL (One Click)**
3. Done! The build is output directly to `public/games/rhyme-ride/Build/` with correct filenames.

## Menu Commands

| Menu Path | Description |
|-----------|-------------|
| `Tools/BrightBoost/Rhyme & Ride/Generate Scene` | Creates scene, prefabs, and wires all references |
| `Tools/BrightBoost/Rhyme & Ride/Build WebGL (One Click)` | Builds WebGL (requires scene to exist) |
| `Tools/BrightBoost/Rhyme & Ride/Generate + Build WebGL (One Click)` | Does both in one step |

## Batch/CI Build

For automated builds, use the batchmode entry point:

**Windows:**
```batch
"C:\Program Files\Unity\Hub\Editor\2022.3.x\Editor\Unity.exe" ^
  -batchmode -quit ^
  -projectPath unity-rhyme-ride ^
  -executeMethod BrightBoost.RhymeRideBuildTools.BuildWebGL_CI
```

**macOS/Linux:**
```bash
/Applications/Unity/Hub/Editor/2022.3.x/Unity.app/Contents/MacOS/Unity \
  -batchmode -quit \
  -projectPath unity-rhyme-ride \
  -executeMethod BrightBoost.RhymeRideBuildTools.BuildWebGL_CI
```

## Game Design

### Gameplay
- **Gotcha-style**: Word targets scroll horizontally from left to right
- **3 Lanes**: Targets appear in one of three horizontal lanes
- **Objective**: Tap the word that rhymes with the prompt before it exits
- **Scoring**: +1 point for correct, lose a life for wrong/miss/timeout
- **Win condition**: Complete all rounds or run out of lives

### Config Format (from JavaScript)
```json
{
  "sessionId": "uuid-string",
  "settings": {
    "lives": 3,
    "roundTimeS": 10,
    "speed": 3
  },
  "rounds": [
    {
      "promptWord": "cat",
      "correctWord": "hat",
      "distractors": ["dog", "tree"]
    }
  ]
}
```

### Completion Event
```javascript
window.addEventListener("unityRhymeRideComplete", (e) => {
  const { sessionId, score, total, streakMax } = e.detail;
});
```

## Project Structure

```
unity-rhyme-ride/
├── Assets/
│   ├── Editor/
│   │   ├── RhymeRideSceneBuilder.cs   # Generates scene + prefabs
│   │   └── RhymeRideBuildTools.cs     # One-click WebGL build
│   ├── Plugins/
│   │   └── WebGL/
│   │       └── WebBridge.jslib        # JS event dispatch
│   ├── Prefabs/
│   │   └── Target.prefab              # (generated)
│   ├── Scenes/
│   │   └── RhymeRideMain.unity        # (generated)
│   └── Scripts/
│       ├── RhymeRideGameManager.cs    # Game logic
│       ├── RhymeRideTarget.cs         # Target behavior
│       └── WebBridge.cs               # Unity ↔ JS bridge
└── README.md
```

## Output Files

After building, these files are created in `public/games/rhyme-ride/Build/`:

| File | Purpose |
|------|---------|
| `rhyme_ride.loader.js` | Unity WebGL loader script |
| `rhyme_ride.data` | Game data/assets |
| `rhyme_ride.framework.js` | Unity runtime framework |
| `rhyme_ride.wasm` | WebAssembly binary |

**Note:** Files use underscores (`rhyme_ride`) not hyphens. The React wrapper is configured to load these correctly.

## BrightBoost Integration

The React wrapper at `src/components/activities/RhymeRideUnityActivity.tsx`:
- Loads the Unity build from `/games/rhyme-ride/Build/rhyme_ride.*`
- Resolves LocalizedField content before sending to Unity
- Validates sessionId on completion events to prevent stale/cross-tab issues
- Guards against duplicate completion signals

## Development Notes

- No manual Unity work required - everything is code-generated
- Scene builder creates all UI, prefabs, and wires SerializedObject references
- Build tool auto-renames files if Unity emits different prefixes
- WebGL compression is disabled for local dev stability
- Malformed JSON config falls back to safe defaults
