# In-Game UI Overview and Integration Guide

This document explains how the in-game UI is structured, where markup/styles live, how logic is wired, and how to extend or reuse the existing systems. Use it as a reference when adding new UI elements or modifying existing ones.

## High-Level Architecture
- **Markup (HTML):** `game/index.html` contains all UI containers: HUD, inventory, speech bubble, shop, chest, debug panels, menus (start/pause/game over/load), town banner, and overlays.
- **Styles (CSS):** `game/styles/*.css` (e.g., `main.css`) control layout, colors, typography, visibility (`.hidden`), and interaction states.
- **UI Manager Classes:**
  - `UIManager` (`game/scripts/ui/UIManager.js`): Central orchestrator for HUD updates, inventory/chest/shop overlays, input wiring, tab switching, and talkable detection.
  - `UIRenderer` (`game/scripts/core/UIRenderer.js`): Rendering helper for UI elements; works with the main renderer.
  - `DialogueManager` (`game/scripts/ui/DialogueManager.js`): Manages dialogue state, formatting, and speech bubble content.
  - `SpeechBubble` (`game/scripts/dialogue/SpeechBubble.js`): Handles DOM for speech bubbles.
  - `SignUI` (`game/scripts/ui/SignUI.js`): Handles sign interactions and overlays.
  - `BadgeUI` (`game/scripts/ui/BadgeUI.js`): Manages badge display and modifiers.
  - `UIInputController` (`game/scripts/ui/UIInputController.js`): Keyboard/controller bindings for UI navigation.
- **State/Scene Coordination:**
  - `GameStateManager` (`game/scripts/core/GameStateManager.js`): Controls pause/play/menu states and shows/hides menu blocks by id.
  - `SceneManager` (`game/scripts/core/scene/*.js`): Higher-level scenes; delegates to GameStateManager and UIManager.
  - `AudioController` (`game/scripts/core/AudioController.js`): Syncs UI sliders/buttons with audio settings.

## Key UI Surfaces in index.html
- **HUD:** Health bar, coin/rock counts (`#healthWrapper`, `#inventoryPanel`).
- **Speech bubble:** `#speechBubble` (dialogue, NPC speech, sign text).
- **Town banner:** `#townBanner` (entry banner).
- **Debug panel:** `#debugPanel`, toggle button `#debugToggleButton`.
- **Inventory overlay:** `#inventoryOverlay` with tabs (`data-tab-target`) and panels (`data-tab-panel`).
- **Chest overlay:** `#chestOverlay` for loot collection.
- **Shop overlay:** `#shopOverlay` for shop items/currency.
- **Menus:** `#startMenu`, `#instructionsMenu`, `#gameOverMenu`, `#pauseMenu`, `#loadMenu` (and any custom menus you add).
- **Other widgets:** `#shopGhostBubble` (hint), sign UI, badge UI areas.

## Visibility Model
- UI elements are shown/hidden by toggling the `hidden` class.
- GameStateManager’s `showMenu(menuId)`/`hideMenu(menuId)` manage menu visibility.
- UIManager exposes helper methods to show/hide overlays (inventory/chest/shop) and updates content before showing.

## Input & Interaction Flow
- **UIInputController:** Binds keyboard/controller to UI actions (e.g., inventory tab navigation, confirm/cancel).
- **UIManager:** Sets up click handlers for menu buttons, overlay close buttons, and tab buttons (`data-tab-target`).
- **Dialogue/Speech:** `DialogueManager` + `SpeechBubble` handle advancing text; `UIManager.startNpcDialogue(npc)` triggers showing and advancing.
- **Signs:** `SignUI` detects nearby signs and opens sign dialogue via `uiManager.showSpeechBubble`/dialogue pipeline.
- **Talkable NPC detection:** `UIManager.getNearbyTalkableNpc()` is used by input handlers to trigger dialogue with the nearest NPC.

## HUD Updates
- **Health:** UIManager updates `#healthFill` width and `#hudHPFraction` text based on player health.
- **Coins/Rocks:** UIManager updates `#hudCoins` and `#hudRocks` when inventory changes.
- **Buffs:** Buff panel (`#buffPanel`) shows buff rows; UIManager toggles visibility and timers.

