# Creating a New Town from Scratch

This guide walks you through defining a brand-new town, wiring it into the game, and understanding each data field and class involved. It assumes minimal prior knowledge and focuses on practical, technical steps with code snippets.

## Key Concepts
- **Town**: A themed slice of a level that overlays decor, buildings (with doors/interiors), setpieces, NPCs, and music without replacing the level’s platforms/enemies.
- **TownsConfig** (`game/scripts/core/config/TownsConfig.js`): Data-only map of all towns. You add/modify towns here.
- **TownManager** (`game/scripts/town/TownManager.js`): Runtime controller that detects when the player is inside a town region, loads decor/buildings/NPCs, handles door interaction, and manages town music.
- **RoomManager / RoomRegistry**: Used by TownManager when entering building interiors (rooms). Rooms are separate; see `docs/rooms.md`.
- **LevelRegistry / WorldBuilder**: Build the base level the town sits on. Towns attach to a level id.

## What You Need to Define for a Town
- `id` (string): Unique town identifier.
- `name` (string): Display name; shown on the entry banner.
- `levelId` (string): Which level this town belongs to (e.g., `'testRoom'`).
- `region` (object): `{ startX, endX }` in world pixels; TownManager activates when the player is between these x-coordinates.
- `banner` (object, optional): Banner art/colors when entering. Example: `{ background: 'art/ui/scroll.png', textColor: '#5c3a1a' }`.
- `music` (object, optional): `{ id, src, volume }` town theme. Plays while in the town region; fades against base level music.
- `buildings` (array, optional): Structures with doors/interiors. Each building defines exterior art, door location/radius, and optional `interior` config.
- `setpieces` (array, optional): Static/animated decor props (benches, lamps, ground tiles, backdrop fronds).
- `npcs` (array, optional): Town NPC definitions (`type: 'townNpc'`, sprite, patrol points, dialogue id).
- `interiors` (array, optional): Standalone interior metadata map (rarely needed if you inline interiors per building).
- `assetKit` (string, optional): Key for the asset bundle defined in `TownsConfig.assetKits` to auto-seed backdrops/ground/lamps/houses.
- `houseCount` / `streetLampCount` / `itemPlan` (optional): Override defaults for required houses, lamp count, and guaranteed town items.

## Town Data Shape (TownsConfig)
Add or edit entries in `game/scripts/core/config/TownsConfig.js`. Example of a minimal new town:

```js
// Inside TownsConfig.towns array
{
  id: 'mountainTown',
  name: 'Summit Haven',
  levelId: 'mountainLevel', // must match a LevelDefinition id
  region: { startX: 12000, endX: 15500 },
  banner: { background: 'art/ui/scroll.png', textColor: '#e4e0d9' },
  music: { id: 'mountainTownTheme', src: 'music/mountain-town.mp3', volume: 0.85 },
  buildings: [
    {
      id: 'inn',
      name: 'Summit Inn',
      exterior: {
        x: 12800,                 // world x where the building sprite’s left edge sits
        y: 0,                     // auto aligned to ground if autoAlignToGround is true
        width: 720, height: 820,  // source sprite dims (before scaling)
        frames: 2,                // closed/open frames
        frameDirection: 'horizontal',
        frameWidth: 720,
        frameHeight: 820,
        scale: 0.38,
        autoAlignToGround: true,  // snap to ground y computed by TownManager
        sprite: 'art/bg/buildings/exterior/mountain-inn.png'
      },
      door: {
        width: 180, height: 220,  // raw door size, scaled by exterior.scale
        spriteOffsetX: 150,       // x,y offsets inside the source sprite to place the door
        spriteOffsetY: 540,
        interactRadius: 170       // how close the player must be to interact
      },
      interior: {
        id: 'inn_interior',       // links to a room id
        // optional overrides for spawn/exit/music/background; see docs/rooms.md
        spawn: { x: 220, y: 520 },
        exit: { x: 220, y: 560, radius: 80 }
        // optionally inline a full room: room: { ...room descriptor... }
      },
      npcs: [
        { type: 'townNpc', id: 'innkeeper', name: 'Pema', x: 12920, sprite: 'art/sprites/innkeeper.png' }
      ]
    }
  ],
  setpieces: [
    { id: 'stone_path', name: 'Stone Path', x: 12000, y: 0, width: 4000, height: 40, layer: 'ground', tileX: true, frameWidth: 1024, frameHeight: 1024, scale: 0.04, autoAlignToGround: true, sprite: 'art/bg/tiles/stone-path.png' },
    { id: 'lamp_w', name: 'Lamp', x: 12500, y: 0, width: 64, height: 180, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/street-lamp.png' }
  ],
  npcs: [
    {
      id: 'sherpa',
      type: 'townNpc',
      name: 'Sherpa Dan',
      sprite: 'art/sprites/sherpa.png',
      width: 50,
      height: 70,
      frames: 4,
      idleFrame: 1,
      walkFrames: [2, 3],
      talkFrames: [0, 1],
      dialogueId: 'npc.sherpa',
      speed: 35,
      pauseMs: 40,
      x: 13200,
      patrol: [{ x: 13100 }, { x: 13900 }]
    }
  ],
  interiors: [] // optional shared interior metadata map
}
```

## Asset Kits, Required Props, and Guaranteed Items
- **Defaults** live in `TownsConfig.defaults`. They currently enforce:
  - A backdrop, a ground tile, at least 2 houses (max 3 by default), and at least 1 street lamp per town.
  - A minimum item count (default 2) spawned inside the town region.
- **Asset kits** (`TownsConfig.assetKits`) bundle swappable art for the required pieces (`groundTile`, `backdropSlices`, `streetLamp`, `house` with interior). Reference a kit per town with `assetKit: 'shore'` (or override specific pieces via `town.assets`).
- **Positioning/overrides** per town:
  - `houseCount`, `streetLampCount`, `houseSlots`, `lampSlots` set how many to spawn and where.
  - `itemPlan: { count, spacing, pool }` guarantees a set number of items; `itemSlots` can pin them to exact x positions.
  - Add/remove animation frames by editing the kit entry (e.g., change `frames`, `frameDirection`, `frameTimeMs` on `backdropSlices`, `streetLamp`, or `house.exterior`).

Example (shore town):
```js
{
  id: 'shoreTown',
  assetKit: 'shore',
  houseCount: { min: 3, max: 3 },
  houseSlots: [7200, 8800, 9600],
  lampSlots: [6900, 8200, 9500],
  itemPlan: { count: 3, spacing: 420 },
  setpieces: [
    { id: 'fountain_center', /* ... */ },
    { id: 'bench_center', /* ... */ }
  ]
}
```
This auto-adds a tiled ground, the frond backdrop, 3 lamps, and enough houses/interiors to meet the counts while keeping the custom fountain/bench.

## Asset Kits Deep Dive (What/Why/How)
Asset kits let you swap art and sizing rules for all required town props without touching code. TownManager pulls one kit per town (`assetKit`) and auto-fills:
- `groundTile` (tiled across the town span)
- `backdropSlices` (start / mid / end slices for fronds or other backdrops)
- `streetLamp`
- `house` (with interior)

### How scaling works (consistent with player size)
- **Width continuity:** Ground tiles and backdrop slices preserve their intended horizontal width when the manager auto-fills the town span. Start/end slices keep their sprite width × scale; the mid slice is widened to cover the gap and tiles horizontally.
- **Height stays proportional:** Even when width is preserved, height still uses your `scale`, so props stay in proportion to the player.
- **Start/End caps:** They reuse their native frame width and your `scale`; no stretching if `frameWidth/frameHeight` are set.
- **Mid slice:** Fills the region between caps. Set `tileX: true` and (optionally) `tileWidth` to control repeat step.
- **Ground tiles:** Use `tileX: true`, set `frameWidth/frameHeight`, and a sensible `scale` (0.03–0.05 is typical for 1024px atlases against the player sprite).

