# Player Character Guide

This guide explains how the player character is built, which classes and variables are used, and how to change things like the sprite or movement. It assumes no prior knowledge of the game.

## Where the Player Lives
- **Player class:** `game/scripts/player/Player.js`
- **Animations:** `game/scripts/player/PlayerAnimations.js`
- **Creation:** In `Game.initializeGameSystems()` (inside `game/scripts/Game.js`)
- **Systems that use the player:** `CollisionSystem`, `GameSystems`, `Renderer/SceneRenderer`, `UIManager`, `DialogueManager`, `InputManager`

## How the Player Is Created (Game.initializeGameSystems)
```js
initializeGameSystems() {
  // ...other setup...
  this.player = new Player(this.level.spawnX, this.level.spawnY);
  this.player.game = this;         // wire game reference
  if (typeof this.player.reset === 'function') this.player.reset();
  if (typeof this.player.updateHealthUI === 'function') this.player.updateHealthUI();
  // ...apply badges, pending saves, etc...
}
```
- Spawn position comes from the current level (`level.spawnX`, `level.spawnY`).
- `player.game` is set so the player can access services (audio, UI, etc.).
- `reset()` and `updateHealthUI()` prep stats and HUD.

## Player Class: Key Fields and What They Do
Common fields (check `Player.js` for exact defaults):
- **Position/size:** `x`, `y`, `width`, `height` — top-left position and collision box.
- **Velocity:** `velocity.x`, `velocity.y` — movement per second on X/Y.
- **Physics:**
  - `gravity`: Downward acceleration.
  - `friction`: How quickly horizontal speed decays.
  - `maxSpeed`: Limits for velocity (e.g., `{ x: maxRunSpeed, y: maxFallSpeed }`).
  - `jumpStrength`: Upward impulse for jumps.
  - `dashSpeed`: Speed boost when dashing (if implemented).
  - `onGround`: True when standing on a solid surface.
- **Input state:** Flags for movement/jump/dash/attack (set by `InputManager`).
- **Health:** `health`, `maxHealth` — current and maximum HP.
- **Inventory:** `coins`, `rocks`, other items; methods to add/remove (e.g., `addRocks`, `addCoins`).
- **Status/Buffs:** Flags or timers for temporary effects (e.g., coffee buff).
- **Animation:** `frameIndex`, `currentAnim`, sprite references (from `PlayerAnimations.js`).
- **Rendering helpers:** `loadSprite(path, opts)`, `facing` (left/right), `alpha`, `scale`.
- **Combat:** Damage value for thrown projectiles (rocks), knockback rules, invulnerability frames after hit (if defined).

## Movement & Physics (Typical Flow)
In `Player.update(deltaTime)` (simplified):
1) **Read input:** Move left/right, start jump/dash/attack based on input flags.
2) **Apply forces:**
   - Horizontal acceleration toward input direction; apply `friction` when no input.
   - Vertical acceleration from `gravity` unless on a ladder/slide (if implemented).
3) **Clamp speeds:** Limit `velocity` by `maxSpeed`.
4) **Integrate position:** `x += velocity.x * dt; y += velocity.y * dt;`
5) **Collisions:** `CollisionSystem` resolves overlaps; sets `onGround`, adjusts `velocity`.
6) **Animate:** Choose animation (idle/run/jump/fall/attack), set `frameIndex`.
7) **Update HUD:** Health changes call `updateHealthUI`.

To change momentum:
- Increase `gravity` for faster fall; decrease for floatier jump.
- Adjust `jumpStrength` for jump height.
- Adjust `maxSpeed.x` and horizontal acceleration for run speed/handling.
- Tweak `friction` for how quickly the player stops when no input is held.

## Animation (PlayerAnimations.js)
- Holds sprite sequences for idle, run, jump, fall, attack, etc.
- Typically sets up frame lists and timings:
  ```js
  this.animations = {
    idle: { frames: [0,1], frameTimeMs: 200 },
    run:  { frames: [2,3,4,5], frameTimeMs: 90 },
    jump: { frames: [6], frameTimeMs: 100 }
  };
  ```
