# Luckie Runner Architecture Guide

This document summarizes the current world-building architecture (levels, towns, rooms) and how to use it to add new content.

## Concepts At a Glance
- **Level**: The main overworld container. Built by `WorldBuilder` from `LevelDefinitions` or procedural helpers. Owns platforms, enemies, items, hazards, background layers, town regions.
- **Town**: A themed segment inside a level. Managed by `TownManager`; attaches decor, buildings (with interior doors), and town NPCs to the active level without replacing it.
- **Room**: A fully isolated interior container (e.g., building interiors). Managed by `RoomManager`; swaps world state, provides its own background, solid bounds/floor, and entities. Uses the HUD and physics but shares nothing else with the level.
- **Active World**: The game tracks whether the current container is a `level` or `room` (`game.activeWorld.kind`). Rendering and physics respect this flag.
- **Scenes/State**: SceneManager swaps high-level modes (`menu`, `play`, `pause`, `battle`, `cutscene`); GameStateManager mirrors the logical state and gates which subsystem ticks. Battle/cutscene scenes are modal and restore the prior scene when finished.
- **EntityFactory**: Central factory that builds entities from plain data objects using a `type` key (platforms, enemies, items, NPCs, projectiles, signs, etc.). Extend it to add new types without changing world builders.
- **UI/Overlays**: DOM-based overlays for HUD, inventory, chest, shop, menus, dialogue. Can be edited via HTML/CSS and wired in `UIManager`.
- **Services**: Save/load (`ProgressManager`/`SaveService`), reset (`ResetService`), audio (`AudioController`/`AudioManager`), persistence, and event bus.

## File Map
- `game/scripts/core/WorldBuilder.js` - builds levels.
- `game/scripts/town/TownManager.js` - manages towns, building doors, and interior entry/exit.
- `game/scripts/rooms/RoomManager.js` - builds/swaps room worlds.
- `game/scripts/rooms/RoomRegistry.js` - room catalogue/normalizer with defaults and aliases.
- `game/scripts/core/GameSystems.js` - per-frame updates; respects `activeWorld` and room isolation.
- `game/scripts/core/CollisionSystem.js` - physics/collision; includes projectile+NPC reactions.
- `game/scripts/core/SceneRenderer.js` - rendering; hides level decor/platforms in rooms.
- `game/scripts/core/config/TownsConfig.js` - town data (buildings, interiors, music, etc.).
- `game/scripts/rooms/*` - room descriptors (e.g., `ShoreHouseInterior.js`).
- `game/scripts/levels/*` - level definitions (overworld-style).
- `game/scripts/ui/*` - UI managers, overlays (inventory, shop, chest, dialogue, menus).
- `game/scripts/core/EntityFactory.js` - creates entities (platforms, enemies, items, NPCs, projectiles) from data `type` keys.
- `game/scripts/core/SceneManager.js` / `game/scripts/core/GameStateManager.js` - scene/state orchestration (menu/play/pause/battle/cutscene).
- `game/scripts/core/scene/BattleScene.js`, `game/scripts/core/scene/CutsceneScene.js`, `game/scripts/battle/BattleManager.js`, `game/scripts/cutscene/CutscenePlayer.js` - modal battle/cutscene flows.
- `game/scripts/player/*` - player logic and animations.
- `game/scripts/enemies/*` - enemy types; register in EntityFactory to spawn from level/room data.
- `game/scripts/items/*` - item classes; register in EntityFactory to drop/place or sell in shops.
- `game/scripts/core/Projectile.js` - projectile base (rocks, arrows, custom shots).
- `game/scripts/core/services/*` - save/reset/persistence/audio services.
- `docs/*.md` - reference guides for rooms, towns, levels, items, enemies, NPCs, UI, HUD, shops, projectiles, player, entities, glossary.
- Scene/renderer/config docs: `docs/camera.md`, `docs/collision.md`, `docs/event-bus.md`, `docs/service-loader.md`, `docs/services.md`, `docs/progress-manager.md`, `docs/renderer.md`, `docs/worldbuilder.md`, `docs/config-scripts.md`.
- Additional system docs: `docs/input.md`, `docs/audio-system.md`, `docs/game-systems.md`, `docs/entity-factory.md`, `docs/town-manager.md`, `docs/room-manager.md`, `docs/ui-manager.md`, `docs/dialogue-system.md`, `docs/content-patterns.md`, `docs/save-reset.md`.