### Define an asset kit
Add under `TownsConfig.assetKits`:
```js
assetKits: {
  shore: {
    groundTile: {
      id: 'shore_ground',
      role: 'groundTile',
      sprite: 'art/bg/tiles/beach-cobble.png',
      frameWidth: 1024,
      frameHeight: 1024,
      tileX: true,
      scale: 0.04,
      layer: 'ground',
      autoAlignToGround: true
    },
    backdropSlices: [
      { id: 'shore_fronds_start', role: 'backdrop', slot: 'start', sprite: 'art/bg/town backdrop/frond-start.png', frameWidth: 1022, frameHeight: 988, scale: 0.10, layer: 'midground', autoAlignToGround: true },
      { id: 'shore_fronds_mid',   role: 'backdrop', slot: 'mid',   sprite: 'art/bg/town backdrop/fronds.png',      frameWidth: 1022, frameHeight: 988, tileX: true, tileWidth: 128, scale: 0.10, layer: 'midground', autoAlignToGround: true },
      { id: 'shore_fronds_end',   role: 'backdrop', slot: 'end',   sprite: 'art/bg/town backdrop/frond-end.png',   frameWidth: 1022, frameHeight: 988, scale: 0.10, layer: 'midground', autoAlignToGround: true }
    ],
    streetLamp: {
      id: 'shore_lamp',
      role: 'streetLamp',
      sprite: 'art/bg/exterior-decor/street-lamp.png',
      width: 64, height: 180,
      layer: 'foreground',
      autoAlignToGround: true
    },
    house: {
      id: 'shore_house_template',
      exterior: {
        sprite: 'art/bg/buildings/exterior/house.png',
        frameWidth: 689, frameHeight: 768,
        frames: 2, frameDirection: 'horizontal',
        scale: 0.4,
        autoAlignToGround: true
      },
      door: { width: 180, height: 210, spriteOffsetX: 118, spriteOffsetY: 498, interactRadius: 160 },
      interior: { id: 'shore_house_interior' } // can inline a room or register separately
    }
  }
}
```

### Use a kit in a town (and override safely)
```js
{
  id: 'forestTown',
  assetKit: 'shore',           // base kit
  assets: {                    // optional per-town overrides (no code changes)
    backdropSlices: [
      { slot: 'mid', scale: 0.085 },   // shorter fronds, same art
      { slot: 'mid', width: 42000 }    // widen the tiled span if needed
    ],
    groundTile: { scale: 0.038 }       // slimmer planks
  },
  houseSlots: [12000, 13200],
  lampSlots: [11800, 13600]
}
```
Rules:
- `slot` picks which slice to override (`start`, `mid`, `end`).
- `scale` changes both width and height proportionally; start/end use sprite width × scale; mid fills the span and tiles.
- `width` on the mid slice sets the span to tile across; height still follows `scale`.
- Start/end typically avoid explicit `width`—use `scale` plus `frameWidth/frameHeight` to prevent stretching.
- Ground tiles always tile in X; set `frameWidth/frameHeight/scale` and let TownManager stretch them across the town region.

### Create a brand-new kit
1) Drop art under `game/art/...`.
2) Add a new entry to `assetKits` with the four keys (`groundTile`, `backdropSlices`, `streetLamp`, `house`).
3) Give each slice/frame proper `frameWidth/frameHeight` and a sensible `scale` (0.08–0.12 for 1k frond sheets; ~0.04 for 1k tiles).
4) Point a town at it via `assetKit: 'yourKit'`. Override per-town via `assets` if needed.

### Troubleshooting scaling/continuity
- **Fronds not continuous:** ensure mid slice has `tileX: true` and either omit `width` or set it wide enough; TownManager will auto-fill between start/end.
- **Caps stretched:** set `frameWidth/frameHeight` and use `scale`; avoid overriding `width` on start/end.
- **Ground too tall/short:** tweak `scale` on `groundTile`; height uses `scale`, width is auto-spanned.
- **Everything too big/small relative to player:** adjust `scale` in the kit; TownManager keeps proportions consistent across towns.

## Quick Recipes (Scaling, Backdrops, Assets)
- **Make fronds shorter/taller (keep continuity):**
```js
assets: {
  backdropSlices: [
    { slot: 'mid', scale: 0.085 }, // shorter
    { slot: 'start', scale: 0.085 },
    { slot: 'end', scale: 0.085 }
  ]
}
```
Height follows `scale`; width stays continuous.

- **Widen the frond span (keep same height):**
```js
assets: {
  backdropSlices: [
    { slot: 'mid', width: 42000 } // tiles across a larger span
  ]
}
```
Width is absolute for the span; height still uses `scale`.

- **Slim down ground planks:**
```js
assets: {
  groundTile: { scale: 0.038 } // lowers plank height; width still spans town
}
```

- **Swap all assets for a new biome (no code changes):**
```js
assetKit: 'forest',
assets: {
  streetLamp: { sprite: 'art/bg/exterior-decor/forest-lamp.png' },
  house: { exterior: { sprite: 'art/bg/buildings/exterior/forest-house.png', scale: 0.36 } }
}
```

- **Per-town lamp/house counts and placement:**
```js
houseCount: { min: 2, max: 3 },
houseSlots: [12000, 13200, 14400],
streetLampCount: 2,
lampSlots: [11800, 14000]
```

- **Guarantee a specific number of town items:**
```js
itemPlan: { count: 3, spacing: 320, pool: [{ type: 'coffee' }, { type: 'health_potion', healAmount: 25 }] }
```

With these patterns, you can reskin or resize towns entirely in `TownsConfig`—no JS edits needed. TownManager applies the scaling rules uniformly so future towns inherit the same proportions and backdrop continuity.

---

## Door Position Calculations (Detailed)

Doors are the interactive hotspots on building exteriors that let players enter interiors. Calculating door positions correctly ensures players can interact with buildings as expected.

### Door Coordinate System

**Key concept:** Door coordinates exist in **two spaces**:
1. **Sprite space** - Position within the source building image (spriteOffsetX/Y)
2. **World space** - Position in the game world where players interact (calculated from sprite offsets + building position)

### Door Fields Breakdown

```javascript
door: {
    width: 180,              // Door width in sprite pixels (before scaling)
    height: 210,             // Door height in sprite pixels (before scaling)
    spriteOffsetX: 118,      // X offset from building sprite's left edge
    spriteOffsetY: 498,      // Y offset from building sprite's top edge
    interactRadius: 160      // Circle radius for player interaction (world pixels)
}
```

### Door Position Formula

**World door position calculation:**

```javascript
// Building exterior configuration
const building = {
    exterior: {
        x: 8800,              // World X position
        y: 0,                 // World Y (auto-aligned to ground)
        width: 689,           // Source sprite width
        height: 768,          // Source sprite height
        scale: 0.4            // Display scale factor
    },
    door: {
        spriteOffsetX: 118,   // Door X in sprite space
        spriteOffsetY: 498,   // Door Y in sprite space
        width: 180,           // Door width (sprite space)
        height: 210           // Door height (sprite space)
    }
};

// Calculate door center in world space
const doorWorldX = building.exterior.x + (building.door.spriteOffsetX * building.exterior.scale);
const doorWorldY = building.exterior.y + (building.door.spriteOffsetY * building.exterior.scale);

// Door center (for interaction checks)
const doorCenterX = doorWorldX + (building.door.width * building.exterior.scale) / 2;
const doorCenterY = doorWorldY + (building.door.height * building.exterior.scale) / 2;

// Result for example above:
// doorWorldX = 8800 + (118 × 0.4) = 8800 + 47.2 = 8847.2
// doorWorldY = 0 + (498 × 0.4) = 199.2 (plus ground alignment)
// doorCenterX = 8847.2 + (180 × 0.4)/2 = 8847.2 + 36 = 8883.2
// doorCenterY = 199.2 + (210 × 0.4)/2 = 199.2 + 42 = 241.2
```

### Visual Door Positioning Example

```
Building sprite: 689×768 px (source)
Scale: 0.4 (display: 275.6×307.2 px)

Source sprite coordinates:
┌────────────────────────────────┐ 0
│        Building Exterior        │
│                                 │
│          ┌──────┐              │ 498 ← spriteOffsetY
│          │ Door │              │
│          │ 180× │              │
│          │ 210  │              │
│          └──────┘              │ 708
│                                 │
└────────────────────────────────┘ 768
0        118    298              689
         ↑      ↑
         spriteOffsetX
         
World space (after positioning at x=8800, scale=0.4):
Building left edge: 8800
Door left edge: 8800 + (118 × 0.4) = 8847.2
Door right edge: 8847.2 + (180 × 0.4) = 8919.2
Door width (world): 72 px
Door height (world): 84 px
```

### Finding Door Offsets in Your Sprite

**Step-by-step process:**

1. **Open sprite in image editor** (GIMP, Photoshop, etc.)
2. **Enable pixel grid and rulers**
3. **Locate door rectangle:**
   - Find the door's top-left corner
   - Note X coordinate from sprite's left edge = `spriteOffsetX`
   - Note Y coordinate from sprite's top edge = `spriteOffsetY`
4. **Measure door dimensions:**
   - Measure width in pixels = `width`
   - Measure height in pixels = `height`

**Example measurements:**

