# Save, Load, and Reset: How Game State Is Stored and Restored

This guide explains, in plain language, how saving, loading, and resetting work in the game. It assumes no prior knowledge of the game loop or codebase.

## High-Level Pieces
- **ProgressManager** (`game/scripts/core/ProgressManager.js`): Builds save snapshots, loads them, and applies them to the game.
- **SaveService** (`game/scripts/core/services/SaveService.js`): Low-level storage helper (browser storage).
- **ResetService** (`game/scripts/core/services/ResetService.js`): Clears state and rebuilds a clean game session.
- **GameStateManager** (`game/scripts/core/GameStateManager.js`): Controls game states (menu/playing/paused/game over) and calls save/load/reset helpers as needed.
- **Game** (`game/scripts/Game.js`): Owns the live state (player, level, items, enemies, HUD, etc.) and exposes reset/save hooks.

## What Gets Saved (Snapshot Contents)
A save snapshot is a plain data object. Typical contents include:
- **Player state:** Position, health, inventory (coins, rocks, items, buffs), equipped items.
- **Level info:** Current level id, player spawn or position, completed/visited flags.
- **Progress flags:** Quest or dialogue progress, collected items, defeated enemies (if tracked).
- **Settings:** May include audio volumes or options (depending on implementation).

The exact fields are defined in `ProgressManager.buildSnapshot(name)`; it serializes what the game exposes as “current run” data.

## Where Saves Live
- Saves are stored client-side (e.g., browser local storage) via **SaveService**.
- Slot-based: You save into a slot id (e.g., `slot1`) with a name/label (e.g., “Auto Save”).
- The UI shows slots in the Load menu (see `#loadMenu` in `game/index.html`), populated by UIManager + ProgressManager.

## The Save Flow
1) **Trigger:** The player chooses “Save” (e.g., pause menu “Save Game”) or an auto-save occurs.
2) **Build snapshot:** `ProgressManager.buildSaveSnapshot(name)` collects the current game state.
3) **Store:** `ProgressManager.save(slotId, name)` passes the snapshot to `SaveService`, which writes it to storage.
4) **Confirm:** UI may show success or update the slot list.

## The Load Flow
1) **Trigger:** The player chooses a slot in the Load menu.
2) **Read:** `ProgressManager.load(slotId)` asks `SaveService` for stored data.
3) **Apply:** `ProgressManager.applySnapshot(snap)` restores player stats/inventory/progress into the live game. If needed, the game creates or switches to the saved level before applying position/state.
4) **Resume:** The game continues from the loaded state; HUD updates reflect loaded values.

## The Reset Flow (Fresh Session)
Reset returns the game to a clean starting state. It’s used when restarting or after a full reset command.

Main steps (see `Game.resetGame()` and `ResetService`):
1) **Restore defaults:** Time scale, test mode, level metadata, stats, camera, dialogue state, timers, etc.
2) **Clear entities:** Player, projectiles, enemies, items, platforms, hazards, town decor, palms, chests, flags, NPCs, and overlays are cleared or destroyed.
3) **Reset UI:** Hide speech bubbles, inventory, chest, shop; reset sign UI; reset buffs.
4) **Reset systems:** Badge UI, palm manager, test room markers, dialogue manager, and other transient systems.
5) **Rebuild level:** Calls `game.createLevel(targetLevel)` (usually the current level or a pending one); for the test room, it may restore a saved initial layout.
6) **Recreate player:** In `initializeGameSystems()`, a fresh player is spawned at the level spawn and UI is synced to their stats.
7) **Resume:** Game state is set to a clean playing state; timers/counters restart.

## Game Loop Context (Simplified)
- The game runs an update/render loop. Saves and loads are snapshots outside this loop.
- Reset stops using the current world state and rebuilds everything as if freshly started.

## Practical: How to Save/Load/Reset
- **Save:** Open pause menu → click “Save Game” (wired to `ProgressManager.save(slotId)`).
- **Load:** Open load menu → pick a slot → `ProgressManager.load(slotId)` → game switches to that state.
- **Reset:** Use the reset option (if exposed) or programmatically call `game.resetAll()`/`game.resetGame()`; this clears and rebuilds the session.

## What Is Not Automatically Saved
- Temporary visuals (particles, on-screen effects).
- Non-persistent debug state.
- Anything you don’t serialize in `ProgressManager.buildSnapshot`. If you add new progress fields (e.g., “keys collected”), update snapshot building and applying logic so they persist.

## Extending Saves
If you add new gameplay features (e.g., new currencies, quest flags, collectibles):
1) Add fields to the snapshot in `ProgressManager.buildSnapshot`.
2) Add restore logic in `ProgressManager.applySnapshot`.
3) Ensure UI updates after applying (e.g., HUD counts, inventory refresh).

## Failure Modes and Tips
- **Load into a missing level:** Ensure the level id saved exists; add a fallback level if not.
- **Half-applied state:** Apply snapshots only after world/player are built (ProgressManager already waits for that).
- **Corrupt slots:** Provide a way to delete/clear a slot if parsing fails.
- **UI mismatch after load:** Call HUD/inventory update functions after applying the snapshot.

## File Pointers
- `game/scripts/core/ProgressManager.js` — build/apply snapshots; save/load slots.
- `game/scripts/core/services/SaveService.js` — low-level storage.
- `game/scripts/core/services/ResetService.js` — clears and rebuilds state.
- `game/scripts/Game.js` — orchestrates reset flow (`resetGame`, `initializeGameSystems`), and owns live state.
- `game/scripts/core/GameStateManager.js` — menu/pause states and save/load triggers.
- `game/index.html` — Save/Load menu markup for slot selection.
