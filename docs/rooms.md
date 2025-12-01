# Creating a New Room (Interiors) from Scratch

This guide walks you through adding a brand-new room/interior, wiring it to a building, and understanding the underlying variables, classes, and data structures. Follow it top-to-bottom if you're new to the room system.

## Key Concepts
- **Room**: A self-contained interior world (walls/floor, background art, entities). It uses the existing HUD, camera, physics, and renderer, but swaps out level entities.
- **RoomRegistry** (`game/scripts/rooms/RoomRegistry.js`): A data catalog and normalizer. You register room descriptors here and it applies sensible defaults (sizes, music, auto floor/walls).
- **RoomManager** (`game/scripts/rooms/RoomManager.js`): Runtime controller that builds a room world, swaps into it, and restores the level on exit.
- **RoomWorldBuilder** (inside `RoomManager.js`): Converts a plain descriptor into live entities, auto-adds floor/walls, and builds background layers.
- **TownManager** (`game/scripts/town/TownManager.js`): Resolves building interiors to room descriptors (prefers `roomRegistry`, falls back to global `RoomDescriptors` or legacy level-to-room conversion) and calls `RoomManager.enterRoom(...)`.

## What You Need to Define
- `id` (string): Unique room identifier; used by buildings and lookups.
- `width` / `height` (numbers): Pixel dimensions of the room. Defaults: `1024x720`.
- `spawn` (object): Where the player appears in the room. `{ x, y }` in pixels.
- `exit` (object): Area that triggers leaving the room. `{ x, y, radius }` or `{ x, y, width, height }`.
- `music` (object, optional): `{ src, volume }`. Defaults to `music/beach-house.mp3` @ `0.8`.
- `backgroundImage` (object, optional): `{ src, width, height }` drawn 1:1 to the room bounds. If omitted, a black backplate renders.
- `backgroundLayers` (array, optional): Advanced; custom layer objects with `render(ctx, camera)` / `update(...)`. If provided, they replace the auto-built background image.
- `autoFloor` / `autoWalls` (bool, optional): Defaults `true`. Disable if you want full manual platform control.
- `platforms` (array, optional): Rectangles the player and entities collide with. Auto floor/walls are added unless you disable them.
- Entity lists (arrays, optional): `enemies`, `items`, `hazards`, `chests`, `npcs`, `projectiles` (projectiles usually empty).

## Minimal Room Descriptor
Place it under `game/scripts/rooms/YourRoom.js`. You can export via the registry and optionally expose a legacy global for compatibility.

```js
// game/scripts/rooms/LibraryInterior.js
const libraryInterior = {
  id: 'library_interior',
  width: 960,
  height: 640,
  spawn: { x: 180, y: 480 },           // player start
  exit: { x: 180, y: 520, radius: 90 },// spherical exit trigger
  music: { src: 'music/library.mp3', volume: 0.75 },
  backgroundImage: {
    src: 'art/bg/buildings/interior/library.png',
    width: 960,
    height: 640
  },
  platforms: [
    // Optional; auto floor/walls are added if you omit these
    { x: 0, y: 600, width: 960, height: 40, type: 'ground' }
  ],
  enemies: [],
  items: [],
  hazards: [],
  chests: [],
  npcs: [
    // Example NPC placeholder; relies on EntityFactory.create({type:'townNpc', ...})
    { type: 'townNpc', id: 'librarian', x: 520, y: 520, sprite: 'art/sprites/librarian.png' }
  ],
  theme: 'interior'
};

// Prefer the shared registry so TownManager/RoomManager pick it up by id
const registry = (typeof window !== 'undefined' ? window.roomRegistry : null);
registry?.register?.('library_interior', libraryInterior);

// Optional legacy global export (keeps older lookup paths working)
if (typeof window !== 'undefined') {
  window.RoomDescriptors = window.RoomDescriptors || {};
  window.RoomDescriptors.library_interior = libraryInterior;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = libraryInterior;
}
```