```
Shore House (house.png):
- Sprite dimensions: 689×768 (closed frame)
- Door rectangle: 
  - Top-left: (118, 498)
  - Bottom-right: (298, 708)
  - Width: 298 - 118 = 180 px
  - Height: 708 - 498 = 210 px

Config:
door: {
    width: 180,
    height: 210,
    spriteOffsetX: 118,
    spriteOffsetY: 498
}
```

### Interaction Radius Calculation

**interactRadius** determines how close the player must be to interact:

```javascript
// Player-to-door distance check (in TownManager)
const playerCenterX = player.x + player.width / 2;
const playerCenterY = player.y + player.height / 2;

const dx = doorCenterX - playerCenterX;
const dy = doorCenterY - playerCenterY;
const distance = Math.hypot(dx, dy);

// Can interact if:
if (distance <= door.interactRadius) {
    // Show "Press E to enter" prompt
}
```

**Recommended interaction radius values:**

```javascript
// Small door (100×120 px in sprite space)
interactRadius: 120    // Tight interaction

// Medium door (180×210 px in sprite space) - Most common
interactRadius: 160    // Standard interaction

// Large door (250×300 px in sprite space)
interactRadius: 200    // Wide interaction area

// Rule of thumb:
interactRadius = Math.max(door.width, door.height) * scale * 2
// Example: max(180, 210) × 0.4 × 2 = 210 × 0.4 × 2 = 168
```

### Complete Door Configuration Examples

**Example 1: Beachside Boba (Small Shop)**
```javascript
{
    id: 'beachside_boba',
    name: 'Beachside Boba',
    exterior: {
        x: 9400,
        y: 0,
        width: 400,              // Source: 800px (2 frames horizontal)
        height: 520,
        frames: 2,
        frameWidth: 400,
        frameHeight: 520,
        frameDirection: 'horizontal',
        scale: 0.5,
        sprite: 'art/bg/buildings/exterior/beachside-boba.png'
    },
    door: {
        width: 108,              // 320 - 212 = 108
        height: 144,             // 524 - 380 = 144
        spriteOffsetX: 212,      // Door starts at X=212 in sprite
        spriteOffsetY: 380,      // Door starts at Y=380 in sprite
        interactRadius: 140
    }
    // Calculations:
    // doorWorldX = 9400 + (212 × 0.5) = 9400 + 106 = 9506
    // doorCenterX = 9506 + (108 × 0.5)/2 = 9506 + 27 = 9533
}
```

**Example 2: Club Cidic (Large Club)**
```javascript
{
    id: 'club_cidic',
    name: 'Club Cidic',
    exterior: {
        x: 10500,
        y: 0,
        width: 517,              // Source: 1034px (2 frames horizontal)
        height: 530,
        frames: 2,
        frameWidth: 517,
        frameHeight: 530,
        frameDirection: 'horizontal',
        scale: 0.44,
        sprite: 'art/bg/buildings/exterior/club-cidic.png'
    },
    door: {
        width: 124,              // 256 - 132 = 124
        height: 160,             // 466 - 306 = 160
        spriteOffsetX: 132,
        spriteOffsetY: 306,
        interactRadius: 150      // Slightly larger for big entrance
    }
    // Calculations:
    // doorWorldX = 10500 + (132 × 0.44) = 10500 + 58.08 = 10558.08
    // doorCenterX = 10558.08 + (124 × 0.44)/2 = 10558.08 + 27.28 = 10585.36
}
```

**Example 3: Side Entrance (Off-Center Door)**
```javascript
{
    id: 'warehouse',
    exterior: {
        x: 14500,
        y: 0,
        width: 680,
        height: 720,
        frames: 2,
        frameDirection: 'horizontal',
        scale: 0.42,
        sprite: 'art/bg/buildings/exterior/warehouse.png'
    },
    door: {
        width: 160,
        height: 220,
        spriteOffsetX: 480,     // Right side of building (680 - 200 = 480)
        spriteOffsetY: 440,
        interactRadius: 150
    }
    // Result: Door at world x = 14500 + (480 × 0.42) = 14701.6
    // Off-center door on right side of building
}
```

---

## Asset Kit System (Complete Breakdown)

Asset kits provide reusable, swappable art packages for town components. They eliminate repetitive configuration and ensure visual consistency across towns.

### Asset Kit Structure

```javascript
TownsConfig.assetKits = {
    kitName: {
        groundTile: { /* Ground texture config */ },
        backdropSlices: [ /* Start/Mid/End backdrop pieces */ ],
        streetLamp: { /* Lamp prop config */ },
        house: { /* House template with interior */ }
    }
}
```

### Required Components

Every asset kit must define these four components:

#### 1. Ground Tile

**Purpose:** Repeating ground texture that tiles across the entire town region.

**Configuration:**
```javascript
groundTile: {
    id: 'shore_ground_tile',
    role: 'groundTile',           // Required identifier
    name: 'Cobble Ground',
    sprite: 'art/bg/tiles/beach-cobble.png',
    frameWidth: 1024,             // Source tile dimensions
    frameHeight: 1024,
    tileX: true,                  // Enable horizontal tiling
    scale: 0.04,                  // Display scale (40px displayed height)
    layer: 'ground',              // Render layer
    autoAlignToGround: true       // Snap to ground platform
}
```

**Scaling calculation:**
```javascript
// Display dimensions
displayWidth = frameWidth × scale = 1024 × 0.04 = 40.96 px
displayHeight = frameHeight × scale = 1024 × 0.04 = 40.96 px

// Tiles horizontally across town region width
townWidth = region.endX - region.startX = 11500 - 6500 = 5000 px
tileCount = Math.ceil(townWidth / displayWidth) = Math.ceil(5000 / 40.96) ≈ 123 tiles
```

**Recommended values:**
- **Scale:** 0.03-0.05 (for 1024px source tiles)
- **Frame size:** 512px, 1024px, or 2048px (power of 2)
- **Layer:** `'ground'` (behind everything)

#### 2. Backdrop Slices

**Purpose:** Three-part backdrop system (start cap / tiled middle / end cap) for seamless background art.

**Configuration:**
```javascript
backdropSlices: [
    // START CAP (left side)
    {
        id: 'shore_fronds_start',
        role: 'backdrop',
        slot: 'start',                // Required: identifies position
        sprite: 'art/bg/town backdrop/frond-start.png',
        frameWidth: 1022,
        frameHeight: 988,
        scale: 0.10,                  // 102.2×98.8 px displayed
        layer: 'midground',
        autoAlignToGround: true
    },
    // MIDDLE (tiles to fill region)
    {
        id: 'shore_fronds_mid',
        role: 'backdrop',
        slot: 'mid',
        sprite: 'art/bg/town backdrop/fronds.png',
        frameWidth: 1022,
        frameHeight: 988,
        width: 35000,                 // Explicit span width (optional)
        tileX: true,                  // Enable tiling
        tileWidth: 128,               // Tile repeat step
        scale: 0.10,
        layer: 'midground',
        autoAlignToGround: true
    },
    // END CAP (right side)
    {
        id: 'shore_fronds_end',
        role: 'backdrop',
        slot: 'end',
        sprite: 'art/bg/town backdrop/frond-end.png',
        frameWidth: 1022,
        frameHeight: 988,
        scale: 0.10,
        layer: 'midground',
        autoAlignToGround: true
    }
]
```

**Positioning logic:**
```javascript
// TownManager calculates positions automatically
const startX = region.startX;  // Left edge of town
const startWidth = startSlice.frameWidth × startSlice.scale;

const endWidth = endSlice.frameWidth × endSlice.scale;
const endX = region.endX - endWidth;  // Right edge minus cap width

const midX = startX + startWidth;
const midWidth = endX - midX;  // Fill the gap between caps

// Result: Seamless backdrop across entire town
// [Start Cap][========== Tiled Middle ==========][End Cap]
```

**Layer options:**
- `'background'`: Far back (sky, distant mountains)
- `'backdrop'`: Mid-back (hills, trees)
- `'midground'`: Between backdrop and foreground (bushes, fronds)
- `'foreground'`: Front (buildings, characters, lamps)
- `'overlay'`: Very front (UI elements, effects)

#### 3. Street Lamp

**Purpose:** Decorative lamp props placed at specific slots in towns.

**Configuration:**
```javascript
streetLamp: {
    id: 'shore_lamp',
    role: 'streetLamp',           // Required identifier
    name: 'Street Lamp',
    sprite: 'art/bg/exterior-decor/street-lamp.png',
    width: 64,                    // Sprite width
    height: 180,                  // Sprite height
    layer: 'foreground',          // Render in front of player
    autoAlignToGround: true,
    collider: {                   // Optional collision box
        width: 50,
        height: 10,
        offsetX: 7,
        offsetY: 6
    }
}
```

