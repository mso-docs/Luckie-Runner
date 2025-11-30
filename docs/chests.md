# Chest System Guide (How to Build, Configure, and Use Chests)

This guide assumes zero prior knowledge. It explains every moving part of the chest system: data, entity, sprites, UI, input, and how loot is applied to the player. Follow the snippets to add new chests.

---
## Files and Classes
- Chest entity: game/scripts/items/Chest.js
- Factory hook: game/scripts/core/EntityFactory.js (actory.chest and 	ype: 'chest')
- UI + interactions: game/scripts/ui/UIManager.js (chest overlay, Take/Take All, input handling)
- Game wiring: game/scripts/Game.js (chestUI state, show/hide helpers, list of chests)
- Rendering: Chest.render and SceneRenderer loop (game/scripts/core/SceneRenderer.js)
- Sample art: rt/items/chest.png (3 frames: closed, open-with-loot, empty) and rt/items/chest-open.png (fallback empty frame)
- Audio: sfx/chest.mp3 (loaded by AudioManager)
- Markup: game/index.html (chest overlay DOM: #chestOverlay, .chest-items, Take/Take All buttons)
- Styling: game/styles/main.css (classes .chest-overlay, .chest-item, .chest-callout)

---
## What a Chest Is (Behavior Overview)
- An Entity with position/size (64x64) and a sprite sheet for closed/open/empty frames.
- Tracks loot in contents (array of objects with id, 
ame, description, 	ake(player) function, and 	aken flag).
- Shows an on-canvas render plus a DOM callout: “Press E to open me!” when the player is nearby and no overlay is open.
- Opens on interact (E/Enter), plays chest SFX, and shows the chest overlay listing loot.
- “Take” runs the item’s 	ake(player) and marks it 	aken.
- “Take all” runs all untaken items.
- Frame changes: closed (loot present), open (loot present), empty (no loot). Glow effect while open with loot.
- Integrates with player inventory by executing the 	ake callback to grant coins/rocks/HP/etc.

---
## Chest Data Shape (contents)
Each loot entry is a plain object:
`js
{
  id: 'coins',                 // unique per chest
  name: '25 Coins',            // shown in overlay
  description: 'Shiny pocket money for the cafe run.',
  take: (player) => player.collectCoin?.(25), // apply to player
  taken: false                 // runtime flag (auto-added when you take it)
}
`
- id: string key used by 	akeItem(id, player).
- 
ame/description: displayed in the chest overlay.
- 	ake(player): a function; do the grant here (coins, rocks, healing, items, etc.).
- 	aken: runtime flag; if omitted, it is added when you take an item.

---
## Chest Entity (Chest.js)
Key fields (constructor defaults):
- Size: width/height = 64
- Sprites: 	his.loadSprite('art/items/chest.png?v=2'); emptySprite fallback rt/items/chest-open.png?v=2
- Frames: rameWidth = 64, rameHeight = 64, 	otalFrames = 3 (closed, open-with-loot, empty)
- Interaction: interactRadius = 90, isOpen = false
- Glow: glowTime animates a gold glow when open with loot
- Default contents: coins, rocks, small potion (see file for exact take callbacks)

Key methods:
- isPlayerNearby(player): radius check for interaction/callout.
- open(): sets isOpen = true, plays chest SFX.
- getAvailableItems(): returns contents where !taken.
- 	akeItem(id, player): finds by id, runs 	ake, marks 	aken = true, updates frame.
- 	akeAll(player): runs 	akeItem for every untaken entry; returns true if anything taken.
- updateFrameFromContents(): sets currentFrame (0 closed, 1 open-with-loot, 2 empty).
- onUpdate(deltaTime): increments glow time, updates callout.
- ender(ctx, camera): draws chest with correct frame, shadow, and optional glow.
- ensureCallout()/updateCallout(): creates and positions the “Press E to open me!” DOM element relative to camera/canvas.
- destroy(): removes callout DOM when chest is removed/reset.

---
## Factory + Spawning
Path: game/scripts/core/EntityFactory.js
`js
chest(x, y, displayName = null, contents = null) {
  const chest = new Chest(x, y);
  chest.game = this.game;
  if (displayName) chest.displayName = displayName;
  if (contents) chest.contents = contents;
  return chest;
}
this.registerType('chest', (def) => this.chest(def.x, def.y, def.displayName, def.contents));
`
Ways to add a chest:
1) **Inline in level/room data** (data-first):
`js
{ type: 'chest', x: 1800, y: 760, displayName: 'Beach Chest', contents: [
  { id: 'coins', name: '50 Coins', description: 'Shiny!', take: (player) => player.collectCoin?.(50) },
  { id: 'rocks', name: '5 Rocks', description: 'Throwables', take: (player) => player.addRocks?.(5) }
]}
`
Level/room builders call EntityFactory.create and will spawn the chest.

