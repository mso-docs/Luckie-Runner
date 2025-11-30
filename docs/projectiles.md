# Creating a New Projectile from Scratch

This guide shows how to author a custom projectile, wire it into the factory, and use it in player or enemy attacks. It covers the coordinate system, core fields, and integration points. Minimal prior knowledge is assumed.

## Core Components
- **Projectile base** (`game/scripts/core/Projectile.js`): Handles movement, lifetime, collision with targets/obstacles, hit effects, and optional trail.
- **Concrete projectile class**: Your class extends `Projectile` (e.g., `game/scripts/core/MyProjectile.js` or similar).
- **EntityFactory** (`game/scripts/core/EntityFactory.js`): Spawns projectiles from `{ type: 'your_projectile', ... }` data.
- **CollisionSystem**: Uses projectile bounds for collisions vs. platforms/targets; uses `hitTarget`/`hitObstacle`.
- **Launchers**: Player/enemy code that instantiates the projectile (e.g., player throw, enemy AI).

## Coordinate & Movement Basics
- Origin `(0,0)` is top-left; X increases right, Y increases downward.
- Projectiles use `x`, `y` as top-left. Typically spawned at the shooter’s position with an initial `velocity { x, y }` in pixels per second.
- Gravity defaults to `0` in `Projectile`; subclasses like `Rock` set gravity > 0 for arcs.

## Step 1: Implement Your Projectile Class
Place it where you keep projectiles (can live beside `Projectile.js` or in a new file). Extend `Projectile`, set size, damage, gravity, sprites, and override hooks.

```js
// game/scripts/core/Fireball.js
class Fireball extends Projectile {
  constructor(x, y, velocity, config = {}) {
    super(x, y, config.width ?? 20, config.height ?? 20, velocity, config.damage ?? 25);
    this.ownerType = config.ownerType || 'player'; // 'player' or 'enemy'
    this.lifeTime = config.lifeTime ?? 2500;
    this.gravity = config.gravity ?? 0;            // 0 = straight shot
    this.piercing = config.piercing ?? false;      // hit multiple targets?
    this.autoFadeOnImpact = config.autoFadeOnImpact ?? true;
    this.hitSound = config.hitSound || 'fire_hit';
    this.throwSound = config.throwSound || 'fire_cast';

    // Visuals
    this.loadSprite(config.sprite || 'art/sprites/fireball.png', {
      frameWidth: config.frameWidth || 20,
      frameHeight: config.frameHeight || 20,
      frames: config.frames || 4,
      frameTimeMs: config.frameTimeMs || 90,
      frameDirection: config.frameDirection || 'horizontal'
    });
  }

  onHitTarget(target) {
    // Example: apply burning debuff if target supports it
    if (target && typeof target.applyStatus === 'function') {
      target.applyStatus('burn', { duration: 3000, tickDamage: 2 });
    }
  }

  onHitObstacle(obstacle) {
    // Optional: explode on walls
    this.createHitEffect(obstacle);
  }
}

if (typeof window !== 'undefined') window.Fireball = Fireball;
if (typeof module !== 'undefined' && module.exports) module.exports = Fireball;
```

### Key Base Fields (Projectile)
- `damage`: How much damage to apply on hit (modified by owner’s `modifyOutgoingDamage` if present).
- `velocity { x, y }`: Pixels per second; updated each frame for movement.
- `speed`/`direction`: Derived from `velocity`.
- `gravity`: Defaults `0`; set >0 for arcs.
- `lifeTime` (ms), `age`: Auto-despawn after `lifeTime`.
- `piercing` (bool): If false, one target and stop (or fade); if true, can hit multiple (tracked in `hitTargets`).
- `owner` / `ownerType`: Who fired it; `ownerType` affects collision targeting (`player` projectiles hit enemies, `enemy` projectiles hit player).
- `autoFadeOnImpact`: If true, starts fade-out on hit/obstacle (unless piercing).
- `hitSound` / `throwSound`: Played via audio manager.
- Hooks to override: `onHitTarget(target)`, `onHitObstacle(obstacle)`, optionally `render`/`drawTrail`.

