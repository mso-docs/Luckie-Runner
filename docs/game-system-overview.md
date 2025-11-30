# Game System Overview (Complete Beginner’s Guide)

This document explains how the game is structured, which files/classes are essential, how the game loop works, and how to build and extend the game. It assumes no prior knowledge and includes code snippets.

---
## Big Picture
- **Game loop:** Repeats every frame: read input -> update world/entities -> render scene/UI -> play sounds.
- **Scene system:** SceneManager swaps modes (`menu`, `play`, `pause`, `battle`, `cutscene`). GameStateManager mirrors logical state so the loop can route to play vs battle vs cutscene subsystems.
- **Active world:** The world container is a **level** (overworld) or **room** (interior). `game.activeWorld.kind` is `'level'` or `'room'`. Battle/cutscene scenes temporarily replace overworld updates/rendering and then restore.
- **Data-first design:** Levels, rooms, towns, entities are mostly plain objects, consumed by builders/managers.
- **Factories/Managers:** EntityFactory creates entities from `{ type: '...' }` data. World/Room/Town managers build or swap worlds and handle flow. BattleManager runs battles; CutscenePlayer runs scripted sequences; both return to the prior scene cleanly.
- **UI:** DOM-based overlays (HUD, inventory, shop, dialogue, menus) are updated by UIManager and related classes.
- **Audio:** AudioManager/AudioController handle music/SFX with master/music/sfx volumes; modal scenes duck/stop and restore.
---
## Essential Files and Classes (by area)

### Core Loop and State
- `game/scripts/Game.js` - Main class; owns the loop, player, entities, managers, services; routes to play/battle/cutscene logic based on GameStateManager.
- `game/scripts/core/GameSystems.js` - Per-frame system orchestration (update logic) for the play scene.
- `game/scripts/core/GameLoop.js` - Timing for the game loop.
- `game/scripts/core/CollisionSystem.js` - Physics/collision checks.
- `game/scripts/core/SceneRenderer.js` - Rendering for backgrounds/entities depending on active world.
- `game/scripts/core/Renderer.js` - High-level render integration (delegates to SceneRenderer/UI).
- Scenes/state: `game/scripts/core/SceneManager.js` (register/change scenes) and `game/scripts/core/GameStateManager.js` (states: menu, playing, paused, battle, cutscene, gameOver, victory).
- Modal scenes: `game/scripts/core/scene/BattleScene.js`, `game/scripts/core/scene/CutsceneScene.js` with logic in `game/scripts/battle/BattleManager.js` and `game/scripts/cutscene/CutscenePlayer.js`. See `docs/scenes.md`, `docs/battles.md`, `docs/cutscenes.md`.

### World Construction
- `game/scripts/core/WorldBuilder.js` — Builds levels from LevelDefinitions (platforms, enemies, items, background layers).
- `game/scripts/rooms/RoomManager.js` + RoomWorldBuilder — Builds rooms, swaps level/room worlds.
- `game/scripts/town/TownManager.js` — Loads town decor/buildings/NPCs, doors/interiors, music transitions.
- `game/scripts/core/config/TownsConfig.js` — Town data (buildings, interiors, setpieces, NPCs, music).
- `game/scripts/rooms/RoomRegistry.js` — Normalizes/registers rooms; `roomRegistry.build(id, overrides)`.
- `game/scripts/core/LevelRegistry.js` — Stores LevelDefinitions by id.

### Entities and Factory
- `game/scripts/core/Entity.js` — Base class: position, size, physics flags, render helpers.
- `game/scripts/core/EntityFactory.js` — Registry of builders keyed by `type`; creates entities from data.
- Entities: player (`player/Player.js`), enemies (`enemies/*.js`), items (`items/*.js`), platforms (`environment/Platform.js`), decor (`environment/DecorPlatform.js`, `environment/SmallPalm.js`), NPCs (`npcs/*.js`), projectiles (`core/Projectile.js`), signs (`environment/Sign.js`).

### UI and Dialogue
- `game/scripts/ui/UIManager.js` — HUD updates, overlays (inventory, chest, shop), tab switching, dialogue start.
- `game/scripts/ui/UIInputController.js` — Keyboard/controller for UI navigation.
- `game/scripts/ui/DialogueManager.js` + `game/scripts/dialogue/SpeechBubble.js` — Dialogue text formatting and bubble control.
- Menus & overlays markup: `game/index.html` (HUD, inventory, shop, chest, menus, speech bubble, callouts).
- CSS: `game/styles/main.css`.

### Audio and Services
- `game/scripts/utils/AudioManager.js` — Load/play music/SFX; track volumes.
- `game/scripts/core/AudioController.js` — Hooks UI sliders/buttons to AudioManager; applies config defaults.
- Services: `ProgressManager`/`SaveService` (save/load), `ResetService` (reset state), `EventBus`.