### Key Fields Explained
- `id`: The lookup key. Buildings refer to this.
- `width`/`height`: Used to set room bounds, camera clamps, auto-wall placement.
- `spawn`: Player spawn point. If omitted, defaults to `(20% of width, height-200)`.
- `exit`: Trigger zone; radius is easiest. If omitted, defaults near spawn.
- `music`: Room-only track; Town/Level tracks are muted while inside.
- `backgroundImage`: Drawn once behind everything; ensure it matches room dimensions.
- `platforms`: Solid rectangles. Auto-add floor/walls unless you set `autoFloor/autoWalls: false`.
- `theme`: Sets `currentTheme` for rendering/lighting flavor; default `'interior'`.

## Registering with RoomRegistry
Why: The registry normalizes data (defaults, spawn/exit, auto floor/walls, music) and keeps a single source of truth.

```js
// Register once, e.g., inside your room file or a central loader
roomRegistry.register('library_interior', {
  width: 960,
  height: 640,
  spawn: { x: 180, y: 480 },
  exit: { x: 180, y: 520, radius: 90 },
  backgroundImage: { src: 'art/bg/buildings/interior/library.png', width: 960, height: 640 },
  music: { src: 'music/library.mp3', volume: 0.75 }
});
```

### Per-Building Overrides
If two buildings share the same base room but need small tweaks (e.g., different spawn/exit or art variant):

```js
const desc = roomRegistry.build('library_interior', {
  spawn: { x: 280, y: 500 },         // override only for this entry point
  music: { volume: 0.6 }             // tweak volume without duplicating the base
});
```

`build(id, overrides)` merges the registered room with your overrides and normalizes spawn/exit.

## Hooking a Building to the Room
Towns reference interiors in `game/scripts/core/config/TownsConfig.js`. Point the building at your room id.

```js
// Inside a building entry in TownsConfig
interior: {
  id: 'library_interior',                   // must match your room id
  spawn: { x: 180, y: 480 },                // optional; overrides registry spawn
  exit: { x: 180, y: 520, radius: 90 },     // optional; overrides registry exit
  // Optionally inline a full room if you don't want to pre-register:
  // room: { ...full room descriptor... }
}
```

When the player interacts with the door:
1) `TownManager` resolves the interior: it tries `roomRegistry`, then `window.RoomDescriptors`, then legacy level conversion.
2) It calls `RoomManager.enterRoom(...)` with the descriptor (normalized).
3) `RoomWorldBuilder` builds platforms/entities, auto-adds floor/walls (unless disabled), constructs background layers.
4) `RoomManager` swaps the active world to `room`, positions the player at `spawn`, starts room music, and pauses town/level music.
5) Exiting the `exit` zone calls `RoomManager.exitRoom()`, restoring the previous level snapshot and music.

## Anatomy of Entity Lists
- `platforms`: `{ x, y, width, height, type }`. `type` examples: `'ground'`, `'platform'`, `'wall'`. All are solid unless `solid: false`.
- `enemies`: Factory-created via `entityFactory.create(def)`. Provide `{ type: 'Slime', x, y, ... }`.
- `items`: `{ type: 'Coin', x, y }`, `{ type: 'Coffee', x, y }`, etc.
- `hazards`: Spikes/traps: `{ type: 'Spike', x, y, width, height }`.
- `chests`: `{ x, y, displayName, contents }` or `{ type: 'chest', ... }` (factory handles chest creation).
- `npcs`: Town NPCs or custom: `{ type: 'townNpc', id, x, y, sprite, ... }`.
- `projectiles`: Usually empty on load; the system manages them at runtime.

### Platform Coordinates Reference

Platforms define the collision boundaries for rooms. Here's how to position them correctly for standard room layouts.

**Coordinate System Reminder:**
- Origin (0, 0) is at **top-left**
- X increases **right** (positive = right side)
- Y increases **down** (positive = bottom)

**Standard Room (1024×720):**
```javascript
platforms: [
    { x: 0, y: 690, width: 1024, height: 30, type: 'ground' },  // BOTTOM - floor
    { x: 0, y: 0, width: 32, height: 720, type: 'wall' },       // LEFT wall
    { x: 992, y: 0, width: 32, height: 720, type: 'wall' },     // RIGHT wall (1024-32)
    { x: 0, y: 0, width: 1024, height: 32, type: 'wall' }       // TOP ceiling
]
```

