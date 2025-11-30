# Creating a New Level from Scratch

This guide explains, in detail, how to create a brand-new overworld level: how the coordinate system works, how to define platforms, items, enemies, hazards, backgrounds, and how to register everything so `WorldBuilder` and `LevelRegistry` can load it. It assumes no prior knowledge of the game’s data model.

## Core Components
- **LevelDefinition**: Plain data object describing the level (dimensions, spawn, platforms, enemies, items, npcs, hazards, background image).
- **LevelRegistry** (`game/scripts/core/LevelRegistry.js`): Stores level definitions by id. `WorldBuilder` pulls from it.
- **WorldBuilder** (`game/scripts/core/WorldBuilder.js`): Consumes level definitions to construct platforms, entities, and backgrounds.
- **Game** (`game/scripts/Game.js`): Calls `worldBuilder.createLevel(levelId)` to enter a level.
- **TownManager**: (optional) Adds towns to levels when present. If you have towns, set `levelId` fields to match your new level id.

## Coordinate System (Critical to Understand)
- **Origin (0,0)**: Top-left of the world.
- **X increases to the right**, **Y increases downward** (standard canvas coordinates).
- **Units**: Pixels.
- **Player spawn**: Uses `spawn` or `spawnOverride` from the level definition; must sit above ground.
- **Platforms**: Defined by `{ x, y, width, height }`. `y` is the top edge; height extends downward.
- **Ground rule of thumb**: For a 900px tall level, ground `y` is typically near `level.height - 40` if the ground platform height is `40`.
- **Camera**: Follows the player; bounds clamp to `level.width`/`level.height`.

Visual mental model:
```
(0,0) -----------------> +x
  |
  |
  v
 +y (downward)
```

## Minimal Level Definition
Create a file under `game/scripts/levels/YourLevel.js`. Keep it data-only; avoid functions.

```js
// game/scripts/levels/CliffsideLevel.js
window.LevelDefinitions = window.LevelDefinitions || {};

window.LevelDefinitions.cliffside = {
  id: 'cliffside',            // optional; registry key is the filename id
  width: 6000,                // world width in px
  height: 900,                // world height in px
  spawn: { x: 120, y: 600 },  // player start (above ground)
  theme: 'beach',             // affects procedural background in WorldBuilder
  backgroundImage: null,      // optional: { src, width, height }
  platforms: [
    // Ground platform spanning the level
    { x: 0, y: 860, width: 6000, height: 40, type: 'ground' },
    // Simple floating ledge
    { x: 800, y: 700, width: 220, height: 30, type: 'platform' }
  ],
  enemies: [
    { type: 'Slime', x: 900, y: 640 }
  ],
  items: [
    { type: 'Coin', x: 500, y: 780 },
    { type: 'Coffee', x: 820, y: 680 }
  ],
  npcs: [],       // overworld NPCs (not town NPCs)
  hazards: [],    // spikes, traps, etc.
  chests: [],     // optional chest placements
  themeProps: {}, // optional theme-specific knobs
  testRoom: false // leave false for real levels
};
```

### Registering the Level
Levels are registered globally on load. Ensure your file is included by the game (see `game/index.html` script tags) or bundled by your build. If you add a new level file, add a `<script>` tag or bundle entry so the browser loads it before the game starts.

```html
<!-- game/index.html -->
<script src="scripts/levels/CliffsideLevel.js"></script>
```

`LevelRegistry` ingests all entries in `window.LevelDefinitions` when the game starts. Call `game.createLevel('cliffside')` to load it (Game does this internally when you set the target level).

## Fields Explained (LevelDefinition)
- `id` (string): Identifier; used by `LevelRegistry` and `WorldBuilder`. If omitted, the object key is used.
- `width` (number): World width in pixels. Camera clamps to this.
- `height` (number): World height in pixels.
- `spawn` (object): `{ x, y }` player start position. Ensure it is above the ground platform and within bounds.
- `theme` (string): Passed to background/theme systems. Examples: `'beach'`, `'interior'`. Procedural backgrounds use this.
- `backgroundImage` (object, optional): `{ src, width, height }`. If set, `WorldBuilder`/`SceneRenderer` can use it as a static backplate. Otherwise, procedural layers are built from `theme`.
- `platforms` (array): Solid rectangles for collision. Fields:
  - `x`, `y`: Top-left corner in world coordinates.
  - `width`, `height`: Size in pixels.
  - `type`: `'ground'`, `'platform'`, `'wall'`, etc. Ground is often the main floor; walls stop movement; platforms support standing.
  - `solid` (optional): Defaults true. Rarely set to false.
