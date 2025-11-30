# Save and Reset Guide (SaveService, ResetService, ProgressManager)

This guide explains how saving/loading and resets work together. It assumes no prior knowledge.

---
## Files and Classes
- `game/scripts/core/services/SaveService.js` — slot save/load using PersistenceService.
- `game/scripts/core/services/ResetService.js` — wipes and rebuilds game state.
- `game/scripts/core/ProgressManager.js` — builds/applies snapshots and coordinates saves.
- `game/scripts/core/services/PersistenceService.js` — storage backend.

---
## Save Flow
1) `ProgressManager.buildSnapshot(name)` captures player stats, level id, inventory, etc.
2) `SaveService.save(slotId, snapshot)` writes to storage via PersistenceService.
3) `ProgressManager.save(slotId, name)` wraps 1+2 for convenience.

Load:
```js
game.progress.load('slot1'); // reads slot, applies snapshot (after world/player exist)
```

---
## Reset Flow (ResetService)
- `resetAll({ resetAudio, resetUI, resetWorld })` rebuilds the game to a clean state.
- Clears entities/arrays, hides overlays, resets camera/dialogue, rebuilds level via WorldBuilder.
- Called from Game/GameStateManager when restarting or returning to menu.

---
## ProgressManager Integration
- Holds pending level id and pending snapshot; applies after player/world are created (`initializeGameSystems`).
- On game init/reset: uses `consumePendingLevelId(fallback)` to choose level to build.
- After building player/world: `applyPendingSnapshot()` restores stats/inventory.

---
## When to Call
- Save on pause/menu or after key events:
  ```js
  game.progress.save('slot1', 'Checkpoint');
  ```
- Reset when restarting or returning to menu:
  ```js
  game.services.reset.resetAll({ resetWorld: true, resetUI: true, resetAudio: true });
  ```

---
## Troubleshooting
- Load doesn’t apply inventory: ensure `applyPendingSnapshot()` runs after player creation.
- Level mismatch on load: check the level id in the snapshot and that it exists in `LevelDefinitions`.
- Reset leaves stale UI: confirm `ResetService` hides overlays (`inventory`, `chest`, `shop`) and clears DOM artifacts (signs/callouts).