**Large Room (1536×1024):**
```javascript
platforms: [
    { x: 0, y: 994, width: 1536, height: 30, type: 'ground' },  // BOTTOM floor (1024-30)
    { x: 0, y: 0, width: 32, height: 1024, type: 'wall' },      // LEFT wall
    { x: 1504, y: 0, width: 32, height: 1024, type: 'wall' },   // RIGHT wall (1536-32)
    { x: 0, y: 0, width: 1536, height: 32, type: 'wall' }       // TOP ceiling
]
```

**Platform Positioning Guide:**

| Platform Type | Position Formula | Example (1024×720) | Example (1536×1024) |
|--------------|------------------|-------------------|-------------------|
| **Ground** (bottom) | `y: roomHeight - platformHeight` | `y: 690` (720-30) | `y: 994` (1024-30) |
| **Left Wall** | `x: 0, y: 0, width: 32, height: roomHeight` | `height: 720` | `height: 1024` |
| **Right Wall** | `x: roomWidth - wallWidth, y: 0, height: roomHeight` | `x: 992` (1024-32) | `x: 1504` (1536-32) |
| **Top Ceiling** | `x: 0, y: 0, width: roomWidth, height: 32` | `width: 1024` | `width: 1536` |

**Visual Reference (1024×720 room):**
```
      0                                      992  1024
    0 ┌──────────────────────────────────────┬────┐
      │ TOP (0,0,1024,32)                    │    │
   32 ├──────────────────────────────────────┤ R  │
      │                                      │ I  │
      │  L                                   │ G  │
      │  E         Room Interior Space       │ H  │
      │  F                                   │ T  │
      │  T                                   │    │
      │                                      │ W  │
      │  (0,0,32,720)                        │ A  │
      │                                      │ L  │
      │                                      │ L  │
  690 ├──────────────────────────────────────┤    │
      │ GROUND (0,690,1024,30)               │    │
  720 └──────────────────────────────────────┴────┘
```

**Common Mistakes:**
- ❌ Ground at `y: roomHeight` - Floor is BELOW room, players fall forever
- ❌ Right wall at `x: roomWidth` - Wall is OUTSIDE room bounds
- ❌ Two walls on same side (e.g., both at x: 0 and x: 32)
- ❌ Wall dimensions wrong (horizontal `width` for vertical walls)

**Correct Pattern:**
- ✅ Ground `y` = `roomHeight - floorThickness` (usually 30px)
- ✅ Right wall `x` = `roomWidth - wallThickness` (usually 32px)
- ✅ One platform per side (BOTTOM, LEFT, RIGHT, TOP)
- ✅ Vertical walls use `height: roomHeight`, horizontal platforms use `width: roomWidth`

## Background Options
- **Simple**: Use `backgroundImage` with exact `width/height` matching the room.
- **Custom layers**: Provide `backgroundLayers` as an array of objects: `{ render: (ctx, camera) => {...}, update: (dt) => {...} }`. If set, these replace the auto-built image layer.

## Auto Floor and Walls
- `autoFloor` (default `true`): Adds a solid ground at the bottom if you did not define a `ground` platform.
- `autoWalls` (default `true`): Adds left/right walls and a ceiling (type `wall`) to keep the player/projectiles contained.
- Disable them only if you fully author your collision bounds.

## Music Behavior
- Room track defaults to `music/beach-house.mp3 @ volume 0.8`.
- Town/Level music is muted while inside; on exit the previous music resumes.
- You can tweak per-room volume or source via the `music` object.

## Optional Legacy Global
If you must support older lookup paths, also set `window.RoomDescriptors[id] = descriptor;`. The registry already mirrors registrations into `window.RoomDescriptors`, so manual globals are rarely needed unless you skip `roomRegistry`.

## Quick Checklist
1) Create a descriptor file in `game/scripts/rooms/`.
2) Register it with `roomRegistry.register('id', {...})`.
3) (Optional) Add a legacy `window.RoomDescriptors[id]` export.
4) Point a building `interior.id` in `TownsConfig` to that room id (or inline `interior.room`).
5) Supply art assets (`art/bg/...`, `music/...`) and ensure paths are correct.
6) Launch the game, stand at the building door, press interact (`E/Enter`), and verify spawn/exit/music/collision.