- `enemies` (array): Each entry is passed to `entityFactory.create(def)`. Example: `{ type: 'Slime', x, y }`.
- `items` (array): Collectibles/powerups: `{ type: 'Coin', x, y }`, `{ type: 'Coffee', x, y }`.
- `hazards` (array): `{ type: 'Spike', x, y, width, height }` or other hazard types supported by `EntityFactory`.
- `chests` (array): `{ x, y, displayName, contents }` or `{ type: 'chest', ... }`; factory handles chest creation.
- `npcs` (array): Overworld NPCs (not town NPCs). Provide `type`, `x`, `y`, and sprite/dialogue as needed.
- `themeProps` (object, optional): Custom knobs consumed by your theme/background logic.
- `testRoom` (bool, optional): `true` only for the built-in test room. Keep `false` for normal levels.

## Coordinate and Placement Guidance
- **Ground**: Common pattern is a single ground platform at `y = height - groundHeight`, where `groundHeight` is ~40–50px. For `height = 900`, ground at `y = 860` with `height = 40` gives a floor at the bottom.
- **Spawn**: Place the player slightly above ground so gravity settles them onto the floor (e.g., ground at `y=860`, spawn at `y=600–700`).
- **Ledges**: Put ledges at higher `y` (smaller number = higher elevation relative to ground in world terms?**Note**: y increases downward, so a lower `y` is higher on screen). Example: Ledge at `y=700` is higher than ground at `y=860`.
- **Bounds**: Keep all `x` in `[0, width]` and `y` in `[0, height]` for initial placements. Going outside may make objects unreachable or invisible.

## Platforms: Coordinates, Sizes, and Examples
Platforms are just solid rectangles. The game does not auto-layout platforms; you place them by hand in the `platforms` array.

### How Platform Coordinates Work
- `x`, `y`: Top-left corner of the platform (pixels). `x` grows to the right; `y` grows downward.
- `width`, `height`: Size in pixels. The bottom of the platform is at `y + height`; the right side is at `x + width`.
- `type`: A label that hints at intent/behavior:
  - `ground`: Main floor; often stretches across most/all of the level.
  - `platform`: Regular ledge you can stand on.
  - `wall`: Solid vertical barrier (left/right walls or ceilings can be modeled this way).
  - (Any other string will still be solid unless you set `solid: false`.)
- `solid` (optional): Defaults to true. Set to `false` only if you want a non-blocking area (rare for platforms).

### Common Patterns
- **Ground platform**: A single wide rectangle near the bottom of the level.
- **Floating platform (ledge)**: A smaller rectangle higher up for jumping.
- **Wall/Boundary**: Tall, thin rectangles at the left/right edges (optional if you want hard bounds).
- **Ceiling**: A thin rectangle at the very top to stop escape if needed.

### Platform Examples (Copy/Paste Friendly)
```js
platforms: [
  // Ground: spans the whole level width (example level width = 6000, height = 900)
  { x: 0, y: 860, width: 6000, height: 40, type: 'ground' },

  // Large mid-level platform (wide ledge)
  { x: 800, y: 680, width: 600, height: 32, type: 'platform' },

  // Small floating platform (tight jump)
  { x: 1600, y: 560, width: 160, height: 28, type: 'platform' },

  // High small platform (harder reach)
  { x: 2200, y: 460, width: 140, height: 28, type: 'platform' },

  // Left wall boundary (prevents exiting level)
  { x: -40, y: 0, width: 40, height: 900, type: 'wall' },

  // Right wall boundary (prevents exiting level)
  { x: 6000, y: 0, width: 40, height: 900, type: 'wall' },

  // Ceiling (optional)
  { x: 0, y: 0, width: 6000, height: 32, type: 'wall' }
]
```

