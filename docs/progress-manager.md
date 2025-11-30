# Progress Manager Guide (Save/Load/Snapshots)

This guide explains how ProgressManager handles saves, loads, and pending snapshots. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/core/ProgressManager.js`
- Class: `ProgressManager`

---
## Responsibilities
- Build save snapshots (player stats, level id, inventory, etc.).
- Apply snapshots to the current game session.
- Manage save slots via `SaveService`/`PersistenceService`.
- Hold pending snapshots and pending level ids to apply after world/player exist.

---
## Construction (Game.js)
```js
const persistence = new PersistenceService();
this.services.save = new SaveService(persistence);
this.progress = new ProgressManager(this, this.services.save);
```

---
## Key Methods
- `save(slotId = 'slot1', name = 'Auto Save')`: serialize current run to a slot.
- `load(slotId)`: load from a slot and apply.
- `buildSnapshot(name)`: returns a snapshot object describing the run.
- `applySnapshot(snapshot)`: mutates game/player/world based on snapshot.
- `applyPendingSnapshot()`: called after player/world exist to apply queued data.
- `consumePendingLevelId(fallbackId)`: returns a pending level id (used on init/reset) or fallback.

Typical use:
```js
game.progress.save('slot1', 'My Save');
game.progress.load('slot1'); // will rebuild world/player as needed
```

---
## Snapshot Shape (Typical Fields)
- Player stats: health, rocks/coins, buffs.
- Level id: current or pending.
- Inventory/badges if implemented.
- Time/score counters.

Exact fields depend on ProgressManager implementation; inspect `ProgressManager.buildSnapshot` for current structure.

---
## Flow in Game
- On start: `progress.consumePendingLevelId('testRoom')` decides which level to load.
- After player/world created: `progress.applyPendingSnapshot()` restores stats/inventory.
- On pause/menu: saves can be triggered via UI or directly with `progress.save`.

---
## Troubleshooting
- Save not applying: ensure `applyPendingSnapshot()` runs after player/world are created (`initializeGameSystems`).
- Wrong level on load: check `consumePendingLevelId` usage; ensure the level id exists in `LevelDefinitions`.
- Missing fields: extend `buildSnapshot/applySnapshot` to include new systems (e.g., badges, quest flags).
