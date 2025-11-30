# Getting Started & Troubleshooting Guide (Comprehensive)

This guide combines “how to” steps, definitions, and debugging tips so you can add content and fix issues without prior knowledge. It points to other docs for deep dives and includes code snippets throughout.

## How the Game System Works (High Level)
- **Game loop:** The game runs an update → render cycle. If `stateManager.isPlaying()` is true, it updates systems (input, physics, AI, collisions) and then renders the scene and UI.
- **Active world:** The game can be in a **level** (overworld) or **room** (interior). `game.activeWorld.kind` is `'level'` or `'room'`. Physics/rendering use this flag to know what to show/hide.
- **Builders:**
  - `WorldBuilder` creates levels from LevelDefinitions or procedural helpers.
  - `RoomWorldBuilder` creates rooms from room descriptors.
- **Managers:** TownManager (town regions/doors), RoomManager (room entry/exit), UIManager (HUD/overlays), DialogueManager/SpeechBubble (text), EntityFactory (spawns entities from `{ type: ... }` data).
- **Services:** AudioManager/AudioController (sound/music), ProgressManager/SaveService (save/load), ResetService (reset state), EventBus.
- **Renderer:** SceneRenderer draws backgrounds, entities, decor; UIRenderer/UI CSS draws overlays.

## Core Terms (Plain English)
- **Level:** Outdoor play area with platforms/enemies/items. File: `game/scripts/levels/*.js`. See `docs/levels.md`.
- **Town:** A themed strip inside a level with buildings and town NPCs. Config: `TownsConfig.js`. See `docs/towns.md`.
- **Room:** Indoor area entered via doors; separate entities/background. Files: `game/scripts/rooms/*.js`. See `docs/rooms.md`.
- **Entity:** Any game object (player, enemy, item, platform, NPC, projectile, sign). See `docs/entities.md`.
- **EntityFactory:** Registry that builds entities from data using a `type` key (e.g., `{ type: 'slime', x, y }`).
- **Platform:** Solid rectangle you stand on. See Platforms section in `docs/levels.md`.
- **NPC:** Talkable character. See `docs/npcs.md`.
- **Enemy:** Hostile entity. See `docs/enemies.md`.
- **Item:** Collectible/power-up. See `docs/items.md`.
- **Projectile:** Flying object (rock, arrow, custom). See `docs/projectiles.md`.
- **UI/HUD:** On-screen info (health, coins, rocks, buffs) and overlays (inventory, chest, shop, menus). See `docs/ui.md`, `docs/hud.md`, `docs/shops.md`, `docs/modals.md`.
- **Dialogue/Callouts:** Speech bubbles and prompts. See `docs/dialogue.md`, `docs/callouts.md`.
- **Audio:** Music/SFX loading and playback. See `docs/audio.md`.
- **Backgrounds:** Theme-based or image-based per level/room. See `docs/backgrounds.md`.
- **DecorPlatform:** Modular, jumpable solid decor. See `docs/decor-platform.md`.

## Quick Start: Add a New Level
1) Create `game/scripts/levels/MyLevel.js`:
   ```js
   window.LevelDefinitions = window.LevelDefinitions || {};
   window.LevelDefinitions.myLevel = {
     id: 'myLevel',
     width: 6000, height: 900,
     spawn: { x: 120, y: 620 },
     theme: 'beach', // or set backgroundImage
     platforms: [
       { type: 'ground', x: 0, y: 860, width: 6000, height: 40 },
       { type: 'platform', x: 800, y: 700, width: 240, height: 30 }
     ],
     enemies: [ { type: 'Slime', x: 900, y: 640 } ],
     items:   [ { type: 'Coin', x: 500, y: 780 } ]
   };
   ```
2) Include it in `game/index.html` with `<script src="scripts/levels/MyLevel.js"></script>`.
3) In dev, call `game.createLevel('myLevel')`. Done.

