# Gotcha Gears — Unity WebGL Minigame

A strategy/logic game where players catch gears on conveyor lanes by planning and timing their catches.

## Quick Start

1. Open Unity Hub and add the `unity-gotcha-gears` folder as a project
2. Open the project in Unity 2022.3 LTS
3. Go to **Tools → BrightBoost → Gotcha Gears → Generate + Build WebGL**
4. Wait for the build to complete
5. Verify build files exist in `public/games/gotcha-gears/Build/`

## Menu Commands

| Menu Path | Action |
|-----------|--------|
| Tools/BrightBoost/Gotcha Gears/Generate Scene | Creates scene, prefabs, wires everything |
| Tools/BrightBoost/Gotcha Gears/Build WebGL | Builds existing scene to WebGL |
| Tools/BrightBoost/Gotcha Gears/Generate + Build WebGL | Full one-click build |
| Tools/BrightBoost/Gotcha Gears/Clean Build Folder | Removes build artifacts (keeps .gitkeep) |

## CI Build Command

```bash
Unity -batchmode -projectPath ./unity-gotcha-gears -executeMethod BrightBoost.GotchaGearsBuildTools.BuildWebGL_CI -quit
```

## Build Output Files

```
public/games/gotcha-gears/Build/
├── gotcha_gears.loader.js
├── gotcha_gears.data
├── gotcha_gears.framework.js
├── gotcha_gears.wasm
└── .gitkeep
```

## Config Schema

The React wrapper sends this JSON via `SendMessage("WebBridge", "InitFromJson", json)`:

```json
{
  "sessionId": "uuid-string",
  "settings": {
    "lives": 3,
    "roundTimeS": 12,
    "speed": 2.6,
    "speedRamp": 0.15,
    "maxSpeed": 6.0,
    "planningTimeS": 1.8,
    "kidModeWrongNoLife": true,
    "kidModeWhiffNoLife": true,
    "catchWindowX": 1.0
  },
  "rounds": [
    {
      "clueText": "The robot keeps making mistakes. What should it do?",
      "correctLabel": "debug",
      "distractors": ["guess", "ignore"],
      "hint": "Debug means fix the mistake."
    }
  ]
}
```

## Troubleshooting

### "Scene wiring broken" errors
Re-run **Tools → BrightBoost → Gotcha Gears → Generate Scene**

### Build files missing
Run **Tools → BrightBoost → Gotcha Gears → Generate + Build WebGL**

### "Library folder" issues
Delete the `Library` folder and re-open Unity to regenerate

### WebGL not loading in browser
1. Clear browser cache or use incognito
2. Check browser console for errors
3. Verify all 4 build files exist (.loader.js, .data, .framework.js, .wasm)

## Gameplay Overview

1. **Planning Phase** (1.8s default): Gears appear but don't move. Read the clue and select your lane.
2. **Action Phase**: Gears start moving. Press CATCH when the correct gear enters the catch zone.
3. **Scoring**: Correct catch = +1 score. Wrong catch = hint + retry. Miss = -1 life.
