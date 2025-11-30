# WorldBuilder Guide (Levels, Chests, Entities)

This guide explains how WorldBuilder assembles levels from data and how to extend it. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/core/WorldBuilder.js`
- Class: `WorldBuilder`

---
## Responsibilities
- Build a level from a LevelDefinition (platforms, enemies, items, hazards, chests, NPCs, background layers, flag).
- Maintain blueprints for rebuild/reset (captures entity data with `taken` flags cleared).
- Create test content (e.g., sample chests/platforms) for the test room.
- Use `EntityFactory` to create all entities from data definitions.

---
## Construction (Game.js)
```js
this.worldBuilder = new WorldBuilder(this, this.entityFactory, this.services);
```

---
## Key Methods
- `createLevel(levelId)`: build a level from `window.LevelDefinitions[levelId]` (or procedural helpers). Populates `game.platforms`, `game.enemies`, `game.items`, `game.chests`, `game.backgroundLayers`, etc.
- `buildBackground(theme)`: create parallax layers (or fallback gradient).
- `createGroundPlatforms()`, `createFloatingPlatforms()`: procedural helpers for test content.
- `captureInitialTestRoomState()` / `restoreInitialTestRoomState()`: snapshot/restore the test room layout for reliable resets.

Chests blueprinting (simplified):
```js
const chestBlueprints = (g.chests || []).map(chest => ({
  x: chest.x,
  y: chest.y,
  displayName: chest.displayName,
  contents: (chest.contents || []).map(entry => ({ ...entry, taken: false }))
}));
g.chests = (blueprint.chests || []).map(def => {
  return this.factory.chest(def.x, def.y, def.displayName,
    (def.contents || []).map(entry => ({ ...entry, taken: false })));
});
```

---
## Data Input (LevelDefinition Shape)
LevelDefinitions live under `game/scripts/levels/*.js`:
```js
window.LevelDefinitions.testRoom = {
  width: 3000, height: 600,
  spawn: { x: 100, y: 400 },
  theme: 'beach',
  platforms: [ { x:0, y:560, width:3000, height:80, type:'ground' } ],
  enemies: [ { type:'Slime', x:900, y:520 } ],
  items: [],
  chests: [ { x: 1800, y: 520, displayName: 'Beach Chest', contents: [...] } ]
};
```
WorldBuilder reads these arrays and calls `EntityFactory.create` (registered types) or dedicated helpers.

---
## Extending WorldBuilder
- Add new content arrays to LevelDefinitions (e.g., `shrines`, `portals`) and handle them in `createLevel`.
- Register new entity types in `EntityFactory` so `createLevel` can spawn them from data.
- Override/extend background creation for new themes.

---
## Troubleshooting
- Content not appearing: ensure LevelDefinition id matches the one passed to `createLevel`; ensure each entry has a registered `type`.
- Reset doesn’t refill chests: check blueprint map retains `taken: false` when cloning contents.
- Missing backgrounds: verify `theme` or `backgroundImage` is set; WorldBuilder can fall back to a gradient via `createFallbackBackground`.
