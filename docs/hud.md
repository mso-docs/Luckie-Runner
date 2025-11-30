# HUD (Heads-Up Display) Guide

This document explains how the in-game HUD is structured, how values are updated, and how to extend or change HUD elements. Use it to understand what controls what, and where to make changes.

## What Lives in the HUD
Defined in `game/index.html` inside `#gameUI`:
- **Health:** `#healthWrapper` contains `#playerHealthIcon`, `#healthBar` with `#healthFill`, and `#hudHPFraction`.
- **Inventory counts:** `#inventoryPanel` shows coins and rocks: `#hudCoins` and `#hudRocks`.
- **Buff panel:** `#buffPanel` holds buff rows (`#coffeeBuffRow`, `#climbBuffRow`) and timers (`#coffeeTimer`, `#climbTimer`).
- **Town banner hook:** `#townBanner` is separate but overlays near HUD.
- **Debug toggle:** `#debugToggleButton` sits on HUD overlay.
- **Hint bubbles:** e.g., `#shopGhostBubble` floats near HUD space.

## Styling
- Primary styles in `game/styles/main.css` (look for `#healthWrapper`, `.hud-entry`, `.buff-panel`, etc.).
- Visibility controlled by adding/removing the `hidden` class (e.g., buff rows, banner, debug panel).

## Update Flow (Who Changes What)
- **UIManager** (`game/scripts/ui/UIManager.js`) is the central place that updates HUD values:
  - `updateHealthUI()` / player hooks adjust `#healthFill` width and `#hudHPFraction`.
  - `updateInventoryOverlay()` and specific HUD setters update `#hudCoins`, `#hudRocks`.
  - Buff helpers toggle `#buffPanel` and buff rows, and update timers.
- **Player** (`game/scripts/player/Player.js`) calls `updateHealthUI` after damage/heal and when resetting state.
- **AudioController** and other systems don’t change HUD directly, but their menus sit alongside HUD elements.

## Health Bar Behavior
- `#healthFill` width is set as a percentage of current HP / max HP.
- `#hudHPFraction` text shows `current/max` (e.g., `34/35`).
- Common update pattern (already handled by Player/UIManager):
  ```js
  const hp = player.health;
  const max = player.maxHealth;
  const percent = Math.max(0, Math.min(1, hp / max));
  healthFill.style.width = `${percent * 100}%`;
  hudHPFraction.textContent = `${Math.round(hp)}/${Math.round(max)}`;
  ```
- To change health display, edit the logic in `UIManager.updateHealthUI` (or the player’s call sites) and adjust CSS for visual changes.

## Coins and Rocks
- `#hudCoins` and `#hudRocks` display counts.
- UIManager updates these when inventory changes. Player inventory mutations should call the relevant UI update:
  ```js
  uiManager?.updateInventoryOverlay(); // refreshes HUD counts as part of overlay sync
  // or direct HUD update if you add a helper, e.g., uiManager.updateHudCounts(coins, rocks);
  ```
- If you add new currencies, mirror this pattern: add HUD elements in HTML/CSS, cache them in UIManager, and add an update method.

## Buff Panel
- Container: `#buffPanel`. Buff rows: `#coffeeBuffRow`, `#climbBuffRow`, each has a timer label.
- Show/hide by toggling `hidden` on rows or the whole panel. Update timers by setting `textContent` (e.g., `coffeeTimer.textContent = '01:12'`).
- Implement or extend buff UI helpers in UIManager to set visibility based on active buffs.

## Town Banner (FYI)
- Not strictly HUD but shares overlay space. Controlled by `TownManager` calling `uiManager.showTownBanner(town)`, which toggles `#townBanner` and sets `#townBannerText`.

## How to Change HUD Values (Examples)
1) **Update health after taking damage:**
   - Ensure your damage routine calls `player.updateHealthUI()` (or `uiManager.updateHealthUI()`).
   - This will adjust `#healthFill` and `#hudHPFraction`.
2) **Update coins after collecting:**
   - Increment player coin count.
   - Call `uiManager.updateInventoryOverlay()` (or a direct HUD helper you add) to refresh `#hudCoins`.
3) **Show a buff timer:**
   - Remove `hidden` from `#buffPanel` and the specific row.
   - Set the timer text: `document.getElementById('coffeeTimer').textContent = '00:45';`.
4) **Hide a buff when it expires:**
   - Add `hidden` back to the row, and if no buffs remain, hide `#buffPanel`.

## Extending the HUD
- **Add a new stat (e.g., Keys):**
  1) Add HTML inside `#inventoryPanel`:
     ```html
     <div class="hud-entry key">
       <span class="hud-icon key-icon" aria-hidden="true"></span>
       <span class="hud-label">x</span>
       <span class="hud-value" id="hudKeys">0</span>
     </div>
     ```
  2) Style `.key-icon` and `.hud-entry.key` in CSS.
  3) Cache `#hudKeys` in UIManager and add an update method (`updateHudKeys(count)`).
  4) Call that method whenever the key count changes.
- **Change health visuals:** Update CSS for `#healthFill`, swap icons, or adjust fill behavior in UIManager’s health update logic.

## Visibility and State Management
- Toggle `hidden` to show/hide HUD subsections. The main HUD (`#gameUI`) stays visible during play; overlays (inventory, chest, shop) are separate and can coexist.
- Pause menus overlay the HUD but do not remove it; game state (paused/running) is handled by GameStateManager/SceneManager.

## File Pointers
- Markup: `game/index.html` (search for `healthWrapper`, `inventoryPanel`, `buffPanel`).
- Styles: `game/styles/main.css` (HUD sections).
- Logic: `game/scripts/ui/UIManager.js` (HUD updates), `game/scripts/player/Player.js` (health update calls).
- Buff logic: UIManager plus any buff systems that toggle the buff panel/timers.

## Troubleshooting
- **HUD not updating:** Verify your game logic calls the UIManager/Player update methods; check for missing DOM refs if you added new elements.
- **Values show NaN or wrong:** Ensure you pass numbers and clamp percentages when computing bar widths.
- **Buff panel always hidden:** Remove `hidden` on `#buffPanel`/rows when activating buffs; confirm element ids match your code.
- **Layout broken:** Inspect CSS selectors; ensure new elements match existing class patterns (`hud-entry`, `hud-icon`, etc.).
