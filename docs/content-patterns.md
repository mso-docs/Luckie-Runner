# Items, Projectiles, Enemies: How to Add New Ones

This guide covers the pattern for adding new items, projectiles, and enemies, and wiring them to the factory. It assumes no prior knowledge.

---
## Items
- Base class: typically extend `Item` or `Entity` (see `game/scripts/items/*.js`).
- Required shape:
  - Constructor sets position/size and sprite.
  - Implement `collect(player)` to grant effects and mark removal.
- Register in `EntityFactory`:
  ```js
  this.registerType('myItem', (def) => new MyItem(def.x, def.y));
  ```
- Use in data:
  ```js
  { type: 'myItem', x: 1200, y: 760 }
  ```

Example collect:
```js
collect(player) {
  player.addRocks?.(5);
  this.collected = true;
}
```

---
## Projectiles
- Base class: `game/scripts/core/Projectile.js` (provides velocity, lifetime, render hooks).
- Create a subclass with custom speed/damage/sprite.
- Update velocity in `onUpdate` or set initial `velocity` when spawned.
- Register in `EntityFactory` if spawning from data, or spawn directly in code.

Spawn example from player:
```js
const proj = game.entityFactory.create({
  type: 'rock',
  x: player.x + player.width/2,
  y: player.y + player.height/2,
  velocity: { x: 600 * player.facing, y: -120 },
  owner: player,
  ownerType: 'player'
});
game.projectiles.push(proj);
```

---
## Enemies
- Base class: usually `Enemy` or `Entity` (see `game/scripts/enemies/*.js`).
- Implement movement/AI in `update`, damage handling, and rendering.
- Register in `EntityFactory` so level/room data can spawn it.
  ```js
  entityFactory.registerType('MyEnemy', def => new MyEnemy(def.x, def.y));
  ```
- Use in LevelDefinitions/room data with `{ type: 'MyEnemy', x, y }`.

---
## Registration Checklist
1) Create the class file under `game/scripts/items/`, `game/scripts/core/` (for projectiles), or `game/scripts/enemies/`.
2) Ensure the script is loaded before EntityFactory registers the type (script order or imports).
3) Call `entityFactory.registerType('typeName', builder)`.
4) Use the `type` string in your data or spawn code.

---
## Collision/Interaction Hooks
- Items: implement `collect(player)` (CollisionSystem calls this).
- Projectiles: ensure `width/height` are set; CollisionSystem handles hits vs enemies/NPCs.
- Enemies: implement `onPlayerCollide(player)` if you want custom reactions; otherwise handle damage in your update/logic.

---
## Troubleshooting
- “Unknown type”: register before spawning; check spelling.
- Not colliding: verify `width/height` and hitbox overrides; ensure the entity is added to the correct array (`game.items`, `game.projectiles`, `game.enemies`).
- Not rendering: confirm `render(ctx, camera)` is implemented and that SceneRenderer draws your category (extend SceneRenderer if needed).
