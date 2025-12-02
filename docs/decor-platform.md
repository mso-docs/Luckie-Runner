# DecorPlatform Guide (Modular Jumpable Decor)

This guide explains what `DecorPlatform` is, how it fits into entities and the EntityFactory, and how to use it. It assumes no prior knowledge.

## What Is DecorPlatform?
`DecorPlatform` is a solid, jumpable surface with optional art. You can:
- Make it invisible (collision only).
- Give it custom art (sprite) with a separate collision hitbox.
- Change its width/height per instance without code changes.

File: `game/scripts/environment/DecorPlatform.js`

## How It Fits in the Entity System
- **Entity:** It extends `Entity`, so it has position (`x`, `y`), size (`width`, `height`), collision, and rendering.
- **EntityFactory:** A `decor_platform` type is registered in `game/scripts/core/EntityFactory.js`. When you place `{ type: 'decor_platform', ... }` in level/room data, the factory builds a DecorPlatform.
- **Load order:** `DecorPlatform.js` is loaded in `game/index.html` before `EntityFactory` is used.

## Key Behaviors
- Always solid (`solid = true`): player can stand on it.
- Static (no physics movement): updatePhysics is empty; it just sits where you place it.
- Optional art: If you provide `sprite`, it draws the sprite; otherwise a simple filled rectangle.
- Custom hitbox: You can set `hitboxWidth/Height` and offsets to decouple collision from the sprite size.
- **One-way collision (default for invisible)**: Invisible platforms automatically use "top-only" collision, allowing the player to pass through from below and sides but land on top when falling from above. Set `oneWay: false` to disable this behavior and use full collision.

## Fields You Can Set (per instance)
In your level/room data:
- `type`: `"decor_platform"` (factory lookup key).
- `x`, `y`: Top-left position (pixels).
- `width`, `height`: Default collision box size; also used as frame size if you don’t supply frame sizes.
- `sprite` (optional): Image path for art.
- `frameWidth`, `frameHeight` (optional): Sprite frame size if different from `width/height`.
- `frames` (optional): Number of frames; default `1`.
- `frameDirection` (optional): `"horizontal"` or `"vertical"`; default `"horizontal"`.
- `hitboxWidth`, `hitboxHeight` (optional): Collision size; defaults to `width/height`.
- `hitboxOffsetX`, `hitboxOffsetY` (optional): Collision offset from top-left; defaults to `0`.
- `fallbackColor` (optional): Color for the rectangle if no sprite is given; default gray.
- `invisible` (optional): If true, platform won't render. Defaults to `false`.
- `oneWay` (optional): If true, player can only land from above (passes through from below/sides). Defaults to `true` for invisible platforms, `false` otherwise. Set explicitly to override.

## Code Samples (Place in Level or Room Data)
Minimal invisible platform (one-way by default):
```js
{ type: 'decor_platform', x: 1200, y: 780, width: 140, height: 32, invisible: true }
```

Invisible platform with full collision (disable one-way):
```js
{ type: 'decor_platform', x: 1200, y: 780, width: 140, height: 32, invisible: true, oneWay: false }
```

With art and custom hitbox:
```js
{ type: 'decor_platform', x: 1800, y: 760, width: 160, height: 120,
  sprite: 'art/bg/custom-plant.png',
  frameWidth: 160, frameHeight: 120, frames: 1, frameDirection: 'horizontal',
  hitboxWidth: 160, hitboxHeight: 32, hitboxOffsetX: 0, hitboxOffsetY: 88 }
```

As a narrow jump pad:
```js
{ type: 'decor_platform', x: 2400, y: 700, width: 80, height: 20,
  fallbackColor: '#3a82f7' }
```

## Files to Check/Modify
- **Implementation:** `game/scripts/environment/DecorPlatform.js`
  - Defines constructor with collision box and optional sprite loading.
- **Factory registration:** `game/scripts/core/EntityFactory.js`
  - Look for `registerType('decor_platform', ...)` in `bootstrapDefaults`. The builder creates DecorPlatform and assigns `game`.
- **Script inclusion:** `game/index.html`
  - Includes `<script src="scripts/environment/DecorPlatform.js"></script>` so the class is available before the factory runs.
- **Data placement:**
  - Levels: `game/scripts/levels/*.js` (`platforms` array or any entity list processed by EntityFactory).
  - Rooms: `game/scripts/rooms/*.js` (room descriptors if you choose to add decor_platform entries).

## How to Add One (Step-by-Step)
1) Ensure `DecorPlatform.js` is loaded (already in `game/index.html`).
2) Confirm `decor_platform` is registered in `EntityFactory` (already in `bootstrapDefaults`).
3) Add a data entry to your level/room:
   ```js
   { type: 'decor_platform', x: 1000, y: 820, width: 160, height: 32 }
   ```
4) (Optional) Add `sprite` and hitbox overrides to decouple art and collision.
5) Run the game; the player can stand on it. Adjust positions/sizes as needed.

## Notes vs. SmallPalm
- `SmallPalm` stays as a specialized animated entity with drop behavior.
- `DecorPlatform` is the generic, reusable “jumpable decor” building block—no animation or drops by default, fully data-driven.
