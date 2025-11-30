# Creating a New Enemy from Scratch

This guide explains how to add a brand-new enemy: where the code lives, how the data flows, what fields matter, and how to place enemies in levels/rooms. It assumes minimal prior knowledge of the codebase.

## Core Components
- **Enemy class**: Base behaviors (movement, health, damage hooks). See `game/scripts/enemies/Enemy.js`.
- **Concrete enemy file**: E.g., `game/scripts/enemies/Slime.js`. You create a similar file for your enemy.
- **EntityFactory** (`game/scripts/core/EntityFactory.js`): Builds enemies from plain `{ type: 'YourEnemy', ... }` definitions used in levels/rooms.
- **CollisionSystem** (`game/scripts/core/CollisionSystem.js`): Handles enemy collisions with player/projectiles/platforms.
- **Level definitions / Rooms**: Place enemies by adding entries to `enemies: [{ type: 'YourEnemy', x, y, ... }]`.

## Coordinate Basics
- Origin `(0,0)` is top-left of the world; X increases right, Y increases downward.
- Place enemies with `x`, `y` at their **top-left** position in world coordinates.
- Ensure `y` is above or on a platform/ground; gravity will pull them down until they land on a solid surface.

## Step 1: Implement the Enemy Class
Create a new file in `game/scripts/enemies/`. Extend `Enemy` (base class). Override animation, update, and attack logic as needed.

```js
// game/scripts/enemies/Beetle.js
class Beetle extends Enemy {
  constructor(x, y, config = {}) {
    super(x, y, config);
    this.type = 'Beetle';
    this.width = config.width ?? 48;
    this.height = config.height ?? 32;
    this.speed = config.speed ?? 60;           // horizontal patrol speed
    this.health = config.health ?? 30;
    this.damage = config.damage ?? 10;         // damage to player on contact
    this.patrol = config.patrol || null;       // optional patrol points [{x},{x}]
    this.gravity = config.gravity ?? this.gravity; // inherit base gravity if not set

    // Sprite setup
    this.sprite = new Image();
    this.sprite.src = config.sprite || 'art/sprites/beetle.png';
    this.frames = config.frames ?? 4;
    this.frameWidth = config.frameWidth ?? 48;
    this.frameHeight = config.frameHeight ?? 32;
    this.frameTimeMs = config.frameTimeMs ?? 120;
    this.frameDirection = config.frameDirection ?? 'horizontal'; // or 'vertical'
    this.frameIndex = 0;
    this._frameTimer = 0;

    // Simple AI state
    this.direction = 1; // 1 = right, -1 = left
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.applyPatrol(deltaTime);
    this.animate(deltaTime);
  }

  applyPatrol(deltaTime) {
    const dt = deltaTime / 1000;
    this.x += this.direction * this.speed * dt;
    if (this.patrol && this.patrol.length >= 2) {
      const minX = Math.min(...this.patrol.map(p => p.x));
      const maxX = Math.max(...this.patrol.map(p => p.x));
      if (this.x <= minX || this.x >= maxX) {
        this.direction *= -1; // flip at patrol bounds
      }
    }
  }

  animate(deltaTime) {
    this._frameTimer += deltaTime;
    if (this._frameTimer >= this.frameTimeMs) {
      const advance = Math.floor(this._frameTimer / this.frameTimeMs);
      this._frameTimer -= advance * this.frameTimeMs;
      this.frameIndex = (this.frameIndex + advance) % this.frames;
    }
  }
}

// Browser global
if (typeof window !== 'undefined') {
  window.Beetle = Beetle;
}
// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Beetle;
}
```

### Key Fields Explained
- `width`/`height`: Collision box size. Used by physics and rendering.
- `speed`: Patrol/roaming speed (px/sec).
- `health`: Hit points; CollisionSystem and Enemy base use this to handle hits.
- `damage`: Applied to player on contact.
- `patrol`: Optional array of x-coordinates. Enemy flips direction at ends.
- `gravity`: Vertical acceleration; inherit base unless you need special gravity.
- `sprite`, `frames`, `frameWidth`, `frameHeight`, `frameTimeMs`, `frameDirection`: Control animation slicing and timing.
- `direction`: Simple facing/patrol direction toggle.

## Step 2: Register in EntityFactory
Add a creation branch so `{ type: 'Beetle', x, y, ... }` spawns your enemy. Edit `game/scripts/core/EntityFactory.js`.

```js
// Inside EntityFactory.create(def)
case 'Beetle':
  return new Beetle(def.x ?? 0, def.y ?? 0, def);
```