## Inventory Overlay
- **Structure:** Tabs (`.inventory-tab`) map to panels (`.inventory-panel` with `data-tab-panel`).
- **Data:** Populated by `UIManager.updateInventoryOverlay()` using player stats/items.
- **Navigation:** `UIManager.switchInventoryTab`, keyboard navigation via `UIInputController`.

## Chest Overlay
- **Open:** `UIManager.showChestOverlay(chest)`; populates items with `populateChestOverlay`.
- **Close:** `UIManager.hideChestOverlay`; keyboard shortcuts E/Enter also close.
- **Data:** Chest contents from `Chest` entities; `uiManager.populateChestOverlay(chest)` builds buttons/entries.

## Shop Overlay
- **Open:** `UIManager.showShopOverlay()`.
- **Data:** Populates currency and items via `UIManager.updateShopDisplay()`.
- **Close:** `UIManager.hideShopOverlay`.
- **Input:** UIInputController handles navigation; click handlers on shop items/buttons manage purchases via `UIManager.purchaseShopItem`.

## Town Banner
- Controlled by `TownManager`: `uiManager.showTownBanner(town)` when entering a town region; fades/hides after a timer.

## Speech & Dialogue
- `DialogueManager` stores dialogue state and formatting (bold/italic/wave/rainbow markers).
- `SpeechBubble` manages DOM for `#speechBubble` and shows/hides/advances text.
- `UIManager.startNpcDialogue(npc)` and `advanceSpeechBubble()` are called from input handlers when interacting.

## Debug UI
- `#debugToggleButton` toggles `#debugPanel` via UIManager.
- `DebugRenderer` draws overlays in-canvas; `UIRenderer`/UIManager handle panel text.

## Menus (Start/Pause/Game Over/Load/Custom)
- Menu blocks live in `index.html`.
- Show/hide with `GameStateManager.showMenu(menuId)`/`hideMenu(menuId)`.
- Buttons (start, resume, save, load, back) are wired in UIManager setup functions.
- Pause menu includes audio sliders; AudioController syncs slider values (`updateUI`) and applies changes (`setMasterVolume`, etc.).

## Adding New UI Panels or Buttons
1) Add HTML with a unique `id` and `class="hidden"` to start hidden.
2) Style in CSS (layout, responsiveness, focus states).
3) In `UIManager.js`, add setup code to:
   - Cache DOM refs (`document.getElementById`).
   - Add event listeners to buttons/inputs.
   - Add show/hide helper functions that toggle `.hidden` and (optionally) pause/resume the game.
4) If you need state integration (e.g., pause), call `stateManager.pause()`/`resume()` when showing/hiding.
5) If you need content population, write an update function (similar to `updateInventoryOverlay`, `populateChestOverlay`, `updateShopDisplay`).

## Audio Controls
- UI sliders/buttons (pause menu) are wired to `AudioController` methods:
  - `toggleMute()`
  - `setMasterVolume(value)`
  - `setMusicVolume(value)`
  - `setSfxVolume(value)`
- `AudioController.updateUI()` refreshes slider labels to match current settings.

## File Pointers (Quick Reference)
- Markup: `game/index.html`
- Styles: `game/styles/main.css` (and related CSS files)
- UI orchestration: `game/scripts/ui/UIManager.js`
- Input binding: `game/scripts/ui/UIInputController.js`
- Dialogue: `game/scripts/ui/DialogueManager.js`, `game/scripts/dialogue/SpeechBubble.js`, `game/scripts/dialogue/Dialogues.js`, `game/scripts/dialogue/NPCDialogues.js`
- Signs: `game/scripts/ui/SignUI.js`
- Badges: `game/scripts/ui/BadgeUI.js`
- Rendering helpers: `game/scripts/core/UIRenderer.js`
- State/Scene control: `game/scripts/core/GameStateManager.js`, `game/scripts/core/scene/*.js`
- Audio UI: `game/scripts/core/AudioController.js`

## Troubleshooting
- **UI doesn’t show:** Ensure `.hidden` is removed in JS and the `id` matches references.
- **Buttons unresponsive:** Verify event listeners are set in `UIManager.setup...` methods and that setup is called during initialization.
- **Overlay blocks input forever:** Make sure you re-add `.hidden` or call `hide...` on close; resume the game if you paused it.
- **Styles missing:** Confirm CSS is loaded and selectors match; check for specificity conflicts.
- **Dialogue not advancing:** Check input bindings in `UIInputController`; ensure `advanceSpeechBubble` is wired to key/button events.
