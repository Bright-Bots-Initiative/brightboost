# Bounce & Buds - Unity WebGL Minigame

A Pong-style educational minigame for K-2 students where kids bounce a "Buddy" ball through gates to answer reading comprehension clues.

## Game Overview

- **Target Audience:** K-2 students
- **Learning Focus:** Reading comprehension
- **Gameplay:** Pong-style physics with paddle control and answer gates

## Features

- Paddle movement via keyboard (Arrow keys / A/D) and touch/drag
- Physics-based ball bouncing with obstacle bumpers
- Answer gates with correct/incorrect labels
- Lives system with visual feedback
- Round timer with countdown
- Score tracking with streak bonuses
- WebGL-optimized build for browser play

## Project Structure

```
unity-bounce-buds/
├── Assets/
│   ├── Editor/
│   │   ├── BounceBudsBuildTools.cs    # One-click WebGL build tools
│   │   └── BounceBudsSceneBuilder.cs  # Scene generation script
│   ├── Plugins/WebGL/
│   │   └── WebBridge.jslib            # JS event bridge
│   ├── Scenes/
│   │   └── BounceBudsMain.unity       # Generated main scene
│   └── Scripts/
│       ├── BounceBudsGameManager.cs   # Main game logic
│       ├── BuddyBall.cs               # Ball physics and events
│       ├── BudGate.cs                 # Answer gate component
│       ├── ObstacleBumper.cs          # Static obstacle marker
│       ├── OutOfBoundsZone.cs         # Bottom boundary marker
│       ├── PaddleController.cs        # Input handling
│       └── WebBridge.cs               # React-Unity communication
├── ProjectSettings/                    # Unity project settings
└── README.md
```

## Building

### Prerequisites
- Unity 2022.3 LTS or later
- WebGL Build Support module installed

### One-Click Build
1. Open the project in Unity
2. Go to **Tools > BrightBoost > Bounce & Buds > Generate + Build WebGL (One Click)**
3. Wait for the build to complete
4. Output goes to `public/games/bounce-buds/Build/`

### CI Build
```bash
Unity -batchmode -quit -projectPath ./unity-bounce-buds -executeMethod BrightBoost.BounceBudsBuildTools.BuildWebGL_CI
```

## React Integration

The game communicates with React via CustomEvents:

### Events Dispatched
- `unityBounceBudsReady` - Game is loaded and ready for config
- `unityBounceBudsComplete` - Game session ended, includes results

### Configuration
Send config via `SendMessage("WebBridge", "InitFromJson", jsonString)`:

```json
{
  "sessionId": "uuid-here",
  "settings": {
    "lives": 3,
    "roundTimeS": 12,
    "ballSpeed": 7,
    "paddleSpeed": 12,
    "obstacleCount": 4
  },
  "rounds": [
    {
      "clueText": "An animal that says meow",
      "correctLabel": "CAT",
      "distractors": ["DOG", "BIRD"],
      "hint": "It purrs!"
    }
  ]
}
```

### Completion Data
```json
{
  "sessionId": "uuid-here",
  "score": 5,
  "total": 7,
  "streakMax": 3,
  "roundsCompleted": 7
}
```

## Game Flow

1. **Intro Panel** - Title screen with START button
2. **Gameplay Loop**:
   - Display clue text at top
   - Spawn ball and 3 gates (1 correct, 2 distractors)
   - Player bounces ball with paddle
   - Ball enters gate → score if correct, lose life if wrong
   - Ball falls out of bounds → lose life
   - Timer runs out → lose life
3. **Game Over** - Show final score, dispatch completion event

## Development Notes

- Scene is generated via Editor script (no manual scene editing needed)
- PhysicsMaterial2D with bounciness=1, friction=0 for consistent bouncing
- Uses trigger colliders for gates and out-of-bounds detection
- Tag-free architecture (uses GetComponent checks instead)