---
## Game Loop (Step-by-Step)
- State routing: if `GameStateManager` reports `battle`, `BattleManager.update/render` runs; if `cutscene`, `CutscenePlayer.update/render` runs; otherwise the play loop below runs.
1) **Input:** InputManager reads keyboard/mouse; UIInputController captures UI keys.
2) **Update:** GameSystems updates:
   - Player movement/physics and animations.
   - Enemies/NPCs AI and movement.
   - CollisionSystem resolves collisions (player vs. platforms/enemies/items/hazards).
   - TownManager: detects region, loads town decor/NPCs, handles doors.
   - RoomManager: checks room exit, swaps level/room worlds.
   - Projectiles/items updates.
   - UI timers/overlays (inventory, shop, chest, dialogue).
3) **Render:** SceneRenderer draws backgrounds, platforms, entities; HUD/overlays draw via HTML/CSS.
4) **Audio:** Music/SFX play requests happen during update; volumes applied each play call.

---
## How World Building Works

### Levels
- Defined in `game/scripts/levels/*.js` as LevelDefinitions:
  ```js
  window.LevelDefinitions = window.LevelDefinitions || {};
  window.LevelDefinitions.myLevel = {
    id: 'myLevel',
    width: 6000, height: 900,
    spawn: { x: 120, y: 620 },
    theme: 'beach', // or backgroundImage
    platforms: [ { x: 0, y: 860, width: 6000, height: 40, type: 'ground' } ],
    enemies: [ { type: 'Slime', x: 900, y: 640 } ],
    items: []
  };
  ```
- `WorldBuilder.createLevel('myLevel')` builds platforms/enemies/items/background layers from this data.

