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
## Town Colliders (Invisible Platforms)

Town items (buildings, setpieces, etc.) can have invisible collision platforms that the player can stand on.

### Defining Colliders
Add a `collider` object to any building or setpiece in TownsConfig:
```js
{
  id: 'beach_house_1',
  sprite: 'art/bg/buildings/beach-house.png',
  exterior: { x: 1200, y: 500, width: 200, height: 180 },
  collider: {
    width: 200,
    height: 16,
    offsetX: 0,
    offsetY: 164  // Top of the building for standing
  }
}
```

### One-Way Collision Behavior
All town colliders are **automatically one-way platforms**:
- ✅ **Land from above**: Player can land on top when falling down
- ✅ **Jump through from below**: Player passes through when jumping upward
- ✅ **Walk through sides**: Player can walk through from left/right
- ❌ **Enemies ignore**: Enemies do not collide with one-way platforms

**Implementation Details:**
- Colliders are created as `DecorPlatform` entities with `invisible: true` and `oneWay: true`
- Uses `topOnlyLanding()` logic requiring: descending velocity (`> 0`), player coming from above, within 20px tolerance
- Collision check skipped entirely unless conditions are met (no blocking from sides/below)

### Collider Configuration Options
- `width`: Collision box width (defaults to item's displayWidth)
- `height`: Collision box height (defaults to 16px)
- `offsetX`: Horizontal offset from item's x position (default 0)
- `offsetY`: Vertical offset from item's y position (default 0)
- `hitboxWidth/hitboxHeight`: Fine-tune collision size (optional)
- `hitboxOffsetX/hitboxOffsetY`: Fine-tune collision offset (optional)

---
## Adding a Town/Building
1) Add to `TownsConfig.towns` with `region` and `music`.
2) Add buildings with `door` (offset, interact radius) and `interior.id` matching a Room descriptor.
3) (Optional) Add `collider` to buildings/setpieces for invisible platforms the player can stand on.
4) Ensure the room is registered in `RoomDescriptors`/RoomRegistry.

---
## Town Preloading & Viewport Culling

### Preventing Pop-in
To avoid town elements popping in suddenly when they enter the viewport:

**1. Preload Distance** (`TownsConfig.js`):
```js
preloadDistance: 7000, // px ahead of camera to start loading town assets
```

**2. Lookahead Calculation** (`TownManager.getTownPreloadDistance`):
```js
getTownPreloadDistance(viewportWidth = 0) {
    const base = viewportWidth ? viewportWidth * 2.5 : 2400;
    const minimum = 3000;
    return Math.max(minimum, this.preloadDistance || base);
}
```
- `2.5` = viewport width multiplier (2.5x viewport width ahead)
- `2400` = fallback when viewport width unknown
- `3000` = minimum lookahead distance in pixels

**3. Render Buffer** (`TownManager.buildDecorRenderable`):
```js
const renderBuffer = 2000; // Render 2000px beyond viewport edges
```
This controls how far beyond the visible viewport town elements start rendering.

**Best Practices:**
- Set `preloadDistance` to at least 5000-7000px for smooth loading
- Use 2.5-3x viewport width multiplier for the base calculation
- Keep render buffer at 1500-2000px to render ahead of player
- Test at different scroll speeds to ensure no pop-in

---
## Troubleshooting
- Door does nothing: check `handleDoorInteract` is called before other interactables; verify door radius and player position.
- Town not loading: confirm player.x enters `region.startX..endX`; ensure level id matches current level.
- **Town popping in late**: Increase `preloadDistance` in TownsConfig or the multiplier/minimum in `getTownPreloadDistance`. Verify `ensureUpcomingTownPrepared` is being called every frame.
- Music mismatch: verify `town.music.id/src/volume`; ensure AudioManager has the track.