## Quick Start: Add a Room (Interior)
1) Create `game/scripts/rooms/MyRoom.js`:
   ```js
   const myRoom = {
     id: 'my_room',
     width: 1024, height: 720,
     spawn: { x: 200, y: 520 },
     exit: { x: 220, y: 560, radius: 80 },
     backgroundImage: { src: 'art/bg/interior/room.png', width: 1024, height: 720 },
     platforms: [ { x: 0, y: 640, width: 1024, height: 80, type: 'ground' } ],
     enemies: [], items: [], npcs: []
   };
   const reg = (typeof window !== 'undefined') ? window.roomRegistry : null;
   reg?.register?.('my_room', myRoom);
   if (typeof window !== 'undefined') {
     window.RoomDescriptors = window.RoomDescriptors || {};
     window.RoomDescriptors.my_room = myRoom;
   }
   if (typeof module !== 'undefined' && module.exports) module.exports = myRoom;
   ```
2) Set a building interior to `id: 'my_room'` in `TownsConfig` or call `roomManager.enterRoom(...)` directly.

## Quick Start: Add an Entity Type (Example: DecorPlatform already registered)
1) Ensure the class exists (e.g., `DecorPlatform` in `game/scripts/environment/DecorPlatform.js`).
2) Register in `EntityFactory` (`bootstrapDefaults` already registers `decor_platform`).
3) Place in data:
   ```js
   { type: 'decor_platform', x: 1800, y: 760, width: 160, height: 120,
     sprite: 'art/bg/custom-plant.png',
     hitboxWidth: 160, hitboxHeight: 32, hitboxOffsetY: 88 }
   ```

## How the Game Loop Works (Simplified)
1) **Input:** Read controls.
2) **Update:** Systems update player, enemies, NPCs, items, physics, collisions, towns, rooms, dialogue, UI timers.
3) **Render:** SceneRenderer draws backgrounds, platforms, entities; UI overlays draw via HTML/CSS.
4) **Audio:** Music/SFX triggered during updates; volumes applied each play call.

## Creating Content from Scratch (Pointers)
- Levels: `docs/levels.md`
- Towns: `docs/towns.md`
- Rooms: `docs/rooms.md`
- Platforms: See Platforms section in `docs/levels.md`
- Backgrounds: `docs/backgrounds.md`
- Entities: `docs/entities.md`
- Player: `docs/player.md`
- NPCs: `docs/npcs.md`
- Enemies: `docs/enemies.md`
- Items: `docs/items.md`
- Projectiles: `docs/projectiles.md`
- DecorPlatform: `docs/decor-platform.md`
- UI/HUD/Modals: `docs/ui.md`, `docs/hud.md`, `docs/modals.md`, `docs/canvas-ui-conversion.md`
- Dialogue/Callouts: `docs/dialogue.md`, `docs/callouts.md`
- Audio: `docs/audio.md`
- Save/Reset: `docs/save-and-reset.md`
- Glossary: `docs/glossary.md`

## Debugging & Troubleshooting
Common symptoms and fixes:
- **Nothing spawns:** Ensure script is loaded in `index.html` (or bundler). Check `type` matches EntityFactory registration.
- **Player falls forever:** Add a ground platform (`type: 'ground'`) near `y = level.height - 40`. Ensure spawn.y is above it.
- **Rooms show black:** Provide `backgroundImage` in the room descriptor or custom `backgroundLayers`.
- **Dialogue not showing:** Verify `dialogueId` exists in `Dialogues/NPCDialogues`; ensure interaction key is pressed and NPC/sign proximity is correct.
- **Shop/Chest overlay not opening:** Check UIManager setup; ensure show/hide functions are called and `hidden` class is removed.
- **Missing sprites/music:** Confirm paths (`art/...`, `music/...`, `sfx/...`) exist and match exactly.
- **Audio silent:** Browser may block autoplay; interact once. Verify volumes (master/music/sfx) aren’t 0 or muted.
- **New type not created:** Register it with `EntityFactory.registerType('your_type', builder)` and load the class script before the factory runs.
- **Bad collisions:** Check `width/height` and `hitbox` overrides; remember y increases downward.
- **Level not loading:** Ensure `window.LevelDefinitions[id]` exists and script is included; call `createLevel('id')`.