**Placement via town config:**
```javascript
// In town definition
{
    streetLampCount: 3,
    lampSlots: [6900, 8200, 9500]  // World X positions
}

// TownManager spawns lamps at these X coordinates
// Y is auto-aligned to ground platform
```

#### 4. House Template

**Purpose:** Reusable building definition with exterior, door, and default interior.

**Configuration:**
```javascript
house: {
    id: 'shore_house_template',
    name: 'House',
    exterior: {
        sprite: 'art/bg/buildings/exterior/house.png',
        width: 689,               // Source sprite width
        height: 768,              // Source sprite height
        frames: 2,                // Closed + open frames
        frameWidth: 689,          // Per-frame width
        frameHeight: 768,         // Per-frame height
        frameDirection: 'horizontal',
        scale: 0.4,               // Display at 40% size
        autoAlignToGround: true
    },
    door: {
        width: 180,
        height: 210,
        spriteOffsetX: 118,       // Door position in sprite
        spriteOffsetY: 498,
        interactRadius: 160
    },
    collider: {                   // Building collision box
        width: 280,
        height: 18,
        offsetX: 6,
        offsetY: 60
    },
    interior: {
        id: 'shore_house_interior',  // Room ID to load
        spawn: { x: 200, y: 656 },
        exit: { x: 200, y: 690, radius: 80 },
        room: {                      // Optional inline room definition
            width: 1024,
            height: 720,
            autoFloor: true,
            autoWalls: true,
            backgroundImage: {
                src: 'art/bg/buildings/interior/house-inside.png',
                width: 1024,
                height: 720
            },
            platforms: [ /* ... */ ],
            npcs: [],
            items: [],
            theme: 'interior'
        }
    }
}
```

**Using house template in town:**
```javascript
{
    houseCount: { min: 3, max: 3 },
    houseSlots: [7200, 8800, 9600]  // Spawn 3 houses at these X positions
}
```

### Creating a Custom Asset Kit

**Example: Mountain Town Kit**

```javascript
assetKits: {
    mountain: {
        groundTile: {
            id: 'mountain_ground',
            role: 'groundTile',
            sprite: 'art/bg/tiles/stone-path.png',
            frameWidth: 1024,
            frameHeight: 1024,
            tileX: true,
            scale: 0.045,             // Slightly larger stones
            layer: 'ground',
            autoAlignToGround: true
        },
        backdropSlices: [
            {
                id: 'mountain_pines_start',
                role: 'backdrop',
                slot: 'start',
                sprite: 'art/bg/town backdrop/pines-start.png',
                frameWidth: 950,
                frameHeight: 1100,
                scale: 0.12,          // Taller trees
                layer: 'background',
                autoAlignToGround: true
            },
            {
                id: 'mountain_pines_mid',
                role: 'backdrop',
                slot: 'mid',
                sprite: 'art/bg/town backdrop/pines.png',
                frameWidth: 950,
                frameHeight: 1100,
                tileX: true,
                tileWidth: 140,
                scale: 0.12,
                layer: 'background',
                autoAlignToGround: true
            },
            {
                id: 'mountain_pines_end',
                role: 'backdrop',
                slot: 'end',
                sprite: 'art/bg/town backdrop/pines-end.png',
                frameWidth: 950,
                frameHeight: 1100,
                scale: 0.12,
                layer: 'background',
                autoAlignToGround: true
            }
        ],
        streetLamp: {
            id: 'mountain_lamp',
            role: 'streetLamp',
            sprite: 'art/bg/exterior-decor/iron-lamp.png',
            width: 58,
            height: 200,
            layer: 'foreground',
            autoAlignToGround: true
        },
        house: {
            id: 'mountain_cabin',
            exterior: {
                sprite: 'art/bg/buildings/exterior/cabin.png',
                frameWidth: 720,
                frameHeight: 820,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.38,
                autoAlignToGround: true
            },
            door: {
                width: 190,
                height: 240,
                spriteOffsetX: 265,
                spriteOffsetY: 520,
                interactRadius: 170
            },
            interior: {
                id: 'cabin_interior',
                spawn: { x: 220, y: 656 },
                exit: { x: 220, y: 690, radius: 80 }
            }
        }
    }
}
```

**Using the custom kit:**
```javascript
{
    id: 'summitTown',
    name: 'Summit Haven',
    assetKit: 'mountain',         // Reference custom kit
    region: { startX: 12000, endX: 16000 },
    houseSlots: [12800, 14200, 15400],
    lampSlots: [12500, 14500, 15800]
}
```

---

### Field Explanations
- `region.startX` / `region.endX`: World x-range that defines town boundaries. TownManager checks player.x each update.
- `music.id`: Track key used by AudioManager; unique per town. `music.src`: path to the file. `music.volume`: 0–1 linear gain.
- `banner`: Optional styling for the entry banner (background image + text color).

### Buildings
- `exterior`: Visual sprite and layout data.
  - `x`: World x position of the building’s left edge.
  - `y`: World y position. If `autoAlignToGround` is true, TownManager aligns it to the ground height (platform with type `ground`).
  - `width/height`: Source sprite dimensions. `scale`: multiplies display size.
  - `frames`: Animation frames (usually 2: closed/open). `frameDirection`: `'vertical'` or `'horizontal'`.
  - `frameWidth/frameHeight`: Per-frame size; if omitted, TownManager infers based on direction and sprite dimensions.
  - `layer`: Optional. Default `'foreground'`.
  - `autoAlignToGround`: If true, TownManager computes y so the building sits on the ground.
  - `sprite`: Path to exterior image.
- `door`: Interaction hotspot.
  - `width/height`: Raw size (scaled by `exterior.scale`).
  - `spriteOffsetX/spriteOffsetY`: Position inside the source sprite for the door; used to place the hotspot in world space.
  - `interactRadius`: Circle radius to allow entering.
  - `x/y`: Optional explicit world coords; if omitted, offsets are used.
- `interior`: How to enter a room.
  - `id`: Room id to load. TownManager resolves via `roomRegistry`, then `window.RoomDescriptors`, then legacy level conversion.
  - `spawn`, `exit`: Optional overrides for room entry/exit positions. If omitted, the room descriptor/registry defaults are used.
  - `room`: Optional full room descriptor inline (see docs/rooms.md). If provided, registry/global lookups are skipped for this building.
- `npcs`: Building-local NPC definitions that spawn with the town.

### Setpieces
Decor or background props. Fields:
- `x`, `y`: World position. If `autoAlignToGround` is true, TownManager aligns `y` based on ground height.
- `width/height`: Display size. If using frames, can be derived from `frameWidth/frameHeight * scale`.
- `layer`: Render layer (`background`, `backdrop`, `midground`, `ground`, `foreground`, `overlay`).
- `sprite`: Image path.
- `frames`, `frameDirection`, `frameTimeMs`: For animated sprites.
- `tileX`: If true, sprite tiles horizontally across `width`; `tileWidth` controls tile size.
- `scale`: Optional scale factor.

### Town NPCs
NPCs that belong to the town region.
- Core fields: `id`, `type: 'townNpc'`, `name`, `sprite`, `width`, `height`, `frames`, `idleFrame`, `walkFrames`, `talkFrames`, `dialogueId`.
- Movement: `speed`, `pauseMs`, `patrol` array (e.g., `[{ x: 13100 }, { x: 13900 }]`).
- TownManager spawns them when the town loads and re-aligns their y to the ground each ensure step.

## How TownManager Uses This Data
1) **Detection**: Each frame, it checks player.x against `region` for the current `levelId`.
2) **Loading**: When entering a town, it:
   - Builds renderables for buildings/setpieces.
   - Spawns town NPCs (via `entityFactory.townNpc`).
   - Plays town music (crossfading vs. base music).
3) **Doors**: `getNearbyBuildingDoor` finds the closest door within `interactRadius`. Interact triggers `enterBuilding`.
4) **Interiors**: `enterBuilding` resolves the interior:
   - Prefers `roomRegistry.get(id)` / `roomRegistry.build(id, overrides)`.
   - Falls back to `window.RoomDescriptors[id]`.
   - As a last resort, converts a `LevelDefinition` with `theme: 'interior'` into a room.
   - Then calls `RoomManager.enterRoom` with the normalized descriptor.