### Tips for Adding Platforms Easily
- Start with one **ground** platform near `y = level.height - 40` (or your chosen ground height).
- Add a few **wide mid-level ledges** to give space for enemies/items.
- Sprinkle **small high ledges** for challenge or secrets.
- Use **walls** at the edges if you want hard boundaries instead of invisible camera clamps.
- Keep `x` and `width` aligned to reachable areas; if a platform is too high or far, the player may never reach it.

## Adding Backgrounds
- **Procedural**: If `backgroundImage` is null, the theme/parallax system builds layers based on `theme`.
- **Static image**: Set `backgroundImage: { src: 'art/bg/your-bg.png', width, height }`. Use the same size as `level.width/height` for 1:1 placement.
- **Custom layers**: Advanced: you can attach background layers after level creation in `WorldBuilder` if needed.

## Placing Entities (Examples)
### Platforms
```js
platforms: [
  { x: 0, y: 860, width: 4000, height: 40, type: 'ground' },     // main floor
  { x: 600, y: 720, width: 260, height: 30, type: 'platform' },  // mid ledge
  { x: 1100, y: 620, width: 200, height: 30, type: 'platform' }  // higher ledge
]
```

### Enemies
```js
enemies: [
  { type: 'Slime', x: 620, y: 700 },
  { type: 'Slime', x: 1150, y: 600 }
]
```

### Items
```js
items: [
  { type: 'Coin', x: 650, y: 680 },
  { type: 'Coffee', x: 1120, y: 580 }
]
```

### Hazards
```js
hazards: [
  { type: 'Spike', x: 1400, y: 840, width: 80, height: 20 }
]
```

### Chests
```js
chests: [
  { x: 1800, y: 800, displayName: 'Starter Chest', contents: ['Coin', 'Coffee'] }
]
```

### Overworld NPCs
```js
npcs: [
  { type: 'townNpc', id: 'wanderer', x: 950, y: 820, sprite: 'art/sprites/wanderer.png', dialogueId: 'npc.wanderer' }
]
```

## Connecting Towns (Optional)
If your level hosts towns:
- Set `levelId` on the town entries in `TownsConfig` to your level id.
- Place buildings/doors within your level’s x-range (`region.startX` to `region.endX`).
- Interiors use rooms (see `docs/rooms.md`); ensure room files are loaded and registered.

## Loading Your Level in Game
Once your level file is loaded and registered:
```js
// To start at your level (e.g., in development):
const game = new Game('gameCanvas');
game.createLevel('cliffside'); // switches to your level
```

## Validation and Debugging
- `LevelRegistry.validate(def)` checks basic shape (arrays, required number fields).
- If the player spawns off-screen or falls:
  - Check `spawn.y` and ground `y`.
  - Ensure ground platform exists under spawn.
  - Verify `height` is large enough for your placements.
- Use debug overlays (toggle debug in UI) to view platform hitboxes and door radii.

## Checklist for a New Level
1) Create `game/scripts/levels/YourLevel.js` with a LevelDefinition.
2) Add a `<script>` tag (or bundle entry) so the browser loads it.
3) Set `width/height`, add a ground platform, set a reasonable `spawn`.
4) Add ledges, enemies, items, hazards, chests, NPCs as needed.
5) (Optional) Add `backgroundImage` or rely on the `theme`.
6) (Optional) Wire towns (`TownsConfig`) and interiors (`roomRegistry`).
7) Run the game, call `createLevel('yourLevelId')`, verify spawn, camera bounds, collisions, and placements.

## Common Pitfalls
- **Missing ground**: Without a ground platform, the player will fall forever. Add `{ type: 'ground' }` at the bottom.
- **Spawn inside ground**: Place spawn above the ground (lower `y` than ground top). If ground is at `y=860`, put spawn around `y=600–740`.
- **Wrong coordinate intuition**: Remember y increases downward; smaller `y` means higher elevation.
- **Unloaded level file**: If the level doesn’t appear, confirm the script is included in `index.html` or the bundler.
- **Entities offscreen**: Keep x within `[0, width]`; if x > width, the player may never reach them.

## Advanced: Converting a Level into a Room (Interior)
If you mark a level with `theme: 'interior'` or `backgroundImage`, TownManager can auto-convert it to a room for building interiors. This is useful for reusing authored interior-like definitions without rewriting them. See `TownManager.convertLevelDefinitionToRoom` for the mapping.