Ensure `Beetle` is in scope (import or rely on global `window.Beetle` if scripts are loaded in order).

## Step 3: Load the Enemy Script
Include your enemy file in `game/index.html` (or your bundler entry) before `EntityFactory` is used:

```html
<script src="scripts/enemies/Beetle.js"></script>
```

If bundling, import it where you assemble the bundle so it’s available globally or imported into `EntityFactory`.

## Step 4: Place the Enemy in a Level or Room
Add entries to `enemies` arrays in:
- **LevelDefinition** (`game/scripts/levels/*.js`)
- **Room descriptors** (`game/scripts/rooms/*.js` or registered via `roomRegistry`)

Example placement in a level:
```js
enemies: [
  { type: 'Beetle', x: 1200, y: 760, patrol: [{ x: 1180 }, { x: 1500 }], speed: 80, health: 40 }
]
```

Placement rules:
- `x`, `y` are top-left coordinates.
- Put `y` above ground/platform; gravity will settle the enemy on the nearest solid surface.
- Patrol bounds should sit on or just above the ground/ledge so movement stays on solid terrain.

## How Enemies Integrate at Runtime
- `WorldBuilder` or `RoomWorldBuilder` calls `entityFactory.create(def)` for each enemy definition.
- The created enemy is added to `game.enemies`.
- `CollisionSystem`:
  - Resolves collisions with platforms/ground.
  - Handles projectile hits; reduces `health`, calls death/cleanup when health <= 0.
  - Handles player contact: applies damage/knockback via Enemy base hooks or enemy-specific logic.
- `Renderer` (via `SceneRenderer`):
  - Draws the sprite frame determined by your enemy’s animation.
  - Position is transformed by camera (so just set world-space x,y on the enemy).

## Adding Attacks or Special Behavior
- Override/extend `update` to add attack triggers (e.g., shoot when player within range).
- Add projectile spawning via `game.entityFactory.create({ type: 'projectile', ... })` or enemy-specific factory methods.
- Use timers/state flags on the enemy instance to control cooldowns.

## Damage & Health
- Ensure `this.health` exists. On projectile hit, `CollisionSystem` will decrement health and remove/destroy the enemy when <= 0.
- Implement a `destroy` or `onDeath` method if you need drops/FX. Call `this.game?.handleEnemyRemoved?.(this)` to integrate with stats.

## Animation Tips
- Keep `frameWidth`/`frameHeight` matching your spritesheet slices.
- `frameDirection`: `'horizontal'` if frames are laid side-by-side; `'vertical'` if stacked top-to-bottom.
- `frameTimeMs`: Larger = slower animation. Typical: 100–160ms.

## Balancing and Placement Tips
- Start with low `speed` (50–80 px/sec) and moderate `health` (20–50) to keep difficulty fair.
- Avoid placing enemies right on spawn; give the player breathing room.
- On platforms: leave horizontal space so patrol doesn’t immediately flip or fall.
- In rooms: ensure `autoFloor/autoWalls` or custom platforms keep enemies inside bounds.

## Checklist
1) Create enemy file under `game/scripts/enemies/YourEnemy.js`, extending `Enemy`.
2) Add a creation branch to `EntityFactory.create`.
3) Load the enemy script in `index.html` or your bundle before `EntityFactory` runs.
4) Place enemies in levels/rooms via `{ type: 'YourEnemy', x, y, ... }`.
5) Test collisions, damage, patrols, and animations with `debug` overlay if needed.

## Troubleshooting
- **Enemy not spawning**: Check `type` string matches the `EntityFactory` case; ensure script is loaded.
- **Falls forever**: Place on/above a platform; confirm ground exists under `x`/`y`.
- **No animation**: Verify sprite path, `frames`, `frameWidth/height`, and frame timing. Ensure image loads (DevTools Network).
- **No damage to player**: Confirm `damage` is set and CollisionSystem is running; ensure enemy collisions aren’t disabled.
- **Health never drops**: Ensure projectiles are hitting (check collision boxes), and `health` is initialized > 0 with removal on `<= 0`.

## Deep Dive: Creating a Brand-New Enemy Type
Use this checklist to build a fully custom enemy with unique AI, attacks, and art.