5) **Exit**: In rooms, standing in the `exit` zone calls `RoomManager.exitRoom()`, restoring the level snapshot and resuming town/base music.
6) **Decor Layers**: Town decor is sorted by layer (`ground` < `background` < `midground` < `foreground` < `overlay`) before rendering.

## Adding a New Town: Step-by-Step
1) **Pick/verify a level**: Ensure `levelId` exists in `LevelDefinitions` (see `game/scripts/levels/...`). If not, create a level first.
2) **Add town entry**: Append your town object to `TownsConfig.towns`.
3) **Add art/audio**: Place sprites under `game/art/...` and music under `game/music/...`. Use correct paths in `TownsConfig`.
4) **(Optional) Create interiors**: Define rooms under `game/scripts/rooms/*.js` and register with `roomRegistry.register('room_id', {...})` (see `docs/rooms.md`).
5) **Wire building interiors**: Set `building.interior.id` to your room id, and (optionally) `spawn/exit` overrides.
6) **Load order**: `game/index.html` already loads `TownsConfig`, `RoomRegistry`, `RoomManager`, and `TownManager`. Ensure your new room file is included if it’s not already part of the bundle/load chain.
7) **Test**: Run the game, travel to `region.startX`, watch for the banner/music, interact with doors, verify interiors/spawn/exit/collision.

## Common Pitfalls
- **Region too small**: If `startX`/`endX` are narrow, you may instantly exit the town. Give generous padding around doors.
- **Door mismatch**: Ensure `interior.id` exactly matches your room id. Otherwise, TownManager will show “Add Room” prompt.
- **Ground alignment issues**: If buildings float or sink, check the level’s `ground` platform height and `autoAlignToGround`.
- **Music silent**: Confirm `music.id` is unique and `music.src` is valid. TownManager preloads tracks but won’t play missing files.
- **Pop-in**: TownManager preloads sprites when possible; very large sprites or missing decode may delay first render. Keep exterior/setpiece sizes reasonable.

## Quick Reference: Field Defaults & Behaviors
- Town preload distance: `TownsConfig.preloadDistance` (px lookahead; default `3600`).
- Building frames: default `2`; direction defaults to `'vertical'` unless specified.
- Door interact radius: defaults to `max(doorWidth, doorHeight) * 0.6` if not provided.
- `autoAlignToGround`: true by default for buildings/setpieces; uses first `ground` platform y.
- Music crossfade duration: `TownManager.fadeDuration` (ms); default `1200`.

## Troubleshooting Checklist
- Banner doesn’t show: Confirm player.x enters `region` with matching `levelId`.
- Decor not visible: Check sprite paths; ensure images load (open DevTools Network tab).
- Door not interactable: Verify `interactRadius` and player proximity; ensure `door` coordinates are correct (use `debug` mode to see door overlays).
- Interior loads the wrong room: Double-check `interior.id` and that the correct room is registered before TownManager resolves it.

## Backdrops and Layering (e.g., Palm Fronds)
You can add backdrops/overlays via `setpieces` in `TownsConfig`. Key fields:
- `layer`: Controls draw order. Lower numbers are farther back; TownManager sorts with `{ background: 0, backdrop: 0.5, midground: 1, ground: 2, foreground: 3, overlay: 4 }`.
- `tileX`: Repeat the frame horizontally across `width` if true.
- `tileWidth`: Step size for tiling (defaults to `frameWidth * scale` if omitted).
- `autoAlignToGround`: If true, y is auto-set based on ground.
- `scale`: Scales the sprite frames.

Example (palm fronds backdrop):
```js
setpieces: [
  { id: 'shore_fronds_start', name: 'Fronds Start',
    x: 6500, y: 0,
    frameWidth: 1022, frameHeight: 988,
    tileX: false,
    layer: 'midground',
    autoAlignToGround: true,
    scale: 0.10,
    sprite: 'art/bg/town backdrop/frond-start.png'
  },
  { id: 'shore_fronds_mid', name: 'Fronds Mid',
    x: 6602, y: 0,
    width: 35000,
    frameWidth: 1022, frameHeight: 988,
    tileX: true, tileWidth: 128,
    layer: 'midground',
    autoAlignToGround: true,
    scale: 0.10,
    sprite: 'art/bg/town backdrop/fronds.png'
  },
  { id: 'shore_fronds_end', name: 'Fronds End',
    x: 10102, y: 0,
    frameWidth: 1022, frameHeight: 988,
    tileX: false,
    layer: 'midground',
    autoAlignToGround: true,
    scale: 0.10,
    sprite: 'art/bg/town backdrop/frond-end.png'
  }
]
```

Troubleshooting tips (based on fronds experience):
- **Not visible:** Check sprite paths; verify images load (DevTools Network). Ensure `tileX` and `width` are set if you expect repetition.
- **Wrong layer order:** Adjust `layer` to `background/backdrop/midground/foreground/overlay`. Fronds typically in `midground` so buildings/characters appear in front.
- **Misaligned to ground:** Set `autoAlignToGround: true` so y snaps to ground. If still off, adjust `y` manually or tweak `scale`.
- **Tiling gaps/stretch:** Set `tileWidth` to match your intended repeat step (often equals `frameWidth * scale`); ensure `width` covers your town span.
- **Performance:** Large tiled spans are fine, but keep images optimized and sizes reasonable.

---

## Complete Town Examples

### Example 1: Minimal Town (Single Building)

**Use case:** Small rest stop with one building and no NPCs.

```javascript
{
    id: 'waypoint',
    name: 'Lonely Waypoint',
    levelId: 'plains',
    region: { startX: 18000, endX: 19500 },    // 1500px span
    banner: {
        background: 'art/ui/scroll.png',
        textColor: '#8b7355'
    },
    music: {
        id: 'waypoint_ambient',
        src: 'music/waypoint.mp3',
        volume: 0.7
    },
    buildings: [
        {
            id: 'rest_stop',
            name: 'Rest Stop',
            exterior: {
                x: 18600,
                y: 0,
                width: 480,
                height: 560,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.36,
                autoAlignToGround: true,
                sprite: 'art/bg/buildings/exterior/rest-stop.png'
            },
            door: {
                width: 140,
                height: 180,
                spriteOffsetX: 170,
                spriteOffsetY: 360,
                interactRadius: 140
            },
            interior: {
                id: 'rest_stop_interior',
                spawn: { x: 200, y: 656 },
                exit: { x: 200, y: 690, radius: 80 },
                room: {
                    width: 1024,
                    height: 720,
                    autoFloor: true,
                    autoWalls: true,
                    backgroundImage: {
                        src: 'art/bg/buildings/interior/rest-stop-inside.png',
                        width: 1024,
                        height: 720
                    },
                    platforms: [
                        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' },
                        { x: 0, y: 0, width: 32, height: 720, type: 'wall' },
                        { x: 992, y: 0, width: 32, height: 720, type: 'wall' },
                        { x: 0, y: 0, width: 1024, height: 32, type: 'wall' }
                    ],
                    items: [
                        { type: 'health_potion', x: 400, y: 660, healAmount: 30 },
                        { type: 'coffee', x: 600, y: 660 }
                    ],
                    npcs: [],
                    theme: 'interior'
                }
            }
        }
    ],
    setpieces: [
        // Simple ground tile
        {
            id: 'waypoint_ground',
            x: 18000,
            y: 0,
            width: 1500,
            frameWidth: 512,
            frameHeight: 512,
            tileX: true,
            scale: 0.05,
            layer: 'ground',
            autoAlignToGround: true,
            sprite: 'art/bg/tiles/dirt-path.png'
        },
        // Single lamp
        {
            id: 'waypoint_lamp',
            x: 18350,
            y: 0,
            width: 64,
            height: 180,
            layer: 'foreground',
            autoAlignToGround: true,
            sprite: 'art/bg/exterior-decor/street-lamp.png'
        }
    ],
    npcs: []
}
```

**Result:** Compact town with single building, basic ground, one lamp, no NPCs.

---

### Example 2: Complete Shore Town (Using Asset Kit)

**Use case:** Full-featured beach town with asset kit, multiple buildings, NPCs, animated decor.

