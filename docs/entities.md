# Entities and the EntityFactory

This guide explains what an “entity” is in the game, how the Entity base works, and how the EntityFactory creates them. It assumes no prior knowledge of the game or its vocabulary.

## What Is an Entity?
An entity is any game object that participates in updates, collisions, and/or rendering. Examples: player, enemies, items, projectiles, platforms, NPCs, signs, and shops. Entities usually have:
- **Position/size:** `x`, `y` (top-left), `width`, `height`.
- **Physics fields:** `velocity {x,y}`, `gravity`, `friction`, `solid` (blocks movement?), `onGround`.
- **Lifecycle:** `active` (updates/render only when true), `visible` (drawn only when true).
- **Rendering helpers:** `sprite`, `frame` info, `render(ctx, camera)`.
- **Behavior hooks:** `update(deltaTime)` (or `onUpdate`), collision handlers, custom methods.

The base class is `Entity` (`game/scripts/core/Entity.js`). Most objects extend it (directly or indirectly).

## Entity Base Highlights
From `Entity` you get:
- Position/size (`x`, `y`, `width`, `height`).
- Movement helpers (`velocity`, `gravity`, `friction`, `maxSpeed`).
- Flags (`active`, `visible`, `solid`, `onGround`).
- Rendering: `loadSprite(path, opts)`, `render(ctx, camera)`, frame/animation helpers.
- Collision bounding boxes via `CollisionDetection`.
- Hooks to override: `update(deltaTime)` or `onUpdate` (depending on subclass), custom reaction methods.

## The EntityFactory
File: `game/scripts/core/EntityFactory.js`. Purpose: central place to construct entities from plain data objects. It holds a registry of builder functions keyed by `type`.

### How the Registry Works
- `registerType(type, builderFn)`: Add a builder for a given `type` string. The builder receives `def` (plain data) and the factory/game context.
- `bootstrapDefaults()`: Registers built-in types (platform, slime, health_potion, coffee, chest, small_palm, shopGhost, princess, balloonFan, sign, flag, townNpc).
- `create(def)`: Looks up `def.type` in the registry and calls the builder; returns the constructed entity or `null`.
- Helpers (`platform`, `slime`, `healthPotion`, etc.) are thin wrappers that set up specific entity classes, attach `game`, and return them.

### Why Use the Factory?
- Data-driven: Levels/rooms/npcs/items can be defined as plain objects and turned into live entities automatically.
- Central wiring: Ensures new entities get `game` assigned and any defaults applied.
- Extensibility: You can add new types without touching all call sites—just register once.

## Creating a Custom Entity Type
Steps:
1) **Create the class** (extend `Entity` or another subclass).
2) **Register a factory type** for it.
3) **Reference it in data** (levels/rooms/npcs/items/etc.) via `{ type: 'YourType', ... }`.

### 1) Create the Class
```js
// game/scripts/core/entities/MovingBlock.js
class MovingBlock extends Entity {
  constructor(x, y, config = {}) {
    super(x, y, config.width ?? 120, config.height ?? 40);
    this.type = 'MovingBlock';
    this.solid = true;                 // blocks player/others
    this.speed = config.speed ?? 60;   // px/sec
    this.range = config.range ?? 300;  // travel distance before reversing
    this.startX = x;
    this.direction = 1;                // 1:right, -1:left
    this.loadSprite(config.sprite || 'art/platforms/moving-block.png', {
      frameWidth: this.width,
      frameHeight: this.height
    });
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.x += this.direction * this.speed * dt;
    if (Math.abs(this.x - this.startX) >= this.range) {
      this.direction *= -1; // reverse direction
    }
  }
}

if (typeof window !== 'undefined') window.MovingBlock = MovingBlock;
if (typeof module !== 'undefined' && module.exports) module.exports = MovingBlock;
```

Key fields explained:
- `type`: Registry key and useful for debugging.
- `solid`: Determines collision blocking.
- `speed`, `range`, `direction`: Custom movement parameters.
- `loadSprite(...)`: Attach a sprite; if omitted, a fallback rectangle renders.
- `update(deltaTime)`: Called every frame to move/animate/behave.

### 2) Register the Type
In `EntityFactory` (e.g., `bootstrapDefaults` or after construction):
```js
// Ensure MovingBlock script is loaded before this runs
this.registerType('MovingBlock', (def) => {
  const e = new MovingBlock(def.x ?? 0, def.y ?? 0, def);
  e.game = this.game;
  return e;
});
```

### 3) Reference It in Data
In a level or room definition:
```js
platforms: [
  { type: 'platform', x: 0, y: 860, width: 4000, height: 40, subtype: 'ground' },
  { type: 'MovingBlock', x: 600, y: 720, width: 140, height: 40, speed: 80, range: 260 }
]
```
The factory will see `type: 'MovingBlock'` and build your entity. Ensure your builder accepts the fields you set in data.

## Common Entity Fields (Data)
When you define entities in level/room data, you typically set:
- `type` (string): Factory lookup key.
- `x`, `y` (numbers): Top-left position in world coordinates.
- `width`, `height` (numbers): Size.
- Additional, type-specific fields (e.g., `speed`, `health`, `damage`, `patrol`, `sprite`, `frames`, `frameDirection`).

### New: decor_platform (modular, jumpable decor with optional art)
Add via data to place invisible or skinned solid platforms (separate from SmallPalm):
```js
{ type: 'decor_platform', x: 1200, y: 780, width: 140, height: 32 }
// With art + custom hitbox
{ type: 'decor_platform', x: 1800, y: 760, width: 160, height: 50,
  sprite: 'art/bg/custom-plant.png', frameWidth: 160, frameHeight: 120,
  hitboxWidth: 160, hitboxHeight: 32, hitboxOffsetX: 0, hitboxOffsetY: 88 }
```
- Collision: always solid; you can override hitbox size/offset with `hitboxWidth/height/offsetX/offsetY`.
- Visuals: optional `sprite`, `frameWidth`, `frameHeight`, `frames`, `frameDirection`; if omitted, a simple filled rectangle shows.
- Use this for jumpable/invisible pads; keep `SmallPalm` for its special animation/drop behavior.

## Where Entities Get Created from Data
- **Levels** (`game/scripts/levels/*.js`): `WorldBuilder` reads `platforms/enemies/items/npcs/...` arrays and calls `entityFactory.create(def)`.
- **Rooms** (`game/scripts/rooms/*.js`): `RoomWorldBuilder` does the same for room descriptors.
- **Towns** (`game/scripts/core/config/TownsConfig.js`): TownManager builds town decor/buildings/NPCs, using `entityFactory` for NPCs (type `townNpc`).
- **Runtime spawns**: Player attacks, enemy attacks, loot drops call `entityFactory.create(def)` manually.

## Render & Collision Notes
- Render: `Entity.render(ctx, camera)` draws the sprite at `x - camera.x`, `y - camera.y`. Override if you need custom drawing.
- Collision: `CollisionDetection` helpers (AABB) are used in systems like `CollisionSystem`. Set `solid` for blocking; implement your own collision response if needed.

## Testing & Troubleshooting
- **Doesn’t spawn**: Check `type` matches registration; ensure the class script is loaded before registration; confirm data is passed to `entityFactory.create`.
- **Wrong size/position**: Verify `width/height` and `x/y`; remember y grows downward.
- **No sprite**: Ensure `loadSprite` path is correct and asset exists; DevTools Network tab helps.
- **No behavior**: Confirm `update` runs (entity must be `active` and included in the relevant update loop).
- **Collisions off**: Set `solid` for blocking; ensure collision systems include your entity type or implement custom checks.