1) **Author the class**  
   - Extend `Enemy` (or `TownPatrolNPC` if it is town-flavored).  
   - Set core fields: `type`, `width/height`, `speed`, `health`, `damage`, `gravity`, `friction`, `knockback` rules.  
   - Implement `update(deltaTime)` to drive AI (patrol, chase, shoot).  
   - Implement `takeDamage(dmg, source)` if you need custom reactions (stagger, phases).  
   - Load sprites: call `loadSprite(path, { frameWidth, frameHeight, frames, frameTimeMs, frameDirection })`.  
   - Optional: add state flags (`isAggro`, `cooldownMs`, `attackRange`, `aggroRange`).

   ```js
   // game/scripts/enemies/Wasp.js
   class Wasp extends Enemy {
     constructor(x, y, config = {}) {
       super(x, y, config.width ?? 40, config.height ?? 32);
       this.type = 'Wasp';
       this.health = config.health ?? 20;
       this.damage = config.damage ?? 8;
       this.speed = config.speed ?? 140;
       this.gravity = config.gravity ?? 0;     // flying: no gravity
       this.aggroRange = config.aggroRange ?? 320;
       this.attackRange = config.attackRange ?? 220;
       this.cooldown = 0;
       this.loadSprite(config.sprite || 'art/sprites/wasp.png', {
         frameWidth: 40, frameHeight: 32, frames: 4, frameTimeMs: 90, frameDirection: 'horizontal'
       });
     }

     update(deltaTime) {
       super.update(deltaTime);
       const dt = deltaTime / 1000;
       const player = this.game?.player;
       if (!player) return;
       const dx = player.x - this.x;
       const dy = player.y - this.y;
       const dist = Math.hypot(dx, dy);

       if (dist < this.aggroRange) {
         // chase
         const dirX = dx / (dist || 1);
         const dirY = dy / (dist || 1);
         this.x += dirX * this.speed * dt;
         this.y += dirY * (this.speed * 0.5) * dt;
       }

       this.cooldown = Math.max(0, this.cooldown - deltaTime);
       if (dist < this.attackRange && this.cooldown <= 0) {
         this.shootSting(player);
         this.cooldown = 1500; // ms
       }
     }

     shootSting(target) {
       const speed = 380;
       const dx = target.x - this.x;
       const dy = target.y - this.y;
       const dist = Math.hypot(dx, dy) || 1;
       const velocity = { x: (dx / dist) * speed, y: (dy / dist) * speed };
       const proj = this.game?.entityFactory?.create({
         type: 'fireball', // reuse or register a 'sting' projectile
         x: this.x + this.width / 2,
         y: this.y + this.height / 2,
         velocity,
         owner: this,
         ownerType: 'enemy',
         damage: 6,
         sprite: 'art/sprites/sting.png',
         width: 10,
         height: 10,
         gravity: 0
       });
       if (proj) {
         proj.game = this.game;
         this.game.projectiles.push(proj);
       }
     }
   }

   if (typeof window !== 'undefined') window.Wasp = Wasp;
   if (typeof module !== 'undefined' && module.exports) module.exports = Wasp;
   ```

2) **Register the type** in `EntityFactory` (e.g., in `bootstrapDefaults` or a custom config):
   ```js
   this.registerType('Wasp', (def) => {
     const e = new Wasp(def.x ?? 0, def.y ?? 0, def);
     e.game = this.game;
     return e;
   });
   ```
   Ensure the Wasp script is loaded before factory registration.

3) **Place the enemy** in levels/rooms:
   ```js
   enemies: [
     { type: 'Wasp', x: 1600, y: 400, aggroRange: 280, attackRange: 200 }
   ]
   ```
   Remember: `x`, `y` are top-left; if flying, gravity 0 means it stays at `y` unless you move it.

4) **Optional: Custom hit reactions**  
   Override `takeDamage` to add stagger or phase changes:
   ```js
   takeDamage(amount, source) {
     super.takeDamage(amount, source);
     this.speed += 10; // enrage on hit
   }
   ```

5) **Optional: Death/loot**  
   Add `onDeath` to drop items:
   ```js
   onDeath() {
     const drop = this.game?.entityFactory?.create({ type: 'coin', x: this.x, y: this.y });
     if (drop) {
       drop.game = this.game;
       this.game.items.push(drop);
     }
   }
   ```

6) **Testing checklist**
   - Confirm script loaded (no console errors).
   - Ensure EntityFactory registration and `type` strings match.
   - Verify collisions: enemy vs. player/projectiles (damage numbers correct).
   - Validate AI ranges (aggro/attack) and speeds for fairness.
   - Check sprite alignment/frames and that images load.

7) **Performance tips**
   - Keep per-frame math minimal; cache target references where possible.
   - Avoid spawning many projectiles every frame; gate with cooldowns.
   - Use reasonable sprite sizes to avoid large draw calls.