```javascript
{
    id: 'shoreTown',
    name: 'Beachside',
    levelId: 'testRoom',
    region: { startX: 6500, endX: 11500 },     // 5000px span
    banner: {
        background: 'art/ui/scroll.png',
        textColor: '#5c3a1a'
    },
    assetKit: 'shore',                         // Uses shore asset kit
    houseCount: { min: 3, max: 3 },
    houseSlots: [7200, 8800, 9600],            // Auto-places 3 houses
    streetLampCount: 3,
    lampSlots: [6900, 8200, 9500],             // Auto-places 3 lamps
    itemPlan: { count: 3, spacing: 420 },      // Guarantees 3 items
    music: {
        id: 'shoreTownTheme',
        src: 'music/beachside.mp3',
        volume: 0.9
    },
    buildings: [
        // Custom building 1: Boba shop
        {
            id: 'beachside_boba',
            name: 'Beachside Boba',
            exterior: {
                x: 9400,
                y: 0,
                width: 400,
                height: 520,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.5,
                autoAlignToGround: true,
                sprite: 'art/bg/buildings/exterior/beachside-boba.png'
            },
            door: {
                width: 108,
                height: 144,
                spriteOffsetX: 212,
                spriteOffsetY: 380,
                interactRadius: 140
            },
            interior: {
                id: 'beachside_boba_interior',
                spawn: { x: 240, y: 656 },
                exit: { x: 240, y: 690, radius: 80 },
                room: {
                    width: 1024,
                    height: 720,
                    backgroundImage: {
                        src: 'art/bg/buildings/interior/beachside-boba-inside.png',
                        width: 1024,
                        height: 720
                    },
                    platforms: [
                        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' },
                        { x: 0, y: 0, width: 32, height: 720, type: 'wall' },
                        { x: 992, y: 0, width: 32, height: 720, type: 'wall' }
                    ],
                    npcs: [
                        {
                            id: 'alicia',
                            type: 'townNpc',
                            name: 'Alicia',
                            sprite: 'art/sprites/alicia.png',
                            width: 33,
                            height: 64,
                            frames: 2,
                            idleFrame: 0,
                            walkFrames: [0, 1],
                            talkFrames: [0, 1],
                            dialogueId: 'npc.alicia',
                            x: 750,
                            y: 626,
                            speed: 0
                        }
                    ],
                    music: {
                        id: 'beachside_boba_theme',
                        src: 'music/beachside-boba.mp3',
                        volume: 0.9
                    },
                    theme: 'interior'
                }
            }
        },
        // Custom building 2: Club
        {
            id: 'club_cidic',
            name: 'Club Cidic',
            exterior: {
                x: 10500,
                y: 0,
                width: 517,
                height: 530,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.44,
                autoAlignToGround: true,
                sprite: 'art/bg/buildings/exterior/club-cidic.png'
            },
            door: {
                width: 124,
                height: 160,
                spriteOffsetX: 132,
                spriteOffsetY: 306,
                interactRadius: 150
            },
            interior: {
                id: 'club_cidic_interior',
                spawn: { x: 200, y: 960 },
                exit: { x: 200, y: 994, radius: 90 },
                room: {
                    width: 1536,                    // Large room
                    height: 1024,
                    backgroundImage: {
                        src: 'art/bg/buildings/interior/club-cidic-inside.png',
                        width: 1536,
                        height: 1024
                    },
                    platforms: [
                        { x: 0, y: 994, width: 1536, height: 30, type: 'ground' },
                        { x: 0, y: 0, width: 32, height: 1024, type: 'wall' },
                        { x: 1504, y: 0, width: 32, height: 1024, type: 'wall' }
                    ],
                    npcs: [
                        {
                            id: 'dj_cidic',
                            type: 'townNpc',
                            name: 'DJ Cidic',
                            sprite: 'art/sprites/dj-cidic.png',
                            width: 165,
                            height: 133,
                            frames: 9,
                            idleFrame: 0,
                            walkFrames: [0, 6],
                            talkFrames: [7, 8],
                            dialogueId: 'npc.dj_cidic',
                            x: 750,
                            y: 861,                 // Large room Y: 994 - 133
                            speed: 0
                        }
                    ],
                    music: {
                        id: 'club_cidic_theme',
                        src: 'music/time-to-slime.mp3',
                        volume: 0.9
                    },
                    theme: 'interior'
                }
            }
        }
    ],
    setpieces: [
        // Animated fountain
        {
            id: 'fountain_center',
            name: 'Fountain',
            x: 8200,
            y: 0,
            width: 517,
            height: 507,
            frames: 12,                         // 12-frame animation
            frameWidth: 517,
            frameHeight: 507,
            frameDirection: 'horizontal',
            frameTimeMs: 120,
            scale: 0.4,
            layer: 'foreground',
            autoAlignToGround: true,
            sprite: 'art/bg/exterior-decor/fountain.png',
            collider: { width: 200, height: 24, offsetX: 80, offsetY: 180 }
        },
        // Static bench
        {
            id: 'bench_center',
            name: 'Bench',
            x: 8000,
            y: 0,
            width: 120,
            height: 64,
            layer: 'foreground',
            autoAlignToGround: true,
            sprite: 'art/bg/exterior-decor/bench.png',
            collider: { width: 120, height: 12, offsetX: 0, offsetY: 32 }
        }
    ],
    npcs: [
        // Town wanderer 1
        {
            id: 'mike',
            type: 'townNpc',
            name: 'Mike',
            sprite: 'art/sprites/mike.png',
            width: 38,
            height: 63,
            frames: 4,
            idleFrame: 2,
            walkFrames: [2, 3],
            talkFrames: [0, 1],
            dialogueId: 'npc.mike',
            speed: 40,
            pauseMs: 30,
            x: 8200,
            patrol: [
                { x: 8000 },
                { x: 8800 }
            ]
        },
        // Town wanderer 2
        {
            id: 'melissa',
            type: 'townNpc',
            name: 'Melissa',
            sprite: 'art/sprites/melissa.png',
            width: 57,
            height: 75,
            frames: 4,
            idleFrame: 2,
            walkFrames: [3, 4],
            talkFrames: [1, 0],
            dialogueId: 'npc.melissa',
            speed: 30,
            pauseMs: 40,
            x: 9000,
            patrol: [
                { x: 9000 },
                { x: 9800 }
            ]
        }
    ]
}
```

**Result:** Full beach town with:
- Asset kit provides ground tile + frond backdrops + 3 auto-placed houses + 3 lamps
- 2 custom buildings (boba shop, club) with interior NPCs
- Animated fountain + bench setpieces
- 2 patrolling town NPCs
- Guaranteed 3 items from pool

---

### Example 3: Dense Urban Town (Many Buildings, No Asset Kit)

**Use case:** City district with hand-placed buildings, no asset kit.

