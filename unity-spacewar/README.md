# Spacewar - Unity WebGL Game

A 1962 Spacewar-style duel game with BrightBoost robot theming.

## Gameplay

- **2D top-down** view with two ships battling around a central gravity well
- **Screen wrapping** - ships and projectiles wrap around screen edges
- **Central gravity well** - pulls ships and projectiles toward it; entering the sun destroys you
- **First to N** scoring system

### Controls

**Player 1:**
- `A` / `D` - Rotate left/right
- `W` - Thrust
- `Space` - Fire
- `S` - Hyperspace (random teleport, 15% risk of explosion)

**Player 2:**
- `Left` / `Right Arrow` - Rotate left/right
- `Up Arrow` - Thrust
- `Right Ctrl` - Fire
- `Down Arrow` - Hyperspace

## Robot Theming

Ships are styled as robot-jets with archetype-based visuals:

| Archetype | Color | Description |
|-----------|-------|-------------|
| AI | Blue | Artificial Intelligence |
| QUANTUM | Purple | Quantum Computing |
| BIOTECH | Green | Biotechnology |

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
├── Player2Ship (similar to Player1)
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
unityInstance.SendMessage('WebBridge', 'SetPlayerConfig', JSON.stringify({
  archetype: 'AI',
  level: 5,
  xp: 1200
}));
```

### Listening for Match End

```javascript
window.addEventListener('unityMatchOver', (event) => {
  console.log('Match result:', event.detail);
  // { winner: 1, player1Score: 5, player2Score: 3, timestamp: "..." }
});
```

### Controlling the Game

```javascript
// Pause
unityInstance.SendMessage('WebBridge', 'PauseGame');

// Resume
unityInstance.SendMessage('WebBridge', 'ResumeGame');

// Restart
unityInstance.SendMessage('WebBridge', 'RestartGame');
```

## Project Structure

```
unity-spacewar/
├── Assets/
│   ├── Scripts/
│   │   ├── GameManager.cs      # Game state, scoring, rounds
│   │   ├── ShipController.cs   # Ship movement, firing, hyperspace
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
3. Use keyboard controls for both players

### In Browser

1. Build for WebGL
2. Run `npm run dev` from the brightboost root
3. Navigate to `/student/play?tab=pvp`
4. The game should load in the SpacewarArena component
