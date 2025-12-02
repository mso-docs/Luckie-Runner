# Collision System Guide (Physics, Boxes, and Reactions)

This guide explains the collision system, what it checks, and how to work with hitboxes. It assumes no prior knowledge.

---
## Files and Classes
- Collision system: `game/scripts/core/CollisionSystem.js`
- Collision boxes: `game/scripts/core/CollisionBox.js` (hitbox helpers on entities)
- Projectile base: `game/scripts/core/Projectile.js` (uses collision checks)

---
## What CollisionSystem Does
- Per-frame checks between the player, platforms, enemies, items, hazards, projectiles, and NPCs.
- Resolves AABB (axis-aligned) collisions: pushes entities apart, sets flags (e.g., `player.onGround`).
- Routes reactions: item pickup, hazard damage, projectile hits on enemies/NPCs, simple enemy-player overlap handling.

---
## Key Methods (CollisionSystem)
- `update(deltaTime)`: master tick; calls the specific checks below.
- `checkPlayerCollisions()`: player vs. platforms/enemies/items/hazards.
- `checkProjectileCollisions()`: projectiles vs. enemies/NPCs/walls; destroys or triggers reactions.
- `resolvePlayerPlatform(player, platform)`: AABB resolve; sets `onGround`, adjusts velocity.
- `handleEnemyPlayerCollision(enemy, player)`: damage or knockback (implementation in systems/enemy logic).
- `handleItemPickup(item, player)`: calls `item.collect(player)`.

The system is created in `Game` and used by `GameSystems.update`.

---
## Hitboxes on Entities
- Entities inherit from `Entity` which sets `width/height` and provides a default AABB.
- `CollisionBox` can override bounds via offsets if an entity defines `hitboxWidth/Height/OffsetX/OffsetY`.
Example (custom hitbox):
```js
class MyEnemy extends Entity {
  constructor(x, y) {
    super(x, y, 80, 80); // sprite size
    this.hitboxWidth = 48;
    this.hitboxHeight = 40;
    this.hitboxOffsetX = 16;
    this.hitboxOffsetY = 24;
  }
}
```

---
## One-Way Platforms (Top-Only Collision)
- Platforms marked with `oneWay` or `topOnly` flags allow the player to pass through from below and sides, but land on top when falling from above.
- Uses `Game.topOnlyLanding()` method with a tolerance window (`game.softLandingTolerance`, default 20px).
- **Default behavior**: Invisible platforms (`invisible: true`) automatically use one-way collision. Override with `oneWay: false` for full collision.
- Examples: SmallPalm, invisible DecorPlatforms, town colliders.
- Implementation: `CollisionSystem.checkPlayerCollisions()` checks for `platform.oneWay` or `platform.topOnly` and routes to `topOnlyLanding()` instead of full AABB resolution.

### Landing Requirements
For a player to land on a one-way platform:
1. **Descending**: Player velocity.y must be > 0 (actively falling)
2. **From above**: Player's top edge must be above the platform's top
3. **Within tolerance**: Player's bottom edge within 20px of platform's top
4. **Horizontal overlap**: Player and platform must overlap horizontally

### Entity Behavior with One-Way Platforms
- **Player**: Can land from above, pass through from below/sides
- **Enemies**: Completely ignore one-way platforms (pass through entirely)
- **NPCs**: Use same top-only landing as player
- **Projectiles**: Collide normally with all platforms (including one-way)
- **Items**: Collide normally with all platforms (including one-way)

---
## Projectile Collisions
- Projectiles call `CollisionSystem.checkProjectileCollisions` inside `GameSystems`.
- On hit:
  - Plays SFX if defined.
  - Applies enemy/NPC reaction (see `CollisionSystem.updateProjectilePhysics` and enemy/NPC logic).
  - Destroys projectile if configured.

---
## Adding a New Collidable Entity
1) Define size in the constructor (`width/height`).
2) Optional: define custom hitbox via `hitboxWidth/Height/OffsetX/OffsetY`.
3) Decide how it reacts on collision:
   - Items: implement `collect(player)`.
   - Hazards: implement `onPlayerCollide(player)`.
   - Enemies: implement `onPlayerCollide(player)` or damage logic.
4) Register it in `EntityFactory` so world builders can spawn it from data.

---
## Adjusting Collision Behavior
- Ground feel: tweak player `onGround` logic in `resolvePlayerPlatform` and player gravity/jump values.
- Projectile sizes: set `width/height` on projectiles for correct hitboxes.
- Tuning pickup radius: adjust item dimensions or their hitbox offsets.

---
## Troubleshooting
- “Falling through platforms”: ensure platforms use `type` that is treated as solid; verify `width/height` and positions; check `CollisionSystem.checkPlayerCollisions` is being called (play state).
- “Projectiles pass through”: confirm projectiles are added to `game.projectiles` and updated each frame; check their size/hitbox.
- “Player can’t pick up items”: ensure items implement `collect(player)` and are in `game.items`; confirm hitbox overlaps in the debugger (toggle hitbox overlay in debug mode).