## Code Snippets (Grab-n-Go)
**Play SFX:**
```js
audioManager.loadSound('interact', 'sfx/interact.mp3');
audioManager.playSound('interact', 0.8);
```
**Play music for a level:**
```js
audioManager.loadMusic('forestTheme', 'music/forest-theme.mp3');
game.currentLevelMusicId = 'forestTheme';
audioManager.playMusic('forestTheme', 0.85, { allowParallel: false, restartIfPlaying: true });
```
**NPC with dialogue:**
```js
window.NPCDialogues = window.NPCDialogues || {};
window.NPCDialogues['npc.ranger'] = ["Stay sharp in the forest."];
{ type: 'townNpc', id: 'ranger', x: 9000, y: 820, dialogueId: 'npc.ranger' }
```
**Room descriptor registration:**
```js
const r = { id: 'cabin', width: 1024, height: 720, spawn: {x:200,y:520}, exit:{x:220,y:560,radius:80},
  backgroundImage: { src: 'art/bg/cabin.png', width: 1024, height: 720 },
  platforms: [ { x:0,y:640,width:1024,height:80,type:'ground' } ] };
window.roomRegistry?.register?.('cabin', r);
window.RoomDescriptors = window.RoomDescriptors || {}; window.RoomDescriptors.cabin = r;
```
**DecorPlatform usage:**
```js
{ type: 'decor_platform', x: 1500, y: 780, width: 140, height: 32 }
```

## How to Change Visuals Quickly
- **Background:** Set `backgroundImage` in the level/room, or change `theme`.
- **Player sprite:** Update `loadSprite` path and frame sizes in `Player.js`/`PlayerAnimations.js`.
- **UI colors:** Edit `game/styles/main.css` for HUD/menus/speech bubbles/callouts.
- **Speech bubble look:** Edit `.speech-bubble` and `.speech-bubble__body` in CSS (see `docs/dialogue.md`).

## How to Change Physics/Movement Quickly
- Player: Adjust `gravity`, `jumpStrength`, `maxSpeed`, `friction` in `Player.js`.
- Platforms: Change `y`/`height` to raise/lower floors; add more ledges for varied jumps.
- Projectiles: Adjust `gravity`, `damage`, `lifeTime`, `speed` in your projectile class.

## Save/Reset Quick Notes
- Save builds a snapshot via ProgressManager → SaveService. Load reads it back and applies to the live game. See `docs/save-and-reset.md`.
- Reset clears entities/UI and rebuilds the level/player fresh via `game.resetGame()`/`ResetService`.

## Game Loop Anatomy (More Detail)
- **Input stage:** InputManager reads keyboard/mouse; UIInputController handles UI navigation.
- **Update stage:** GameSystems orchestrates player/enemy AI, physics via CollisionSystem, item collection, projectile updates, towns/rooms, dialogue, UI timers.
- **Render stage:** SceneRenderer draws backgrounds/entities; UIRenderer/HTML draws HUD, overlays, callouts; DebugRenderer can overlay hitboxes.
- **Audio stage:** Calls to AudioManager happen during update; volumes calculated as `master * category * requested`.

## Checklist for Adding Anything New
1) Decide the type (level, room, entity, UI, audio, dialogue).
2) Create the data/class file in `game/scripts/...`.
3) Load it in `game/index.html` (or ensure bundler includes it).
4) If it’s an entity type, register in `EntityFactory` with a `type` key.
5) Place it in data (levels/rooms/towns) if needed.
6) Add art/audio assets in `art/...`, `music/...`, `sfx/...` with correct paths.
7) Update UI/dialogue if applicable.
8) Test: spawn/enter/interact; verify collisions, audio, and visuals.

## If Things Break (Triage)
- Check the browser console for missing file paths.
- Verify scripts are loaded (Network tab or console errors about undefined classes).
- Confirm `type` keys match registration in EntityFactory.
- Check coordinates: y grows downward; put spawn above ground; keep objects within level bounds.
- Disable `hidden` on overlays to see if UI is present but hidden.
- Make a tiny repro: place one platform, one enemy, one item in a small level and build up from there.

With this guide and the linked docs, you should be able to add, debug, and extend the game confidently, even from scratch. ***