---

## Adding NPCs to Your Room

NPCs (Non-Player Characters) bring life to your rooms. This section covers creating NPCs with patrol patterns, custom animations, and dialogue from scratch.

### NPC System Overview

The game uses `TownPatrolNPC` class for most NPCs. Key features:
- **Patrol routes**: NPCs walk between waypoints
- **Animations**: Separate frames for idle, walking, and talking
- **Dialogue**: Text-based conversations triggered by player interaction
- **Collision**: NPCs align to the floor automatically

### Step 1: Prepare Your NPC Sprite

Your NPC sprite should be a **horizontal sprite sheet** with all animation frames in a single row.

**Required dimensions:**
- Width: `frameWidth × totalFrames`
- Height: `frameHeight` (single row)

**Example sprite layout (4 frames, 38×63 each):**
```
[Talk1][Talk2][Walk1][Walk2]
  0      1      2      3
```

**Frame assignment convention:**
- Frames 0-1: Talking animation
- Frames 2-3: Walking animation
- Frame 2: Idle pose (first walk frame)

**Create your sprite:**
1. Place sprite image in `game/art/sprites/`
2. Name it descriptively (e.g., `shopkeeper.png`, `guard.png`)
3. Ensure dimensions are correct: `width = frameWidth × frames`

### Step 2: Add NPC to Room Definition

Add the NPC to your room's `npcs` array:

```javascript
// In your room descriptor
npcs: [
    {
        id: 'shopkeeper',                      // Unique identifier
        type: 'townNpc',                       // Use this type for patrol NPCs
        name: 'Shopkeeper Sam',                // Display name (optional)
        sprite: 'art/sprites/shopkeeper.png',  // Path to sprite sheet
        width: 38,                             // Frame width in pixels
        height: 63,                            // Frame height in pixels
        frames: 4,                             // Total number of frames
        
        // Animation frame indices (zero-based)
        idleFrame: 2,                          // Which frame to show when standing still
        walkFrames: [2, 3],                    // Which frames for walk cycle
        talkFrames: [0, 1],                    // Which frames for talking animation
        
        // Dialogue
        dialogueId: 'npc.shopkeeper',          // Links to dialogue definition
        
        // Position and movement
        x: 400,                                // Starting X position
        y: 626,                                // Starting Y position (auto-adjusted to floor)
        speed: 50,                             // Movement speed (pixels/second)
        pauseMs: 40,                           // Pause duration at waypoints (milliseconds)
        
        // Patrol route (optional - without this, NPC stands still)
        patrol: [
            { x: 300 },                        // First waypoint
            { x: 700 }                         // Second waypoint (NPC walks back and forth)
        ],
        
        // Interaction
        interactRadius: 110                    // How close player must be to talk (pixels)
    }
]
```

### Step 3: Create Dialogue Content

Dialogues are defined in `game/scripts/dialogue/NPCDialogues.js`. Add your NPC's dialogue:

```javascript
// In NPCDialogues.js
window.NPCDialogues = {
    // ... existing dialogues ...
    
    'npc.shopkeeper': [
        'Welcome to my shop! We have the finest goods in town.',
        'Looking for anything specific? I have potions, tools, and more.',
        'Come back anytime—I\'m always here to help!'
    ]
};
```

**Dialogue formatting:**
- Each entry is an array of strings
- Each string is one "page" of dialogue
- Player presses a key to advance through pages
- Supports text effects (see Text Formatting below)

### Step 4: Wire Up the NPC

The game automatically creates and manages NPCs from your room definition. No additional code needed!

**What happens automatically:**
1. `EntityFactory` creates the NPC from your config
2. NPC spawns at specified position
3. Floor alignment adjusts Y position to ground level
4. Patrol loop starts if waypoints provided
5. Player pressing `E` near the NPC triggers dialogue

### Complete Example: Library with Librarian NPC

