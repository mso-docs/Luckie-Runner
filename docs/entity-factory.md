# EntityFactory Guide (Registering and Spawning Entities)

This guide explains how entities are registered and created from data. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/core/EntityFactory.js`
- Class: `EntityFactory`

---
## Responsibilities
- Maintain a registry of creator functions keyed by `type`.
- Provide helpers to build common entities (platforms, chests, enemies, items, NPCs, decor, projectiles).
- Spawn entities from plain data objects (used by WorldBuilder/RoomManager).

---
## Core API
- `registerType(type, builderFn)`: add a builder that returns an Entity instance.
- `create(def)`: create an entity from `{ type, ... }` data via the registry.
- Convenience helpers: `platform`, `decorPlatform`, `slime`, `chest`, etc., each returning instances and setting `.game`.

Example registration:
```js
this.registerType('myEnemy', (def) => new MyEnemy(def.x, def.y));
```
Spawn from data:
```js
const enemy = entityFactory.create({ type: 'myEnemy', x: 400, y: 500 });
```

---
## Built-in Types (Examples)
- `platform`, `decor_platform`
- `slime` (and other enemies registered elsewhere)
- `chest`
- `townNpc` (NPCs)
- Projectiles (via `Projectile` subclasses if registered)

---
## Adding a New Entity Type
1) Create a class (e.g., `MyEnemy`) with a constructor `(x, y, ...)` and a `render/update`.
2) Ensure the file is loaded before `EntityFactory` registration (script order/imports).
3) Register the type:
   ```js
   entityFactory.registerType('myEnemy', (def) => new MyEnemy(def.x, def.y));
   ```
4) Use in data:
   ```js
   { type: 'myEnemy', x: 320, y: 480 }
   ```

---
## Data-Driven Spawning (WorldBuilder/RoomManager)
- LevelDefinitions/Room descriptors include arrays with `type` keys.
- WorldBuilder/RoomManager call `entityFactory.create(def)` to build them.
- For chests, contents are copied with `taken: false` to allow reset/refill.

---
## Troubleshooting
- “Unknown type”: register the type before `create` is called; check spelling.
- Entity missing game context: set `entity.game = this.game` in your builder if needed.
- Scripts not loading: ensure new class file is included in `index.html` or your bundler before EntityFactory uses it.
