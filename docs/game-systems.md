# GameSystems Guide (Per-Frame Update Orchestration)

This guide describes what GameSystems updates each frame and in what order. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/core/GameSystems.js`
- Class: `GameSystems`

---
## Responsibilities
- Central per-frame update coordinator for the **play** state.
- Calls movement/AI, collisions, camera, UI updates, and game state checks in order.

---
## Typical Update Order (play state)
Called from `Game.update(deltaTime)`:
1) Player update (movement/physics/input inside Player).
2) Enemies/NPCs update (AI/movement per enemy/NPC class).
3) Projectiles update (movement, lifetime).
4) CollisionSystem checks (player vs platforms/enemies/items/hazards, projectiles vs targets).
5) TownManager update (region detection, doors, decor/NPC loading).
6) RoomManager checks for exit/room-specific behavior.
7) Items/hazards extra updates if any.
8) UI timers/overlays (via UIManager update hooks).
9) Camera follow (centers on player with look-ahead/lerp).
10) Stats/time accumulation.

Note: When state is `battle` or `cutscene`, the loop bypasses GameSystems and routes to BattleManager/CutscenePlayer instead.

---
## Construction
```js
this.systems = new GameSystems(this);
```
- Expects access to game collections (`player`, `platforms`, `enemies`, `items`, `projectiles`, `camera`, `collisionSystem`, managers).

---
## Extending GameSystems
- Add new subsystem calls (e.g., quests, buffs) in the update flow.
- Ensure ordering makes sense (e.g., apply buffs before physics; collisions after movement; camera after positions update).

---
## Troubleshooting
- Something not updating: verify `GameSystems.update` is being called (only during play state).
- Camera not following: confirm `updateCamera` is invoked after player movement.
- Collisions off: ensure entities are in the correct arrays (`game.platforms`, `game.enemies`, etc.).