```javascript
// game/scripts/rooms/LibraryInterior.js
const libraryInterior = {
    id: 'library_interior',
    width: 1024,
    height: 720,
    spawn: { x: 200, y: 656 },
    exit: { x: 200, y: 690, radius: 80 },
    
    backgroundImage: {
        src: 'art/bg/buildings/interior/library.png',
        width: 1024,
        height: 720
    },
    
    platforms: [
        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
    ],
    
    npcs: [
        {
            id: 'librarian',
            type: 'townNpc',
            name: 'Librarian Lucy',
            sprite: 'art/sprites/librarian.png',
            width: 45,
            height: 68,
            frames: 4,
            idleFrame: 2,
            walkFrames: [2, 3],
            talkFrames: [0, 1],
            dialogueId: 'npc.librarian',
            x: 600,
            y: 622,  // Will auto-adjust to ground at 690
            speed: 30,
            pauseMs: 50,
            patrol: [
                { x: 400 },  // Walks between shelves
                { x: 800 }
            ],
            interactRadius: 120
        }
    ],
    
    enemies: [],
    items: [],
    music: { src: 'music/library.mp3', volume: 0.7 },
    theme: 'interior'
};

// Register with room registry
const registry = (typeof window !== 'undefined' ? window.roomRegistry : null);
registry?.register?.('library_interior', libraryInterior);
```

```javascript
// In game/scripts/dialogue/NPCDialogues.js - add this entry
window.NPCDialogues = {
    // ... existing dialogues ...
    
    'npc.librarian': [
        'Shh! This is a library. But I suppose I can talk quietly...',
        'We have books on history, magic, and even some ancient recipes.',
        'Feel free to browse, just please return the books when you\'re done!'
    ]
};
```

### Advanced: Custom Patrol Patterns

#### Simple Back-and-Forth
```javascript
patrol: [
    { x: 300 },
    { x: 700 }
]
// NPC walks: 300 → 700 → 300 → 700 (loops)
```

#### Multi-Point Route
```javascript
patrol: [
    { x: 200 },
    { x: 500 },
    { x: 800 },
    { x: 500 }
]
// NPC walks: 200 → 500 → 800 → 500 → 200 (loops)
```

#### Stationary NPC (No Patrol)
```javascript
// Omit patrol array or use single waypoint
patrol: [
    { x: 400 }
]
// NPC stands at x: 400 and never moves
```

#### Speed and Timing Control
```javascript
{
    speed: 80,      // Fast walker (default: 40)
    pauseMs: 100,   // Longer pause at waypoints (default: 30)
    // ...
}
```

### Advanced: Custom Animation Frames

#### Six-Frame Sprite (More Animation)
```
[Talk1][Talk2][Talk3][Walk1][Walk2][Walk3]
   0      1      2      3      4      5
```

```javascript
{
    frames: 6,
    idleFrame: 3,           // First walk frame
    walkFrames: [3, 4, 5],  // Three-frame walk cycle
    talkFrames: [0, 1, 2],  // Three-frame talk animation
    // ...
}
```

#### Two-Frame Minimal (Simple Bounce)
```
[Idle][Walk]
  0     1
```

```javascript
{
    frames: 2,
    idleFrame: 0,
    walkFrames: [0, 1],     // Alternates between both
    talkFrames: [0, 1],     // Same for talking
    // ...
}
```

### Advanced: Multi-Line Dialogue with Text Effects

Dialogue supports special markup for styling:

```javascript
'npc.fancy_merchant': [
    'Welcome to my %exclusive% boutique!',           // %text% = yellow highlight
    'We have #rare# items from across the land.',    // #text# = green highlight
    'Feel free to ^browse^ our !magnificent! wares.', // ^text^ = pink, !text! = orange
    'Don\'t forget: ~discounts~ on <<special>> days!' // ~text~ = cyan, <<text>> = light blue
]
```

**Available text effects:**
- `%text%` - Yellow (emphasis/important)
- `#text#` - Green (positive/good)
- `^text^` - Pink (special/unique)
- `!text!` - Orange (warning/attention)
- `~text~` - Cyan (info/note)
- `<<text>>` - Light blue (secondary emphasis)
- `_text_` - Italic
- `<<<text>>>` - Large text