## Room System
### What a Room Is
- A self-contained world: its own platforms (floor/walls auto-added), background layer(s), NPCs, items, hazards, chests, projectiles.
- Uses the HUD/camera/physics from the main game but does not render level/town decor.
- Has its own music (defaults to `music/beach-house.mp3` unless overridden in the room descriptor).

### Entry Flow
1. Player interacts with a building door (TownManager `handleDoorInteract` → `enterBuilding`).
2. TownManager resolves a room descriptor (inline on the building, global `RoomDescriptors`, or converted legacy interior level).
3. TownManager calls `RoomManager.enterRoom(descriptor, returnPosition)`:
   - Captures return snapshot (level id, platforms, enemies, items, hazards, chests, NPCs, town decor, sign boards, palms, shop ghost/princess/balloon fan, background layers, projectiles, player position).
   - Builds the room world via `RoomWorldBuilder`:
     - Clones entities.
     - Ensures a solid floor and invisible walls/ceiling for collision.
     - Builds background layers (or a black fallback if none).
   - Applies room world: clears level entities, sets `activeWorld.kind = 'room'`, assigns room entities/background, positions player at room spawn.
   - Starts room music; pauses level/town music.

### Exit Flow
- Interact at the room’s exit zone → `RoomManager.exitRoom()`:
  - Restores the captured level snapshot (including town decor/NPCs).
  - Resumes town music if standing in a town; otherwise resumes base music.
  - Sets `activeWorld.kind = 'level'`.

### Building a Room Descriptor
Place room descriptors in `game/scripts/rooms/*.js` or inline on a building interior. Shape:
```js
const myRoom = {
  id: 'my_room',
  width: 1024,
  height: 720,
  spawn: { x: 200, y: 520 },
  exit: { x: 220, y: 560, radius: 80 },
  music: { src: 'music/beach-house.mp3', volume: 0.8 }, // optional
  backgroundImage: { src: 'art/bg/buildings/interior/house-inside.png', width: 1024, height: 720 },
  platforms: [
    // optional; a solid floor and walls are auto-added
    { x: 0, y: 640, width: 1024, height: 80, type: 'ground' }
  ],
  enemies: [], items: [], hazards: [], chests: [], npcs: []
};
// Expose globally for TownManager lookup:
if (typeof window !== 'undefined') {
  window.RoomDescriptors = window.RoomDescriptors || {};
  window.RoomDescriptors.my_room = myRoom;
}
```

### Room Registry (data-first additions)
- `RoomRegistry` keeps normalized rooms with defaults for size/spawn/exit/music (`music/beach-house.mp3`), plus optional `autoFloor/autoWalls` flags.
- Register new interiors just like NPC data: `roomRegistry.register('shorehouseinterior', {...})`; override per-building pieces with `roomRegistry.build('id', { width: 800 })`.
- Registry syncs to `window.RoomDescriptors` so legacy lookups still work; TownManager prefers registry entries when entering buildings.

### Adding an Interior to a Building
In `TownsConfig` building entry:
```js
interior: {
  id: 'my_room',
  spawn: { x: 180, y: 520 },
  exit: { x: 200, y: 560, radius: 80 },
  room: myRoom // or rely on global RoomDescriptors[my_room]
}
```

### Room Rendering/Physics Notes
- `SceneRenderer` fills a black backplate and renders only room backgrounds; level/town decor/platforms are skipped.
- `RoomWorldBuilder` auto-adds solid floor + walls/ceiling; platforms are hidden visually but collide for projectiles/items/NPCs.
- `GameSystems` skips town updates and item/player collection in rooms; NPCs still update for reactions.

## Towns
### What a Town Is
- A set of decor, buildings (with doors/interiors), town NPCs, setpieces, and optional music tied to a level region.
- Drawn on top of the level; does not replace the level’s platforms/enemies/items.

### Data Location
- `game/scripts/core/config/TownsConfig.js`
  - `towns`: array with `id`, `levelId`, `region { startX, endX }`, `music`, `buildings`, `setpieces`, `npcs`, `interiors`.
  - Buildings define exterior sprite/frames/door offsets and `interior` metadata.

### Runtime Flow
- `TownManager.update` checks player position vs. town regions, loads decor/NPCs as needed, and handles door interaction.
- Door interaction:
  - Find nearby building door (radius).
  - If interior is defined, enter room via `RoomManager`; otherwise show “locked.”