```javascript
{
    id: 'marketDistrict',
    name: 'Market District',
    levelId: 'cityLevel',
    region: { startX: 20000, endX: 26000 },    // 6000px span
    banner: {
        background: 'art/ui/banner-stone.png',
        textColor: '#2a2a2a'
    },
    music: {
        id: 'market_bustle',
        src: 'music/market.mp3',
        volume: 0.85
    },
    buildings: [
        // Shop 1: Weapon smith
        {
            id: 'weapon_smith',
            name: 'Steel & Edge',
            exterior: {
                x: 20400,
                y: 0,
                width: 520,
                height: 640,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.42,
                autoAlignToGround: true,
                sprite: 'art/bg/buildings/exterior/weapon-shop.png'
            },
            door: {
                width: 160,
                height: 200,
                spriteOffsetX: 180,
                spriteOffsetY: 420,
                interactRadius: 150
            },
            interior: {
                id: 'weapon_smith_interior',
                spawn: { x: 220, y: 656 },
                exit: { x: 220, y: 690, radius: 80 }
            }
        },
        // Shop 2: Potion shop
        {
            id: 'potion_shop',
            name: 'Elixir Emporium',
            exterior: {
                x: 21200,
                y: 0,
                width: 480,
                height: 600,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.40,
                autoAlignToGround: true,
                sprite: 'art/bg/buildings/exterior/potion-shop.png'
            },
            door: {
                width: 140,
                height: 190,
                spriteOffsetX: 170,
                spriteOffsetY: 390,
                interactRadius: 140
            },
            interior: {
                id: 'potion_shop_interior',
                spawn: { x: 200, y: 656 },
                exit: { x: 200, y: 690, radius: 80 }
            }
        },
        // Shop 3: General store
        {
            id: 'general_store',
            name: 'General Goods',
            exterior: {
                x: 22000,
                y: 0,
                width: 560,
                height: 680,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.38,
                autoAlignToGround: true,
                sprite: 'art/bg/buildings/exterior/general-store.png'
            },
            door: {
                width: 170,
                height: 210,
                spriteOffsetX: 195,
                spriteOffsetY: 450,
                interactRadius: 160
            },
            interior: {
                id: 'general_store_interior',
                spawn: { x: 210, y: 656 },
                exit: { x: 210, y: 690, radius: 80 }
            }
        },
        // Inn
        {
            id: 'market_inn',
            name: 'The Resting Merchant',
            exterior: {
                x: 23000,
                y: 0,
                width: 720,
                height: 820,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.45,
                autoAlignToGround: true,
                sprite: 'art/bg/buildings/exterior/inn.png'
            },
            door: {
                width: 200,
                height: 260,
                spriteOffsetX: 260,
                spriteOffsetY: 530,
                interactRadius: 180
            },
            interior: {
                id: 'market_inn_interior',
                spawn: { x: 240, y: 656 },
                exit: { x: 240, y: 690, radius: 90 }
            }
        },
        // Bank
        {
            id: 'city_bank',
            name: 'First National',
            exterior: {
                x: 24200,
                y: 0,
                width: 800,
                height: 900,
                frames: 2,
                frameDirection: 'horizontal',
                scale: 0.40,
                autoAlignToGround: true,
                sprite: 'art/bg/buildings/exterior/bank.png'
            },
            door: {
                width: 240,
                height: 300,
                spriteOffsetX: 280,
                spriteOffsetY: 570,
                interactRadius: 200
            },
            interior: {
                id: 'city_bank_interior',
                spawn: { x: 260, y: 656 },
                exit: { x: 260, y: 690, radius: 100 }
            }
        }
    ],
    setpieces: [
        // Cobblestone ground
        {
            id: 'market_cobble',
            x: 20000,
            y: 0,
            width: 6000,
            frameWidth: 1024,
            frameHeight: 1024,
            tileX: true,
            scale: 0.038,
            layer: 'ground',
            autoAlignToGround: true,
            sprite: 'art/bg/tiles/cobblestone.png'
        },
        // Street lamps (manual placement)
        {
            id: 'lamp_1',
            x: 20800,
            y: 0,
            width: 64,
            height: 200,
            layer: 'foreground',
            autoAlignToGround: true,
            sprite: 'art/bg/exterior-decor/iron-lamp.png'
        },
        {
            id: 'lamp_2',
            x: 22400,
            y: 0,
            width: 64,
            height: 200,
            layer: 'foreground',
            autoAlignToGround: true,
            sprite: 'art/bg/exterior-decor/iron-lamp.png'
        },
        {
            id: 'lamp_3',
            x: 24600,
            y: 0,
            width: 64,
            height: 200,
            layer: 'foreground',
            autoAlignToGround: true,
            sprite: 'art/bg/exterior-decor/iron-lamp.png'
        },
        // Market stall
        {
            id: 'fruit_stall',
            x: 21600,
            y: 0,
            width: 180,
            height: 220,
            layer: 'foreground',
            autoAlignToGround: true,
            sprite: 'art/bg/exterior-decor/fruit-stall.png',
            collider: { width: 180, height: 20, offsetX: 0, offsetY: 50 }
        }
    ],
    npcs: [
        // Merchant 1
        {
            id: 'vendor_sam',
            type: 'townNpc',
            name: 'Sam',
            sprite: 'art/sprites/vendor.png',
            width: 42,
            height: 68,
            frames: 4,
            idleFrame: 2,
            walkFrames: [2, 3],
            talkFrames: [0, 1],
            dialogueId: 'npc.vendor_sam',
            speed: 0,
            x: 21660,
            patrol: [{ x: 21660 }]
        },
        // Guard patrol
        {
            id: 'guard_patrol',
            type: 'townNpc',
            name: 'City Guard',
            sprite: 'art/sprites/guard.png',
            width: 50,
            height: 80,
            frames: 4,
            idleFrame: 2,
            walkFrames: [2, 3],
            talkFrames: [0, 1],
            dialogueId: 'npc.city_guard',
            speed: 35,
            pauseMs: 80,
            x: 22000,
            patrol: [
                { x: 20600 },
                { x: 25400 }
            ]
        },
        // Citizen wanderer
        {
            id: 'citizen_jane',
            type: 'townNpc',
            name: 'Jane',
            sprite: 'art/sprites/citizen-f.png',
            width: 44,
            height: 72,
            frames: 4,
            idleFrame: 2,
            walkFrames: [2, 3],
            talkFrames: [0, 1],
            dialogueId: 'npc.citizen_jane',
            speed: 38,
            pauseMs: 45,
            x: 23000,
            patrol: [
                { x: 22200 },
                { x: 24000 }
            ]
        }
    ],
    itemPlan: {
        count: 5,
        spacing: 500,
        pool: [
            { type: 'coffee' },
            { type: 'health_potion', healAmount: 25 },
            { type: 'stamina_boost' }
        ]
    }
}
```

**Result:** Dense city district with:
- 5 unique buildings (weapon shop, potion shop, general store, inn, bank)
- Hand-placed cobblestone ground + 3 lamps + market stall
- 3 NPCs (stationary vendor, patrolling guard, wandering citizen)
- 5 guaranteed items spread across town
- No asset kit (all manual configuration)

---

## Quick Reference: Town Configuration Checklist

✅ **Essential Fields:**
- [ ] `id` - Unique town identifier
- [ ] `name` - Display name for banner
- [ ] `levelId` - Attach to existing level
- [ ] `region: { startX, endX }` - World boundaries

✅ **Optional but Recommended:**
- [ ] `banner` - Entry banner styling
- [ ] `music` - Town theme audio
- [ ] `buildings` - At least one building with interior
- [ ] `setpieces` - Ground tile + decorative props
- [ ] `npcs` - At least one NPC for interaction

✅ **For Each Building:**
- [ ] `exterior.x` - World position
- [ ] `exterior.sprite` - Building image path
- [ ] `exterior.scale` - Display size (0.3-0.5 typical)
- [ ] `door.spriteOffsetX/Y` - Door position in sprite
- [ ] `door.interactRadius` - Interaction distance
- [ ] `interior.id` - Room to load
- [ ] `interior.spawn` - Player entry position
- [ ] `interior.exit` - Return to town trigger

✅ **Asset Kit Usage:**
- [ ] Define or reference existing kit
- [ ] Set `houseSlots` for house positions
- [ ] Set `lampSlots` for lamp positions
- [ ] Configure `itemPlan` for guaranteed items

✅ **Testing:**
- [ ] Player enters town region (banner shows)
- [ ] Town music plays and crossfades
- [ ] Buildings render correctly (no floating/sinking)
- [ ] Doors interactive at correct positions
- [ ] Interiors load with proper spawn/exit
- [ ] NPCs patrol and dialogue works
- [ ] Items spawn in town region

---

## Adding and Editing Town Sprites

This section explains how town assets are spawned, how to edit their positions, and how to add new decorative sprites.

### How Town Assets Are Spawned

**Configuration File:** All town asset definitions live in `game/scripts/core/config/TownsConfig.js`

**Spawning Process:**
1. **Preloading** - Assets are created and cached before player enters town region
2. **Rendering** - TownManager converts data into renderable objects via `buildDecorRenderable()`
3. **Viewport Culling** - Only renders assets within 2000px of viewport (reduces lag)
4. **Ground Alignment** - Auto-positions assets on ground platforms when `autoAlignToGround: true`

**Asset Types:**

#### Setpieces (Decorative Objects)
Static or animated decorations like fountains, benches, trees, lamps.

**Example:**
```js
setpieces: [
    {
        id: 'fountain_center',
        name: 'Fountain',
        x: 8200,              // X coordinate in world space
        y: 0,                 // Y coordinate (0 = auto-align to ground)
        width: 517,           // Display width
        height: 507,          // Display height
        frames: 12,           // Number of animation frames (1 = static)
        frameWidth: 517,      // Source image frame width
        frameHeight: 507,     // Source image frame height
        frameDirection: 'horizontal',  // 'horizontal' or 'vertical'
        frameTimeMs: 120,     // Animation speed (ms per frame)
        scale: 0.4,           // Size multiplier (0.4 = 40% of original)
        layer: 'foreground',  // Render layer (see below)
        autoAlignToGround: true,
        sprite: 'art/bg/exterior-decor/fountain.png',
        collider: {           // Optional collision box
            width: 200,
            height: 24,
            offsetX: 80,      // Offset from item's x position
            offsetY: 180      // Offset from item's y position
        }
    }
]
```

**Key Properties:**
- `x`, `y` - World position (x increases right, y increases down)
- `autoAlignToGround: true` - Positions asset on ground automatically (y value ignored)
- `layer` - Controls render order:
  - `background` (0) - Behind everything
  - `backdrop` (0.5) - Decorative backdrop
  - `midground` (1) - Between background and foreground
  - `ground` (2) - Ground tiles
  - `foreground` (3) - Most decorations
  - `overlay` (4) - In front of everything