- `Player.update` picks an animation based on movement state (`onGround`, `velocity.y`, input).
- To swap sprites: change the `loadSprite` path in `Player` or adjust frames in `PlayerAnimations.js`.

## Sprites
- Player spritesheet is loaded via `loadSprite('art/...')` in `Player.js` or `PlayerAnimations.js`.
- Frame slicing: set `frameWidth`, `frameHeight`, `frames`, `frameDirection` (`horizontal` or `vertical`).
- Flip: set `facing = -1` (left) or `1` (right) to mirror draw direction.

## Health and UI
- `health`, `maxHealth` track HP.
- `takeDamage(amount, source)` reduces `health`, triggers hit reactions, and updates HUD via `updateHealthUI`.
- `heal(amount)` increases `health` up to `maxHealth`.
- HUD elements (`#healthFill`, `#hudHPFraction`) are updated in UIManager when the player calls `updateHealthUI`.

## Inventory and Projectiles
- **Rocks (throwables):** Stored in `rocks`; `throwRock()` spawns a `Rock` projectile via `EntityFactory`.
  ```js
  const proj = game.entityFactory.create({
    type: 'rock',
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    velocity: { x: speed * dir, y: arc },
    owner: player,
    ownerType: 'player'
  });
  ```
- **Coins:** Collected via items; `addCoins(n)` increments and updates HUD.
- **Other items:** Implement `addX` methods on Player or a dedicated inventory class, then call UI updates.

## Collision & Damage
- `CollisionSystem` checks player vs. platforms/hazards/enemies/items.
- On enemy or hazard collision, `takeDamage` is invoked (unless invulnerable).
- On item collision, `item.collect(player)` is called.
- On platform collision, `onGround` is set and vertical velocity is corrected.

## Changing the Character Sprite
1) Replace the sprite file (e.g., `art/sprites/player.png`) or point to a new path in `Player`/`PlayerAnimations`.
2) Update `frameWidth`, `frameHeight`, `frames`, `frameDirection` to match your new sheet.
3) Adjust animation frame indices for idle/run/jump/etc. in `PlayerAnimations.js`.

## Changing Movement Feel
- **Run speed:** Increase `maxSpeed.x` and/or horizontal acceleration.
- **Air control:** Reduce friction while in air or adjust acceleration when `!onGround`.
- **Jump height:** Increase `jumpStrength` (more upward velocity).
- **Fall speed:** Increase `gravity` or clamp `maxSpeed.y`.
- **Dash:** Adjust `dashSpeed` and dash duration (if dash is implemented in your Player).

## Key Methods to Know (Typical)
- `update(deltaTime)`: Main per-frame logic (input → physics → animation).
- `reset()`: Clears/transitions to default stats/state (called on creation).
- `takeDamage(amount, source)`: Applies damage, may trigger invulnerability/stagger.
- `heal(amount)`: Restores health up to `maxHealth`.
- `addCoins(n)`, `addRocks(n)`: Inventory helpers.
- `throwRock()`: Spawns a rock projectile (if rocks > 0).
- `updateHealthUI()`: Refreshes HUD health display.

## File Pointers
- Player logic: `game/scripts/player/Player.js`
- Animations: `game/scripts/player/PlayerAnimations.js`
- Creation: `Game.initializeGameSystems()` in `game/scripts/Game.js`
- Collisions: `game/scripts/core/CollisionSystem.js`
- Rendering: `game/scripts/core/SceneRenderer.js`
- Input: `game/scripts/utils/InputManager.js` (mapped through UI input/controller logic)

## Quick Checklist to Customize the Player
1) Swap sprite: change `loadSprite` path and frame sizes/direction; update animation frame lists.
2) Adjust movement: tweak `gravity`, `jumpStrength`, `maxSpeed`, `friction`, `dashSpeed` (if present).
3) Adjust health: set `health`, `maxHealth`; update damage/heal values as needed.
4) Adjust projectiles: change rock speed/arc in `throwRock`, or replace with a new projectile type via `EntityFactory`.
5) Test: run the game, verify movement feel, animations, collisions, and HUD updates.***