2) **Programmatically** (in code/console):
`js
const chest = game.entityFactory.chest(1200, 780, 'Debug Chest', [
  { id: 'coins', name: '25 Coins', description: 'Loot', take: p => p.collectCoin?.(25) },
  { id: 'heal', name: 'Heal 25', description: 'Top up', take: p => { p.health = Math.min(p.maxHealth, p.health + 25); p.updateHealthUI?.(); } }
]);
game.chests.push(chest);
`

3) **RoomManager helper**: room descriptors can include chests: [{ x, y, displayName, contents: [...] }]; RoomManager/WorldBuilder will rebuild them with 	aken: false on reset.

---
## UI Flow (Chest Overlay)
DOM (in game/index.html):
`html
<div id="chestOverlay" class="chest-overlay hidden" aria-hidden="true">
  <div class="chest-window" role="dialog" aria-labelledby="chestTitle">
    <div class="chest-header">
      <div class="chest-icon" aria-hidden="true"></div>
      <div class="chest-header__text">
        <div class="chest-title" id="chestTitle">Treasure Chest</div>
        <div class="chest-subtitle">Press E or Enter to close</div>
      </div>
      <button type="button" class="chest-close" data-action="close-chest">×</button>
    </div>
    <div class="chest-body">
      <div class="chest-items"></div>
      <div class="chest-empty hidden">This chest is empty.</div>
    </div>
    <div class="chest-footer">
      <button type="button" class="chest-take-all" data-action="take-all">Take all</button>
      <span class="chest-hint">E / Enter to exit</span>
    </div>
  </div>
</div>
`

UI wiring (path: game/scripts/ui/UIManager.js):
- setupChestUI(): caches DOM refs (overlay, list, 	itle, 	akeAllButton, emptyState), wires close and Take All buttons, hides overlay initially.
- showChestOverlay(chest): sets currentChest, marks isOpen = true, sets title, shows overlay, calls populateChestOverlay.
- hideChestOverlay(): hides overlay, clears currentChest, resets isOpen.
- populateChestOverlay(chest): builds rows for each available item with a Take button; toggles empty state visibility; disables Take All when empty.
- Input handling: handleChestInput() listens for interact key (E/Enter). If overlay open -> closes; else checks door -> NPC -> sign -> chest; when chest found it calls chest.open() then showChestOverlay(chest).

### Take / Take All Behavior
- Take button: calls chest.takeItem(item.id, player), repopulates overlay, plays menu sound on success.
- Take all: calls chest.takeAll(player), repopulates overlay, plays menu sound if anything was taken.
- Empty state: chest.getAvailableItems() drives whether the empty message shows and whether Take All is disabled.
- Closing: press E/Enter again or click close; overlay hides and control returns to gameplay.

---
## Animation, Frames, and Sprite Sheet
- Default sprite: rt/items/chest.png with 3 horizontal frames (64x64 each):
  - Frame 0: closed (loot inside)
  - Frame 1: open with loot visible
  - Frame 2: empty (or uses rt/items/chest-open.png if the sheet only has 2 frames)
- Frame selection: ender() sets currentFrame based on isOpen and hasLoot (available items). updateFrameFromContents() mirrors this after loot changes.
- Glow: when open with loot, a radial gold glow is drawn over the canvas.
- Shadow: enderShadow draws a simple drop shadow under the chest.

