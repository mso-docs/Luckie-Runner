# UIManager Guide (HUD, Overlays, Interactions)

This guide explains how UIManager controls HUD overlays, inventories, shops, chests, and interaction flow. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/ui/UIManager.js`
- Class: `UIManager`

---
## Responsibilities
- Set up and update DOM-based HUD/overlays (inventory, chest, shop, dialogue, menus hooks).
- Handle interaction input routing (E/Enter for chests/doors/signs/NPCs; Z/action for shop/player interaction).
- Update UI elements based on player/game state (health, coins, rocks, shop/chest contents).

---
## Initialization
- `setupMenuAndControls()`, `setupInventoryUI()`, `setupChestUI()`, `setupShopUI()`, `setupSignDialogueUI()`, etc., cache DOM elements and wire buttons.
- `game.chestUI` and `inventoryUI` states are stored on the game for quick checks.

---
## Key Methods
- Inventory: `showInventoryOverlay()`, `hideInventoryOverlay()`, `toggleInventoryOverlay()`, `updateInventoryOverlay()`.
- Chest: `showChestOverlay(chest)`, `hideChestOverlay()`, `populateChestOverlay(chest)` (builds Take buttons, Take All).
- Shop: `showShopOverlay()`, `hideShopOverlay()`, `updateShopDisplay()`, `handleShopListNavigation(e)`.
- Dialogue: `startNpcDialogue(npc)`, `advanceSpeechBubble()`, `showSpeechBubble(text)`, `hideSpeechBubble()`.
- Interaction routing: `handleChestInput()` (E/Enter), `handleInteractionInput()` (Z/action), `getNearbyChest()`, `getNearbyShopGhost()`, `getNearbyTalkableNpc()`.
- Update loop: `updateChests(deltaTime)` to tick chest callouts; called from `Game.update` via GameSystems.

---
## Interaction Priority
- Interact (E/Enter): close chest overlay if open; else try door (TownManager) -> NPC dialogue -> sign -> chest (opens chest overlay).
- Action (Z): close shop if open; else open shop if ghost nearby; else call `player.handleInteraction()`.

---
## HUD/Overlay DOM
- Defined in `game/index.html` and styled in `game/styles/main.css`.
- UIManager queries elements by ids/classes (e.g., `#chestOverlay`, `.chest-items`, inventory panels) and toggles classes `hidden`/`active`.

---
## Extending UIManager
- Add new overlay: create DOM in `index.html`, style it, add state fields to UIManager, and wire show/hide/update functions.
- Add new interaction: extend `handleChestInput`/`handleInteractionInput` with priority ordering.

---
## Troubleshooting
- Buttons not working: ensure `setup*UI` ran and DOM ids/classes match; check event listeners.
- Interact doing nothing: verify `handleChestInput` is called from the game loop (via GameSystems input handling) and that `isPlayerNearby` is true for targets.
- HUD not updating: ensure the player calls UIManager update methods (e.g., `updateHealthUI`) after stat changes.