### Positioning NPCs Correctly

**Y Position Calculation:**
NPCs auto-align to the floor, but you still need to provide a starting Y:

```javascript
// For room with ground at y: 690 and NPC height of 63:
y: 690 - 63 = 627

// General formula:
y: groundY - npcHeight
```

**However**, the system auto-adjusts, so any reasonable Y value works. Common practice:

```javascript
// Standard 1024×720 room with ground at 690
y: 626  // Works for most NPC heights (auto-adjusts to ground)

// Large 1536×1024 room with ground at 994
y: 930  // Close to ground for large room
```

**X Position Guidelines:**
- Keep NPCs within room bounds: `32 < x < (roomWidth - 32 - npcWidth)`
- Leave space for patrol routes
- Don't spawn directly on player spawn point

### Troubleshooting NPCs

#### NPC Not Appearing
- ✅ Check sprite path is correct: `art/sprites/yoursprite.png`
- ✅ Ensure sprite file exists in the filesystem
- ✅ Verify `width`, `height`, and `frames` match sprite dimensions
- ✅ Confirm room script is loaded in `game/index.html`

#### NPC Falls Through Floor
- ✅ Add ground platform: `{ x: 0, y: 690, width: 1024, height: 30, type: 'ground' }`
- ✅ Or enable `autoFloor: true` in room config
- ✅ Check Y position isn't negative

#### NPC Not Walking
- ✅ Ensure `patrol` array has at least 2 different waypoints
- ✅ Check `speed` is greater than 0
- ✅ Verify waypoint X coordinates differ from starting X

#### Animation Not Playing
- ✅ Confirm `walkFrames` and `talkFrames` indices are within frame count
- ✅ Check sprite sheet has correct number of frames
- ✅ Verify frames are horizontal (not vertical)

#### Dialogue Not Showing
- ✅ Check `dialogueId` matches key in `NPCDialogues`
- ✅ Ensure `NPCDialogues.js` is loaded before room script
- ✅ Verify player is within `interactRadius` (default: 110px)
- ✅ Press `E` key to trigger dialogue

#### NPC Facing Wrong Direction
- NPCs automatically face their movement direction
- If you want NPC to face left by default, make first patrol waypoint to the left of starting position

### Complete NPC Checklist

**Art Assets:**
- [ ] Sprite sheet created (horizontal frames)
- [ ] Sprite saved in `game/art/sprites/`
- [ ] Sprite dimensions: `(frameWidth × frames) × frameHeight`

**Room Configuration:**
- [ ] NPC added to `npcs` array in room descriptor
- [ ] All required fields provided: `id`, `type`, `sprite`, `width`, `height`, `frames`
- [ ] Animation frames configured: `idleFrame`, `walkFrames`, `talkFrames`
- [ ] Position set: `x`, `y`
- [ ] Patrol route defined (if NPC should move)

**Dialogue:**
- [ ] Dialogue ID chosen (e.g., `npc.yourname`)
- [ ] Dialogue entry added to `NPCDialogues.js`
- [ ] Dialogue array has at least one message
- [ ] `dialogueId` field in NPC config matches dialogue key

**Testing:**
- [ ] Game loads without errors
- [ ] NPC appears in room at correct position
- [ ] NPC stands on ground (doesn't float or fall)
- [ ] NPC walks patrol route (if configured)
- [ ] Animation plays during walk
- [ ] Player can approach NPC (within interact radius)
- [ ] Pressing `E` triggers dialogue
- [ ] All dialogue pages advance correctly
- [ ] Talk animation plays during dialogue

---

## Troubleshooting
- **Player falls forever**: Add a `ground` platform or leave `autoFloor` enabled. Check `height` and `spawn.y` to ensure spawn is above ground.
- **Can walk out of bounds**: Leave `autoWalls` enabled or add manual wall platforms.
- **Room not loading**: Confirm `interior.id` matches the registered room id; ensure the script is loaded (see `game/index.html`).
- **Black background**: Provide a `backgroundImage` or custom `backgroundLayers`.
- **Music silent**: Verify `music.src` path and browser can load the file; registry defaults to `music/beach-house.mp3` if unset.
