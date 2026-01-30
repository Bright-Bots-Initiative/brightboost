# Spacewar - Unity WebGL Game

A 1962 Spacewar-style duel game with BrightBoost robot theming.

## Gameplay

- **Objective:** First to 5 points wins the match!
- **Scoring:** Destroy your opponent with missiles OR let them fall into the sun
- **2D top-down** view with two ships battling around a central gravity well
- **Screen wrapping** - ships and projectiles wrap around screen edges
- **Central sun (gravity well)** - constantly pulls ships toward it; touching the sun destroys you!

### Game Modes

**vs CPU (Default):**
Player 1 battles against an AI opponent. Three difficulty levels available:

- **Easy:** More forgiving aim, slower reactions
- **Normal:** Balanced challenge
- **Hard:** Precise aim, aggressive tactics

**Local PvP:**
Two players share the keyboard. (Toggle from "cpu" to "pvp" mode via the frontend or WebBridge)

> **Note:** True online PvP matchmaking is coming in a future update. For now, the opponent is CPU-controlled by default.

### Controls

**Player 1:**

- `A` / `D` - Rotate left/right
- `W` - Thrust forward
- `Space` - Fire missile
- `S` - Hyperspace (random teleport, 15% risk of explosion!)
- `R` - Restart match (when canvas is focused)

**Player 2 (Local PvP only):**

- `Left` / `Right Arrow` - Rotate left/right
- `Up Arrow` - Thrust
- `Right Ctrl` or `Left Ctrl` - Fire
- `Down Arrow` - Hyperspace

### Hazards

- **The Sun:** Kills on contact. Gravity constantly pulls you in!
- **Hyperspace:** Teleports you randomly but has a 15% chance of causing your ship to explode.

### Tips

- Use thrust sparingly - momentum can carry you into the sun
- Lead your shots - missiles travel in straight lines
- Use gravity to your advantage - slingshot around the sun
- When in danger, hyperspace is a risky escape option

## Robot Theming

Ships are styled as robot-jets with archetype-based visuals:

| Archetype | Color  | Description             |
| --------- | ------ | ----------------------- |
| AI        | Blue   | Artificial Intelligence |
| QUANTUM   | Purple | Quantum Computing       |
| BIOTECH   | Green  | Biotechnology           |

## Setup Instructions

### Requirements

- Unity 2021.3 LTS or newer (2022.3 recommended)
- WebGL Build Support module installed

### Opening the Project

1. Open Unity Hub
2. Click "Add" and select the `unity-spacewar` folder
3. Open the project with Unity 2021.3+ or 2022.3+

### Scene Setup

Create a new scene with the following hierarchy:

```
Main Camera (Orthographic, size 5-7)
├── GameManager (attach GameManager.cs)
├── WebBridge (attach WebBridge.cs)
├── GravityWell (attach GravityWell.cs)
│   └── Sprite (yellow/orange star)
│   └── CircleCollider2D (trigger, radius = killRadius)
├── Player1Ship (attach ShipController.cs, ScreenWrap.cs, Rigidbody2D)
│   └── Sprite (robot-jet)
│   └── Collider2D (trigger)
│   └── TrailRenderer
│   └── FirePoint (empty child at nose)
├── Player2Ship (similar to Player1, CpuPilot.cs auto-added at runtime)
├── SpawnPoint1 (empty, left side)
├── SpawnPoint2 (empty, right side)
└── UI Canvas
    ├── P1 Score Text
    ├── P2 Score Text
    ├── P1 Archetype Text
    ├── P2 Archetype Text
    ├── Message Text (center)
    └── Game Over Panel
```

### Creating Prefabs

**Projectile Prefab:**

- Sprite (small dot/circle)
- Rigidbody2D (Kinematic or Dynamic with no gravity)
- CircleCollider2D (trigger)
- TrailRenderer
- Projectile.cs
- ScreenWrap.cs

### WebGL Build

1. Go to **File > Build Settings**
2. Select **WebGL** platform
3. Click **Player Settings**:
   - Set Company Name: "BrightBoost"
   - Set Product Name: "Spacewar"
   - Under Publishing Settings, set Compression Format to "Disabled" for easier debugging
4. Click **Build**
5. Select output folder: `../public/games/spacewar/`

The build will create:

- `Build/spacewar.loader.js`
- `Build/spacewar.data`
- `Build/spacewar.framework.js`
- `Build/spacewar.wasm`
- `index.html` (not needed, frontend has its own)

## Web Integration

The `WebBridge.cs` component handles communication with the React frontend:

### Receiving Config from JavaScript

```javascript
// Call from React after Unity loads
unityInstance.SendMessage(
  "WebBridge",
  "SetPlayerConfig",
  JSON.stringify({
    archetype: "AI",
    level: 5,
    xp: 1200,
  }),
);
```

### Setting Opponent Mode

```javascript
// Set to CPU opponent (default)
unityInstance.SendMessage("WebBridge", "SetOpponentMode", "cpu");

// Set to local PvP
unityInstance.SendMessage("WebBridge", "SetOpponentMode", "pvp");
```

### Setting CPU Difficulty

```javascript
// Options: 'easy', 'normal', 'hard'
unityInstance.SendMessage("WebBridge", "SetCpuDifficulty", "normal");
```

### Combined Runtime Config

```javascript
unityInstance.SendMessage(
  "WebBridge",
  "SetRuntimeConfig",
  JSON.stringify({
    opponentMode: "cpu",
    difficulty: "hard",
  }),
);
```

### Listening for Match End

```javascript
window.addEventListener("unityMatchOver", (event) => {
  console.log("Match result:", event.detail);
  // { winner: 1, player1Score: 5, player2Score: 3, timestamp: "..." }
});
```

### Controlling the Game

```javascript
// Pause
unityInstance.SendMessage("WebBridge", "PauseGame");

// Resume
unityInstance.SendMessage("WebBridge", "ResumeGame");

// Restart
unityInstance.SendMessage("WebBridge", "RestartGame");
```

## Project Structure

```
unity-spacewar/
├── Assets/
│   ├── Scripts/
│   │   ├── GameManager.cs      # Game state, scoring, rounds, CPU toggle
│   │   ├── ShipController.cs   # Ship movement, firing, hyperspace, external control
│   │   ├── CpuPilot.cs         # CPU opponent AI behavior
│   │   ├── Projectile.cs       # Missile behavior
│   │   ├── GravityWell.cs      # Central gravity source
│   │   ├── ScreenWrap.cs       # Screen edge wrapping
│   │   └── WebBridge.cs        # JS interop for WebGL
│   ├── Plugins/
│   │   └── WebGL/
│   │       └── WebBridge.jslib # JavaScript bridge functions
│   ├── Prefabs/
│   ├── Scenes/
│   └── Sprites/
└── README.md
```

## Testing

### In Editor

1. Open the main scene
2. Press Play
3. Use keyboard controls for Player 1
4. CPU controls Player 2 by default

### In Browser

1. Build for WebGL
2. Run `npm run dev` from the brightboost root
3. Navigate to `/student/play?tab=pvp`
4. The game should load in the SpacewarArena component
5. Use "How to Play" button to see controls
6. Use difficulty dropdown to adjust CPU challenge
7. Press "R" or click "Restart" to restart the match