- Town music fades vs. base level music on entry/exit.
- Town NPCs are spawned/removed with the active town content.

### Adding a Town Building With Interior
```js
{
  id: 'shore_house',
  name: 'House',
  exterior: { x: 8800, width: 689, height: 768, frames: 2, frameDirection: 'horizontal', scale: 0.4, sprite: 'art/bg/buildings/exterior/house.png' },
  door: { spriteOffsetX: 118, spriteOffsetY: 498, interactRadius: 160 },
  interior: { id: 'shorehouseinterior' } // matches a room descriptor id
}
```

## Levels
### What a Level Is
- Overworld container built by `WorldBuilder.createLevel(levelId)`.
- Consumes `window.LevelDefinitions[id]` when present (e.g., `game/scripts/levels/TestRoomLevel.js`), or uses procedural helpers (platforms, items, enemies) in WorldBuilder.
- Owns `platforms`, `enemies`, `items`, `hazards`, `npcs`, `townDecor`, `backgroundLayers`, `flag`, etc.

### Adding a Level Definition
Create a file under `game/scripts/levels/YourLevel.js`:
```js
window.LevelDefinitions = window.LevelDefinitions || {};
window.LevelDefinitions.myLevel = {
  spawn: { x: 120, y: 400 },
  width: 4000,
  height: 900,
  platforms: [ { x: 0, y: 860, width: 4000, height: 40, type: 'ground' } ],
  enemies: [ { type: 'Slime', x: 320, y: 800 } ],
  items: [],
  theme: 'beach'
};
```
The `LevelRegistry` reads these on game init and `WorldBuilder` uses them when you call `createLevel('myLevel')`.

## Music Behavior
- Base level music id: `game.currentLevelMusicId` (default `level1`).
- Town music: defined per town (`music { id, src, volume }`), crossfaded on entry/exit.
- Room music: defaults to `music/beach-house.mp3` or `room.music.src`; pauses base/town while inside; resumes town on exit (if in town) without briefly resuming level music.

## NPC Projectile Reactions (for reference)
- Player projectiles collide with NPCs via `CollisionSystem.updateProjectilePhysics`.
- On hit: plays `ow.mp3`, applies exaggerated knockback, pauses NPC motion briefly, then NPCs resume patrol/home drift after recovery.

## Checklist for Adding Content
- **New Room**: add descriptor under `game/scripts/rooms`, register in `RoomDescriptors`, reference via building interior id.
- **New Building**: add to `TownsConfig` with `door` and `interior` ids; provide matching room descriptor.
- **New Town**: append to `TownsConfig.towns` with region, music, decor, buildings.
- **New Level**: add `game/scripts/levels/YourLevel.js` and ensure `window.LevelDefinitions` includes it.
- **New Entity Type**: create a class, register a `type` in `EntityFactory`, then use `{ type: 'YourType', ... }` in level/room data.
- **New NPC**: use `type: 'townNpc'` with `TownPatrolNPC` data, or register a custom NPC type in `EntityFactory`.
- **New Enemy**: add a class under `game/scripts/enemies`, register in `EntityFactory`, place with `{ type: 'YourEnemy', x, y }`.
- **New Item**: extend `Item`, register in `EntityFactory`, place in `items` arrays or shops.
- **New Projectile**: extend `Projectile`, register in `EntityFactory`, spawn from player/enemy logic.
- **New UI/Overlay**: add HTML in `index.html`, style in CSS, wire in `UIManager` with show/hide/update helpers.
- **New Modal/Canvas UI**: add DOM modal (`docs/modals.md`) or draw via canvas (`docs/canvas-ui-conversion.md`).
- **Music/SFX**: add files under `music/` or `sfx/`, load via `AudioManager` (`initializeGameSounds` or custom load), and reference by id.

## Common Pitfalls
- Forgetting to expose the room descriptor globally (`window.RoomDescriptors[id]`).
- Reusing a level definition as a room without converting it (rooms expect backgroundImage/platforms, not procedural level themes).
- Missing town music id/src (town will enter silently).
- Interact key: door entry uses the same interact press as chests/signs (`E/Enter`).
- EntityFactory registration missing: if you add a new type but forget to register it, the world builders cannot create it from data.
- Misplaced scripts: ensure new files are loaded in `index.html` (or your bundler) before they are referenced.
- Path typos: asset paths (sprites, music) must match real files or loads will fail silently.