- `scale` - Resizes sprite (0.4 = 40%, 1.0 = 100%, 2.0 = 200%)
- `tileX: true` - Repeats sprite horizontally across width
- `tileWidth` - Tile step size (defaults to frameWidth * scale)
- `collider` - Makes asset solid (player can't walk through)

#### Buildings
Structures with doors and interiors.

**Example:**
```js
buildings: [
    {
        id: 'shore_house',
        name: 'House',
        exterior: {
            x: 7200,          // Building X position in world
            y: 0,             // Auto-aligned to ground
            width: 689,       // Source sprite width
            height: 768,      // Source sprite height
            frames: 2,        // Number of frames (closed/open door)
            frameWidth: 689,
            frameHeight: 768,
            frameDirection: 'horizontal',
            scale: 0.4,       // Display size multiplier
            autoAlignToGround: true,
            sprite: 'art/bg/buildings/exterior/house.png'
        },
        door: {
            width: 180,
            height: 210,
            spriteOffsetX: 118,  // Door position relative to building sprite
            spriteOffsetY: 498,
            interactRadius: 160   // How close player must be to interact
        },
        collider: {              // Collision box for building base
            width: 280,
            height: 18,
            offsetX: 6,
            offsetY: 60
        }
    }
]
```

#### NPCs (Town Characters)
NPCs that patrol and interact within the town.

**Example:**
```js
npcs: [
    {
        id: 'mike',
        type: 'townNpc',
        name: 'Mike',
        sprite: 'art/sprites/mike.png',
        width: 38,
        height: 63,
        x: 8200,              // Starting X position
        spriteDefaultFacesLeft: true,  // Sprite orientation
        patrol: [
            { x: 8000 },      // Patrol waypoints
            { x: 8800 }
        ]
    }
]
```

---

### Editing Existing Asset Coordinates

To move an existing asset, find it in `TownsConfig.js` and change its `x` value:

**Before:**
```js
{ id: 'fountain_center', x: 8200, y: 0, ... }
```

**After (moved 800px right):**
```js
{ id: 'fountain_center', x: 9000, y: 0, ... }
```

**Coordinate System:**
- X increases **right** (e.g., shoreTown region: 6500 → 11500)
- Y increases **down** (but `autoAlignToGround: true` ignores y and snaps to ground)
- Region bounds define town area: `region: { startX: 6500, endX: 11500 }`

**Tips:**
- Use the town's `region` values as reference for valid X coordinates
- Keep assets within `startX` to `endX` to ensure they appear in town
- Buildings typically need 200-400px spacing to avoid overlap
- Setpieces can be placed anywhere in the region

---

### Adding New Sprites

**Step 1: Add sprite file to project**

Place your image in the appropriate folder:
- Buildings: `game/art/bg/buildings/exterior/`
- Decorations: `game/art/bg/exterior-decor/`
- Ground tiles: `game/art/bg/tiles/`
- Backdrops: `game/art/bg/town backdrop/`
- NPCs: `game/art/sprites/`

**Step 2: Add to TownsConfig.js**

Find the town's `setpieces` array and add your new object:

```js
setpieces: [
    // ... existing setpieces
    {
        id: 'my_palm_tree',           // Unique identifier
        name: 'Palm Tree',            // Display name
        x: 7500,                      // X position in world
        y: 0,                         // 0 = auto-align to ground
        width: 100,                   // Display width
        height: 150,                  // Display height
        frameWidth: 100,              // Source image frame width
        frameHeight: 150,             // Source image frame height
        frames: 1,                    // 1 = static, >1 = animated
        scale: 1.0,                   // Size multiplier (1.0 = original size)
        layer: 'foreground',          // Render layer
        autoAlignToGround: true,
        sprite: 'art/bg/exterior-decor/palm-tree.png',
        collider: {                   // Optional collision
            width: 30,
            height: 20,
            offsetX: 35,              // Center collision under tree
            offsetY: 130              // At tree base
        }
    }
]
```

**Step 3: Reload the game**

Changes take effect when you reload the level. No need to restart the server.

---

### Configuration Options Reference

#### Required Fields
- `id` - Unique identifier for this asset
- `sprite` - Path to image file
- `x` - X position in world coordinates

#### Display Properties
- `width` - Display width (defaults to frameWidth * scale)
- `height` - Display height (defaults to frameHeight * scale)
- `scale` - Size multiplier (default: 1.0)
- `y` - Y position (default: 0, auto-aligned if `autoAlignToGround: true`)

#### Animation (for multi-frame sprites)
- `frames` - Number of frames (default: 1)
- `frameWidth` - Width of each frame in sprite sheet
- `frameHeight` - Height of each frame in sprite sheet
- `frameDirection` - `'horizontal'` or `'vertical'` (default: 'vertical')
- `frameTimeMs` - Milliseconds per frame (default: 200)

#### Rendering
- `layer` - Render layer (default: 'foreground')
  - Use `'background'` for far backdrop
  - Use `'midground'` for middle layer decorations
  - Use `'foreground'` for most objects
  - Use `'overlay'` for effects in front of player
- `autoAlignToGround` - Auto-position on ground (default: false for setpieces, true for buildings)

#### Tiling (for repeating patterns)
- `tileX` - Repeat sprite horizontally (default: false)
- `tileWidth` - Width of each tile (default: frameWidth * scale)

#### Collision
- `collider` - Collision box definition
  - `width` - Collision width
  - `height` - Collision height (default: 16)
  - `offsetX` - Horizontal offset from asset's x (default: 0)
  - `offsetY` - Vertical offset from asset's y (default: 0)
  - Creates invisible one-way platform (land from above only)

---

### Common Patterns

**Static Decoration (No Animation):**
```js
{
    id: 'bench',
    x: 8000,
    y: 0,
    width: 120,
    height: 64,
    layer: 'foreground',
    autoAlignToGround: true,
    sprite: 'art/bg/exterior-decor/bench.png'
}
```

**Animated Decoration:**
```js
{
    id: 'flag',
    x: 9500,
    y: 0,
    width: 80,
    height: 120,
    frames: 8,
    frameWidth: 80,
    frameHeight: 120,
    frameDirection: 'horizontal',
    frameTimeMs: 100,
    layer: 'foreground',
    autoAlignToGround: true,
    sprite: 'art/bg/exterior-decor/flag-animation.png'
}
```

**Tiling Ground Tile:**
```js
{
    id: 'cobblestone',
    x: 6500,              // Start of town region
    y: 0,
    width: 5000,          // Entire town width
    height: 40,
    frameWidth: 1024,
    frameHeight: 1024,
    tileX: true,          // Repeat across width
    layer: 'ground',
    scale: 0.04,
    autoAlignToGround: true,
    sprite: 'art/bg/tiles/cobblestone.png'
}
```

**Decoration with Collision:**
```js
{
    id: 'crate',
    x: 8500,
    y: 0,
    width: 60,
    height: 60,
    layer: 'foreground',
    autoAlignToGround: true,
    sprite: 'art/bg/exterior-decor/crate.png',
    collider: {
        width: 60,
        height: 20,
        offsetX: 0,
        offsetY: 40        // Top of crate for standing
    }
}
```

---

### Troubleshooting

**Sprite Not Appearing:**
- Verify sprite path is correct (check `game/art/...` folders)
- Ensure `x` coordinate is within town's `region: { startX, endX }`
- Check browser console for image loading errors
- Verify `layer` is set (defaults to 'foreground' if omitted)

**Sprite Position Wrong:**
- Remember: `autoAlignToGround: true` ignores `y` value and snaps to ground
- For precise Y positioning, set `autoAlignToGround: false` and specify exact `y`
- Use town region bounds as reference for valid X coordinates

**Sprite Size Wrong:**
- Check `scale` value (0.5 = 50%, 1.0 = 100%, 2.0 = 200%)
- Verify `frameWidth` and `frameHeight` match source image dimensions
- For animated sprites, ensure frame dimensions are correct

**Animation Not Playing:**
- Verify `frames > 1`
- Check `frameDirection` matches sprite sheet layout
- Ensure `frameTimeMs` is reasonable (50-200ms typical)
- Verify `frameWidth` and `frameHeight` are set correctly

**Collision Not Working:**
- Colliders are **one-way platforms** (land from above only)
- Verify `collider.offsetY` positions box at top of asset
- Check `collider.width` and `collider.height` are appropriate
- Player must be descending to land on one-way platforms

**Sprite Rendering Behind/In Front of Other Assets:**
- Adjust `layer` property:
  - Lower layers render first (background)
  - Higher layers render last (overlay)
- Common order: background < midground < ground < foreground < overlay