### Rooms
- Defined in `game/scripts/rooms/*.js` or registered via RoomRegistry:
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
  window.roomRegistry?.register?.('my_room', myRoom);
  window.RoomDescriptors = window.RoomDescriptors || {};
  window.RoomDescriptors.my_room = myRoom;
  ```
- `RoomManager.enterRoom(myRoom)` swaps the world to the room; `exitRoom()` restores the level snapshot.

### Towns
- Data in `TownsConfig.js`:
  ```js
  {
    id: 'shoreTown',
    levelId: 'testRoom',
    region: { startX: 6500, endX: 10000 },
    music: { id: 'shoreTownTheme', src: 'music/beachside.mp3', volume: 0.9 },
    buildings: [ /* exteriors + interior ids */ ],
    setpieces: [ /* decor/backdrops */ ],
    npcs: [ /* townNpc entries */ ]
  }
  ```
- TownManager loads decor/NPCs when player is in the region; doors call RoomManager to enter interiors.

---
## Entities and the Factory
- Entities are created from plain data objects with a `type` key.
- EntityFactory holds a registry:
  ```js
  this.registerType('platform', (def) => this.platform(def.x, def.y, def.width, def.height, def.subtype));
  this.registerType('decor_platform', (def) => new DecorPlatform(def.x, def.y, def));
  this.registerType('slime', (def) => this.slime(def.x, def.y));
  // ...more registrations
  ```
- Use data to spawn:
  ```js
  { type: 'decor_platform', x: 1800, y: 760, width: 160, height: 120,
    sprite: 'art/bg/custom.png',
    hitboxHeight: 32, hitboxOffsetY: 88 }
  ```
- Built-in types include `platform`, `decor_platform`, `slime`, `chest`, `small_palm`, `sign`, `townNpc`, etc. Add new types by registering them and loading the class script before EntityFactory runs.

---
## Player, NPCs, Enemies (Basics)
- **Player (`player/Player.js`):** Fields like `x,y`, `velocity`, `gravity`, `jumpStrength`, `maxSpeed`, `health/maxHealth`, inventory. Created in `Game.initializeGameSystems()`.
- **NPCs:** Use `type: 'townNpc'` with `dialogueId`, `sprite`, `frames`, `patrol`. See `docs/npcs.md`.
  ```js
  { type: 'townNpc', id: 'guide', x: 9000, y: 820,
    sprite: 'art/sprites/guide.png', frames: 4, idleFrame: 1,
    walkFrames: [2,3], talkFrames: [0,1], dialogueId: 'npc.guide' }
  ```
- **Enemies:** Extend `Enemy` (see `docs/enemies.md`). Place via `{ type: 'YourEnemy', x, y }` after registering in EntityFactory.

---
## Platforms and Backgrounds (Level/Room)
- **Platforms:** Solid rectangles (`type: 'ground'`, `'platform'`, `'wall'`). See Platforms section in `docs/levels.md`.
- **DecorPlatform:** Modular jumpable decor with optional art; separate hitbox overrides. See `docs/decor-platform.md`.
- **Backgrounds:** Levels use `theme` (procedural/parallax) or `backgroundImage`; rooms use `backgroundImage` or `backgroundLayers`. See `docs/backgrounds.md`.

---
## UI and Dialogue
- HUD/overlays in `game/index.html`, styled in `game/styles/main.css`.
- UIManager updates HUD (health, coins, rocks), overlays (inventory, chest, shop), and starts dialogue.
- Dialogue data in `Dialogues.js` / `NPCDialogues.js` keyed by `dialogueId`:
  ```js
  window.NPCDialogues['npc.ranger'] = [
    "Stay sharp in the forest.",
    "The path splits ahead."
  ];
  ```
- SpeechBubble displays text; DialogueManager formats markup (*bold*, _italic_, `code`, %shake%, ~rainbow~, ^glow^, !bounce!, #wave#). See `docs/dialogue.md`.

---
## Audio
- Add files under `game/music/` or `game/sfx/`.
- Load/play:
  ```js
  audioManager.loadMusic('forestTheme', 'music/forest-theme.mp3');
  audioManager.playMusic('forestTheme', 0.85, { allowParallel: false });
  audioManager.loadSound('interact', 'sfx/interact.mp3');
  audioManager.playSound('interact', 0.8);
  ```
- Town music from `TownsConfig.music`; room music from room descriptor `music`.
- Volumes: Effective volume = `masterVolume * categoryVolume * requestedVolume`. Adjust via pause/settings sliders. See `docs/audio.md`.

---
## Input and Interactions
- Interaction keys (E/Enter) for doors, NPCs, signs, chests. See `docs/input-and-interactions.md`.
- To add a key:
  ```js
  game.input.keys['KeyF'] = { pressed: false, held: false };
  if (game.input.isPressed('KeyF')) { /* custom action */ }
  ```
- UI keys in `UIInputController` (confirm/cancel/navigate) can be extended similarly.

---
## Save, Load, Reset
- **Save/Load:** ProgressManager + SaveService build/apply snapshots (player stats, level id, inventory, etc.). Use pause menu or:
  ```js
  game.progress.save('slot1', 'My Save');
  game.progress.load('slot1');
  ```
- **Reset:** `game.resetGame()` clears entities/UI and rebuilds the level/player fresh. See `docs/save-and-reset.md`.

---
## Debugging Essentials
- Turn on debug: `game.debug = true;` or use the debug toggle button. Hitboxes/door radii show in debug.
- Inspect in console:
  ```js
  game.platforms.length
  game.enemies.length
  game.player.x, game.player.y, game.player.velocity
  Object.keys(game.entityFactory.registry)
  ```
- Check assets: Network tab for 200 OK; console for missing files.
- See `docs/debugging.md` for full troubleshooting steps and snippets.

---
## Building and Running
- HTML entry: `game/index.html` loads scripts in order; ensure new files are included.
- Scripts are plain JS; no build step needed if using direct HTML includes. If bundling, ensure all new classes are imported and EntityFactory registration runs after class definitions load.
- Start the game: `new Game('gameCanvas');` is called on page load in `index.html`.

---
## Common Pitfalls and Fixes
- **Falling forever:** Add a ground platform at `y = level.height - 40`; place spawn above it.
- **Missing sprites/audio:** Check path typos; ensure files exist in `art/bg/...`, `music/...`, `sfx/...`.
- **Entity not spawning:** Register `type` in EntityFactory; load class script before factory runs; match `type` string in data.
- **Room black background:** Add `backgroundImage` or `backgroundLayers` to the room descriptor.
- **Town decor invisible:** Check `setpieces` layer, `tileX/width`, and sprite paths.
- **Dialogue not showing:** Ensure `dialogueId` exists and interact key is pressed in proximity.

---
## Quick Reference Snippets
- **Level create:**
  ```js
  game.createLevel('myLevel');
  ```
- **Enter room by id:**
  ```js
  game.roomManager.enterRoomById('my_room');
  ```
- **Play sound:**
  ```js
  game.audioManager.playSound('interact', 0.8);
  ```
- **Show speech bubble:**
  ```js
  game.uiManager.showSpeechBubble("Hello!");
  ```
- **List levels/rooms:**
  ```js
  Object.keys(window.LevelDefinitions || {});
  Object.keys(window.RoomDescriptors || {});
  ```

With these foundations and the linked docs (`docs/levels.md`, `docs/rooms.md`, `docs/towns.md`, `docs/entities.md`, `docs/ui.md`, `docs/audio.md`, `docs/dialogue.md`, `docs/scenes.md`, `docs/battles.md`, `docs/cutscenes.md`, `docs/debugging.md`), you can build and extend the game confidently from scratch. ***





