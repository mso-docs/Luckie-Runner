# TownManager Guide (Towns, Doors, Interiors)

This guide explains how towns are defined and how TownManager handles regions, decor, and building doors. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/town/TownManager.js`
- Class: `TownManager`

---
## Responsibilities
- Track which town region the player is in based on X position.
- Spawn/remove town decor, buildings, and town NPCs when entering/exiting town regions.
- Handle door interactions to enter building interiors (rooms) via RoomManager.
- Manage town music transitions (fade/duck vs base level music).

---
## Data Source (TownsConfig)
- Path: `game/scripts/core/config/TownsConfig.js`
- Each town entry: `{ id, levelId, region: { startX, endX }, music, buildings, setpieces, npcs, interiors }`.
- Buildings include door offsets/radii and interior ids.

---
## Runtime Flow
1) `TownManager.update` (called in GameSystems) checks player.x against town regions.
2) On enter: spawns decor/buildings/NPCs, starts town music (if defined), marks active town.
3) On exit: removes town entities, restores base level music.
4) Door interaction: `handleDoorInteract()` called from UIManager when pressing interact near a door; if an interior is defined, calls `RoomManager.enterRoom` with the matching room descriptor.

---
## Door Interaction Snippet
```js
if (this.game.townManager?.handleDoorInteract?.()) {
  return; // door handled, do not open chests/signs
}
```

---
## Adding a Town/Building
1) Add to `TownsConfig.towns` with `region` and `music`.
2) Add buildings with `door` (offset, interact radius) and `interior.id` matching a Room descriptor.
3) Ensure the room is registered in `RoomDescriptors`/RoomRegistry.

---
## Troubleshooting
- Door does nothing: check `handleDoorInteract` is called before other interactables; verify door radius and player position.
- Town not loading: confirm player.x enters `region.startX..endX`; ensure level id matches current level.
- Music mismatch: verify `town.music.id/src/volume`; ensure AudioManager has the track.