To change art:
`js
// In Chest constructor or factory after creation
chest.loadSprite('art/items/my-custom-chest.png');
chest.frameWidth = 64;
chest.frameHeight = 64;
chest.totalFrames = 3; // adjust to your sheet
`
If your sheet has only closed/open frames, keep emptySprite for the empty state or add a third frame.

---
## Interaction Logic and Input
- Nearby check: chest.isPlayerNearby(player) uses interactRadius = 90 and center-to-center distance.
- Callout: created lazily in ensureCallout(); positioned each frame in updateCallout() relative to camera and canvas.
- Input path: UIManager.handleChestInput() consumes interact (E/Enter). Priority: if chest overlay open -> close; else try door -> NPC -> sign -> chest.
- When a chest is found: chest.open() (sets isOpen, plays SFX) then showChestOverlay(chest).
- Overlay blocks chest callouts when open (!game.chestUI.isOpen).

---
## Inventory Integration (What Loot Does)
- Loot effects live in each entry's 	ake(player) function. Common patterns:
  `js
  // Coins
  { id: 'coins', name: 'Coins', take: p => p.collectCoin?.(25) }
  // Rocks/ammo
  { id: 'rocks', name: 'Rocks', take: p => p.addRocks?.(10) }
  // Healing
  { id: 'heal', name: 'Heal 25', take: p => { p.health = Math.min(p.maxHealth, p.health + 25); p.updateHealthUI?.(); } }
  // Custom item grant (requires your player/inventory API)
  { id: 'key', name: 'Silver Key', take: p => p.addKey?.('silver') }
  `
- After 	ake, the entry is marked 	aken. UI refresh hides it and updates frames; Take All will skip 	aken items.
- Because this is data-driven, you don't edit core code to add new loot; you just define contents with the desired 	ake behavior.

---
## Adding a New Chest (Step-by-Step)
1) **Define contents** (in level/room data or code):
   `js
   const contents = [
     { id: 'coins', name: '100 Coins', description: 'Jackpot', take: p => p.collectCoin?.(100) },
     { id: 'buff', name: 'Coffee Buff', description: '+Speed', take: p => p.addCoffee?.(1) }
   ];
   `
2) **Spawn the chest**:
   - In data: { type: 'chest', x: 2400, y: 760, displayName: 'Jackpot Chest', contents }
   - In code: game.chests.push(game.entityFactory.chest(2400, 760, 'Jackpot Chest', contents));
3) **Ensure scripts are loaded**: Chest.js, EntityFactory, and your level/room scripts are included in index.html (or bundler import order) before spawning.
4) **Place art**: add/replace sprite in rt/items/; adjust rameWidth/height/totalFrames if using a new sheet.
5) **Test**: run the game, walk near the chest, see the callout, press E/Enter, take items, verify inventory/HP/coins update.

---
## Reset and Persistence
- On reset, WorldBuilder copies chest blueprints and clears 	aken flags so chests refill when rebuilding the world/room.
- RoomManager snapshots chests when entering a room and restores them on exit so level chests reappear untouched.
- Chest destroy() removes the callout DOM when a chest is cleared/reset.

---
## Troubleshooting
- **Chest not showing:** Ensure 	ype: 'chest' is registered (EntityFactory) and the script order includes Chest.js before creating instances. Check sprite path.
- **Can’t interact:** Verify interact key (E/Enter) is bound; check interactRadius and that isPlayerNearby returns true (camera/position).
- **Overlay empty:** Confirm contents array objects have unique id and are not pre-marked 	aken.
- **No reward applied:** Ensure 	ake(player) calls the right player method (collectCoin, ddRocks, updateHealthUI, etc.).
- **Empty frame missing:** Use a 3-frame sprite or keep emptySprite (rt/items/chest-open.png) so empty chests render correctly.
- **Callout misplaced:** ensureCallout/updateCallout rely on #gameContainer and camera offsets; verify those DOM elements exist and the canvas size matches expectations.