## Step 2: Register in EntityFactory
Add a builder so data `{ type: 'fireball', x, y, velocity: {x, y}, ... }` creates your class. Update `game/scripts/core/EntityFactory.js`:

```js
// e.g., in bootstrapDefaults or a custom block
this.registerType('fireball', (def) => {
  const proj = new Fireball(def.x ?? 0, def.y ?? 0, def.velocity || { x: 300, y: 0 }, def);
  proj.game = this.game;
  if (def.owner) proj.setOwner(def.owner, def.ownerType || 'player');
  return proj;
});
```

Ensure `Fireball` is in scope (global or imported) before registration.

## Step 3: Load the Projectile Script
Include your file in `game/index.html` (or bundle import) before `EntityFactory` runs:

```html
<script src="scripts/core/Fireball.js"></script>
```

If bundling, import it in the bundle entry that also includes `EntityFactory`.

## Step 4: Launching the Projectile
From player or enemy code:

```js
// Example: player casts fireball to the right
const speed = 420;
const dir = 1; // -1 for left
const velocity = { x: speed * dir, y: 0 };
const spawnX = player.x + player.width / 2;
const spawnY = player.y + player.height / 2;
const proj = game.entityFactory.create({
  type: 'fireball',
  x: spawnX,
  y: spawnY,
  velocity,
  owner: player,
  ownerType: 'player'
});
if (proj) {
  proj.game = game;
  game.projectiles.push(proj);
}
```

Placement notes:
- Use the shooter’s position; offset slightly to avoid immediate self-collision.
- For arcs, set `velocity.y` and `gravity > 0`.
- For enemy shots, set `ownerType: 'enemy'` so they damage the player.

## How Collisions Are Handled
- `Projectile.checkCollisions` (base) checks:
  - If `ownerType === 'player'`: hits `game.enemies`.
  - If `ownerType === 'enemy'`: hits `game.player`.
  - Solid platforms (`game.platforms`) as obstacles.
- On hit: `hitTarget` → apply damage, call `onHitTarget`, optionally fade.
- On obstacle: `hitObstacle` → call `onHitObstacle`, optionally fade.
- If `piercing` is false, it tracks `hitTargets` to avoid multiple hits on the same entity.

## Visuals and Trails
- Override `render` to customize drawing; base draws sprite and a trail (skips trail for Rock/Coconut).
- `drawTrail`: You can override to draw particles or streaks; trail length often tied to `speed`.
- Set `rotation = Math.atan2(velocity.y, velocity.x)` to align sprite with flight direction (base already sets this).

## Audio
- `throwSound` and `hitSound` are played via `audioManager`/`services.audio`. Set ids to valid sounds (or add sounds to the manager).

## Checklist
1) Implement your projectile class extending `Projectile`; set size, damage, gravity, lifeTime, sprites, sounds; override hooks as needed.
2) Register a factory type in `EntityFactory` to create it from data; set `game` and `owner`.
3) Load the projectile script before factory use.
4) Spawn it from player/enemy logic with `entityFactory.create({ type: 'your_type', x, y, velocity, owner, ownerType })` and push to `game.projectiles`.
5) Test collisions, fade behavior, damage, and visuals.

## Troubleshooting
- **Doesn’t spawn**: Check `type` matches factory registration; script is loaded; `velocity` provided.
- **No damage**: Ensure `ownerType` is correct and targets are active; confirm `damage` is set and `takeDamage` exists on targets.
- **Stops instantly**: Verify `lifeTime` and collisions; make sure it’s not immediately colliding with the shooter (offset spawn).
- **Falls wrong**: Adjust `gravity` and initial `velocity.y`; set `gravity=0` for straight shots.
- **Trail/sprite missing**: Confirm `loadSprite` path; override `drawTrail` if you want custom visuals.
