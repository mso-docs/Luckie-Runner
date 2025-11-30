# Debugging Guide (Detailed)

This guide explains how to debug the game: enabling debug mode, inspecting collisions, checking assets, tracing EntityFactory issues, and using the browser tools. It assumes minimal prior knowledge and includes code snippets.

## Debug Modes and Overlays
- **Debug toggle UI:** `#debugToggleButton` in `game/index.html` toggles debug mode. UIManager wires this to show/hide the debug panel.
- **Debug panel:** `#debugPanel` shows text info (position, velocities, state).
- **DebugRenderer:** Draws hitboxes/overlays when `game.debug` is true (see `game/scripts/core/DebugRenderer.js`).
- **Debug flags:** Many systems check `game.debug` to decide whether to draw outlines or extra info.

## Turning Debug On/Off in Code
```js
// Turn on
game.debug = true;
// Turn off
game.debug = false;
```
You can bind this to a key:
```js
window.addEventListener('keydown', (e) => {
  if (e.key === 'F3') game.debug = !game.debug;
});
```

## Viewing Collision Boxes
- Enable debug: set `game.debug = true` or use the debug toggle button.
- Collision boxes for entities (player/enemies/platforms) render via `DebugRenderer` if wired in your render loop.
- Signs/buildings doors: TownManager draws door rectangles and interact radii when `game.debug` is true.

## Inspecting Entities (Runtime)
Open the browser console:
```js
// All entities
game.platforms
game.enemies
game.items
game.npcs
game.projectiles
// Active world
game.activeWorld
// Player info
game.player.x, game.player.y, game.player.velocity
```

## Checking EntityFactory Types
If something doesn’t spawn, confirm the `type` is registered:
```js
// List registered types
Object.keys(game.entityFactory.registry)
// Manually create one to test
const test = game.entityFactory.create({ type: 'decor_platform', x: 100, y: 100, width: 100, height: 30 });
test.game = game;
game.platforms.push(test);
```

## Asset Loading (Sprites/Music/SFX)
Use the browser DevTools Network tab to check if images/audio return 200 OK.
Common checks in console:
```js
// Check if a sprite is loaded
const img = new Image(); img.onload = () => console.log('ok'); img.onerror = () => console.log('missing'); img.src = 'art/bg/buildings/exterior/house.png';
// Check a music track
fetch('music/my-level-theme.mp3').then(r => console.log(r.status));
```

## Dialogue/Callouts Debugging
- Verify `dialogueId` exists:
```js
window.NPCDialogues?.['npc.maria']
```
- Force a bubble to show:
```js
game.uiManager.showSpeechBubble("Debug line");
```
- Check callout visibility (e.g., shop ghost):
```js
document.getElementById('shopGhostBubble').classList.remove('hidden');
```

## Audio Debugging
- Ensure audio is unlocked by a user click (autoplay policies).
- Play a test sound:
```js
game.audioManager.loadSound('test', 'sfx/interact.mp3');
game.audioManager.playSound('test', 0.8);
```
- Check current volumes:
```js
game.audioManager.masterVolume
game.audioManager.musicVolume
game.audioManager.sfxVolume
```

## Physics/Movement Checks
- Print player velocity each frame (temporary):
```js
const oldUpdate = game.player.update.bind(game.player);
game.player.update = function(dt) {
  console.log('pos', this.x, this.y, 'vel', this.velocity);
  oldUpdate(dt);
};
```
- To see if onGround is set:
```js
console.log('onGround', game.player.onGround);
```

## Collision Troubleshooting
- If the player falls forever: add a ground platform:
```js
game.platforms.push(game.entityFactory.platform(0, game.level.height - 40, game.level.width, 40, 'ground'));
```
- For custom entities with wrong hitboxes, check `width/height` and hitbox overrides (e.g., for DecorPlatform use `hitboxWidth/Height/OffsetX/OffsetY`).

## UI/Overlay Debugging
- Force overlays on:
```js
document.getElementById('inventoryOverlay')?.classList.remove('hidden');
document.getElementById('shopOverlay')?.classList.remove('hidden');
```
- Check DOM ids/classes match what UIManager expects.

## Rooms/Towns Debugging
- Show current world:
```js
console.log(game.activeWorld);
console.log('currentRoomId', game.currentRoomId, 'currentLevelId', game.currentLevelId);
```
- Force enter a room:
```js
game.roomManager.enterRoomById('shorehouseinterior');
```
- Check town detection:
```js
game.townManager.getTownForPosition(game.currentLevelId, game.player.x);
```

## Background/Layer Issues
- If backgrounds are black in levels: ensure `theme` or `backgroundImage` is set.
- If rooms are black: set `backgroundImage` in the room descriptor or provide `backgroundLayers`.
- For town backdrops (fronds), verify `setpieces` layer and `tileX/width` settings (see `docs/towns.md`).

## Save/Load/Reset Debugging
- Inspect slots:
```js
game.progress?.saveSlots  // if exposed by ProgressManager
```
- Force save/load:
```js
game.progress.save('slot1', 'Debug Save');
game.progress.load('slot1');
```
- Reset game:
```js
game.resetGame();
```

## Enabling Browser DevTools Helpers
- Set breakpoints in scripts (e.g., `Player.js`, `CollisionSystem.js`) to pause and inspect variables.
- Use `console.log` sparingly in loops; prefer conditional logs:
```js
if (game.debug) console.log('player', game.player.x, game.player.y);
```

## Common Debugging Sequence
1) Turn on debug (`game.debug = true`) to see hitboxes.
2) Check the console for missing files or undefined classes.
3) Verify EntityFactory registration and `type` strings.
4) Confirm assets load (Network tab).
5) Inspect world state (`game.activeWorld`, `game.platforms.length`, `game.enemies.length`).
6) Force UI/dialogue to ensure wiring is correct.
7) Adjust coordinates: remember y increases downward.

## Useful One-Liners
- List rooms:
```js
Object.keys(window.RoomDescriptors || {});
```
- List levels:
```js
Object.keys(window.LevelDefinitions || {});
```
- Check player state:
```js
({ x: game.player.x, y: game.player.y, hp: game.player.health, onGround: game.player.onGround });
```
- Teleport player:
```js
game.player.x = 5000; game.player.y = 800;
```

With these tools and snippets, you can triage most issues: spawning, collisions, UI/overlay visibility, audio, backgrounds, and world transitions.
