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

## Troubleshooting
- **Player falls forever**: Add a `ground` platform or leave `autoFloor` enabled. Check `height` and `spawn.y` to ensure spawn is above ground.
- **Can walk out of bounds**: Leave `autoWalls` enabled or add manual wall platforms.
- **Room not loading**: Confirm `interior.id` matches the registered room id; ensure the script is loaded (see `game/index.html`).
- **Black background**: Provide a `backgroundImage` or custom `backgroundLayers`.
- **Music silent**: Verify `music.src` path and browser can load the file; registry defaults to `music/beach-house.mp3` if unset.
