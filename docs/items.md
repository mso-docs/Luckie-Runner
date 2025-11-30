# Creating a New Item from Scratch

This guide explains how to author a brand-new collectible item: what classes to extend, how to wire the factory, how to load scripts, and how to place items in levels or rooms. It assumes minimal prior knowledge of the codebase.

## Core Components
- **Item base** (`game/scripts/items/Item.js`): Handles bobbing, gravity, magnet pickup, lifetime, collection flow, sounds, and rendering.
- **Concrete item class**: Your item file (e.g., `game/scripts/items/Orb.js`) extends `Item` and overrides behavior/appearance.
- **EntityFactory** (`game/scripts/core/EntityFactory.js`): Spawns items from plain data `{ type: 'your_item_type', ... }`.
- **Placement data**: Level definitions (`game/scripts/levels/*.js`) or room descriptors (`game/scripts/rooms/*.js`) include `items: [...]` entries.
- **CollisionSystem**: Handles item collision with player for pickup (uses `Item.checkCollision`).

## Coordinate Basics (Placement)
- Origin `(0,0)` is top-left of the world; X increases right, Y increases downward.
- Place items using `x`, `y` as **top-left** coords.
- Put the item above ground/platforms so gravity drops it onto a surface. Typical ground top: near `level.height - 40` for a 900px tall level.

## Step 1: Implement Your Item Class
Create a new file under `game/scripts/items/`. Extend `Item`, set visuals, and override `applyEffect` / `onCollected` as needed.

```js
// game/scripts/items/Orb.js
class OrbItem extends Item {
  constructor(x, y, config = {}) {
    super(x, y, config.width ?? 28, config.height ?? 28);
    this.type = 'orb';
    this.value = config.value ?? 1;                // amount granted
    this.collectSound = config.collectSound || 'item_pickup';
    this.collectMessage = config.collectMessage || `+${this.value} Orb`;
    this.collectScore = config.collectScore ?? 10;
    this.magnetRange = config.magnetRange ?? 90;   // attracts from further away
    this.autoCollect = config.autoCollect ?? true; // auto-grab when close
    this.bobHeight = 3;
    this.bobSpeed = 2.5;

    // Sprite setup (falls back to colored box if not found)
    this.loadSprite(config.sprite || 'art/items/orb.png', {
      frameWidth: config.frameWidth || 28,
      frameHeight: config.frameHeight || 28,
      frames: config.frames || 4,
      frameTimeMs: config.frameTimeMs || 120,
      frameDirection: config.frameDirection || 'horizontal'
    });
  }

  applyEffect(collector) {
    // Example: add to a custom meter
    if (collector && typeof collector.addOrbs === 'function') {
      collector.addOrbs(this.value);
    }
    return true; // returning true keeps collection effects/sounds
  }

  onCollected(collector) {
    // Optional: hook for analytics/drops
  }
}

// Browser global
if (typeof window !== 'undefined') {
  window.OrbItem = OrbItem;
}
// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrbItem;
}
```

### Key Item Base Fields (from `Item`)
- `collectible` (bool): Can be collected.
- `collected` (bool): Set true after pickup.
- `value` (number): Meaning is item-specific; often counts/points.
- `magnetRange` (px), `magnetSpeed`: Attraction to player when nearby.
- `autoCollect` (bool): If true, auto-picks up when close.
- `bobHeight`, `bobSpeed`: Idle bob animation.
- `gravity`, `friction`, `maxSpeed`: Physics tuning for how items fall/settle.
- `collectSound`: Sound id played on pickup.
- `collectMessage`: Optional UI message (not fully implemented yet).
- `collectScore`: Score bonus applied to collector if present.
- Lifetime: `hasLifetime`, `lifetime`, `blinkTime` (start blinking), `age`, `blinking`.
- Spawn animation: `spawnAnimation`, `spawnDuration`, `spawnScale`.
- Overridable hooks: `applyEffect(collector)`, `onCollected(collector)`, `onExpired()`, `onItemUpdate(deltaTime)`, `renderEffects(...)`.

## Step 2: Register in EntityFactory
Add a factory branch so data `{ type: 'orb', x, y, ... }` creates `OrbItem`. Update `game/scripts/core/EntityFactory.js`:

```js
// near other registerType calls (bootstrapDefaults or custom block)
this.registerType('orb', (def) => {
  const item = new OrbItem(def.x ?? 0, def.y ?? 0, def);
  item.game = this.game;
  return item;
});
```

Ensure `OrbItem` is in scope (global via script include or imported if bundling).

## Step 3: Load the Item Script
In `game/index.html` (or your bundler entry), include the script before `EntityFactory` is used:

```html
<script src="scripts/items/Orb.js"></script>
```

If bundling, import the file so it is available at runtime where `EntityFactory` runs.

## Step 4: Place the Item in a Level or Room
Use the `items` array in level/room descriptors. Example in a LevelDefinition:

```js
items: [
  { type: 'orb', x: 520, y: 780, value: 3, autoCollect: true }
]
```

Placement tips:
- `x`, `y` are top-left. Place above a platform so it settles.
- For floating pickups, rely on bobbing: set `y` where you want it to hover; gravity will be mild.
- In rooms: ensure `autoFloor/autoWalls` or manual platforms keep the item inside bounds.

## How Items Integrate at Runtime
- `WorldBuilder`/`RoomWorldBuilder` calls `entityFactory.create(def)` for each item definition.
- The created item gets `game` assigned (if you set it in the factory).
- `CollisionSystem` tests collisions between player and items; on hit, `item.collect(player)` is called.
- `Item.collect` runs `applyEffect`, plays sounds, toggles visibility/active, triggers hooks.
- Renderer draws the item sprite each frame (with glow/shadow from base `render` override).

## Adding Effects/Behavior
- **Custom effect**: Override `applyEffect(collector)` to modify player stats, ammo, buffs, etc.
- **Timed items**: Call `setLifetime(ms)` in the constructor to auto-expire; override `onExpired` for behavior.
- **Auto-collect**: Set `this.autoCollect = true` to pick up when very close.
- **Magnet tuning**: Increase `magnetRange`/`magnetSpeed` for generous pickup.
- **Visuals**: Override `renderEffects` to draw particles; adjust `bobHeight`/`bobSpeed` for motion.

## Checklist
1) Create your item class in `game/scripts/items/YourItem.js`, extending `Item`.
2) Register a factory entry in `EntityFactory` (e.g., `registerType('your_item', ...)`), set `item.game`.
3) Load the item script in `index.html` (or bundle) before `EntityFactory` is used.
4) Add item definitions to levels/rooms with `{ type: 'your_item', x, y, ... }`.
5) Test pickup, magnet behavior, sound, and any player effect. Use debug overlay to see collisions if needed.

## Troubleshooting
- **Item not spawning**: Check the `type` string matches the factory registration; ensure the script is loaded.
- **Falls forever**: Place above ground; ensure a platform exists under the item’s `x`.
- **No pickup**: Confirm `collectible` is true and CollisionSystem runs; ensure player overlaps the item’s hitbox.
- **No effect**: Make sure `applyEffect` returns true and the collector has the expected methods (e.g., `addOrbs`).
- **Sprite missing**: Verify path in `loadSprite` and that the image loads (check DevTools Network).
