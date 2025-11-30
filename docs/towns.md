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
