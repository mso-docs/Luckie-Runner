# Input & Interaction Buttons Guide

This guide explains how interaction buttons work, what they do in-game, and how to map or add new controls from scratch. It assumes minimal prior knowledge.

## Core Pieces
- **InputManager** (`game/scripts/utils/InputManager.js`): Low-level keyboard/mouse state (pressed, held).
- **UIInputController** (`game/scripts/ui/UIInputController.js`): Binds UI-related keys (overlay navigation, confirm/cancel).
- **Game/Systems:** Use input flags to move/jump/attack/interact.
- **Interact actions:** Door entry, chest open, sign read, NPC talk, shop enter—typically bound to the same interact key(s).

## Default Controls (Typical)
- **Move:** A/D or Left/Right arrows
- **Jump:** W or Space
- **Dash:** Shift + movement (if implemented)
- **Attack/Throw:** Mouse click (often left click)
- **Interact:** E or Enter (doors, NPCs, signs, chests, shop)
- **Pause:** Esc (opens pause menu)
- **Inventory:** I (toggles inventory overlay)
- **Debug:** UI debug toggle button; can be bound to a key (e.g., F3) manually

## How Interaction Works
1) **InputManager** records key presses each frame.
2) Game systems check interaction keys:
   - **Doors/Buildings:** `TownManager.getNearbyBuildingDoor` + interact → `enterBuilding`.
   - **NPCs:** `UIManager.getNearbyTalkableNpc` + interact → `startNpcDialogue`.
   - **Chests:** `UIManager.getNearbyChest` + interact → `showChestOverlay`.
   - **Signs:** `SignUI` checks proximity + interact to show dialogue.
3) Interact key is usually E/Enter; same key used across these systems.

## Mapping a New Key (Quick Example)
In `InputManager.js`, add a new key code to track:
```js
this.keys = {
  ...this.keys,
  'KeyF': { pressed: false, held: false } // new mapping
};
```
Then in your game logic, check it:
```js
if (game.input.isPressed('KeyF')) {
  // Trigger custom action
}
```

## Rebinding Interaction (E/Enter -> Custom)
Find where interact is checked (e.g., in UIManager, TownManager, SignUI, chest interactions). They typically use InputManager helpers or UI input flags. You can:
```js
const INTERACT_KEYS = ['KeyE', 'Enter', 'NumpadEnter']; // add your own
function isInteractPressed(input) {
  return INTERACT_KEYS.some(code => input.isPressed?.(code) || input.keys?.[code]?.pressed);
}
// In your update loop:
if (isInteractPressed(game.input)) {
  // run interaction checks (doors/NPCs/signs/chests)
}
```

## UI Buttons and Mapping
For menus/overlays (inventory, shop, chest):
- `UIInputController` listens for keys like Enter (confirm), Esc (cancel), arrow keys/W/S (navigate).
- To add a new UI key, extend UIInputController to listen for your code and map it to the appropriate action (`confirm`, `cancel`, `next`, `prev`).

Example: Bind `KeyF` as an alternate confirm in `UIInputController.js`:
```js
handleKeydown(e) {
  const code = e.code;
  if (code === 'Enter' || code === 'KeyF') {
    this.confirm();
  }
  // existing cases...
}
```

## Adding a New Action Button (from scratch)
1) **Decide the action** (e.g., “Use Gadget”).
2) **Track the key** in `InputManager`:
   ```js
   this.keys['KeyG'] = { pressed: false, held: false };
   ```
3) **Handle in game update**:
   ```js
   if (game.input.isPressed('KeyG')) {
     game.player.useGadget?.();
   }
   ```
4) **UI hint**: Add a callout (see `docs/callouts.md`) or speech bubble to guide the player (e.g., “Press G to use gadget”).

## Mouse Input (Attack/Throw)
InputManager tracks mouse buttons; check `input.mouse.clicked`/`pressed` and position if needed:
```js
if (game.input.mouse.clicked) {
  game.player.throwRock?.();
}
```

## Interaction Radius and Detection
- **Doors:** `interactRadius` on building `door` in `TownsConfig`.
- **NPCs:** UIManager `getNearbyTalkableNpc` checks distance.
- **Chests/Signs:** Similar proximity checks before showing overlays/dialogue.
If you change the interact key, ensure the proximity checks still run when your new key is pressed.

## Showing Controls to Players
- Update callouts (shop ghost bubble text, sign/chest callouts) to reflect new keys. See `docs/callouts.md`.
- Update on-screen hints in `index.html` menus if you change defaults.

## Troubleshooting Interactions
- **Nothing happens on interact:** Verify key codes match (use `e.code` from a console listener to confirm). Check proximity detection (player too far). Ensure overlays aren’t blocking input.
- **UI not responding:** Confirm UIInputController handles your key; check `hidden` class on overlays.
- **Multiple actions firing:** Guard interactions so only one action triggers per press (e.g., check `isPressed` vs. held).

## Helpful Snippet: Log Key Codes
```js
window.addEventListener('keydown', (e) => console.log(e.code));
```
Use this to discover the correct `code` string to map in InputManager/UIInputController.
