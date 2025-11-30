# Input System Guide (InputManager + InputService)

This guide explains how input is captured and consumed, how to add new actions, and what keys are used. It assumes no prior knowledge.

---
## Files and Classes
- Input capture: `game/scripts/utils/InputManager.js`
- Input wrapper: `game/scripts/core/services/InputService.js`
- Usage: `game.input`, `game.services.input`, scenes via `ctx.services.input`

---
## How InputManager Works
- Listens to `keydown/keyup` on `document` and mouse on `#gameCanvas`.
- Tracks:
  - `keys`: dictionary of pressed states (lowercased key and code).
  - `keyPresses`: `Set` of one-shot presses (non-repeating).
  - `mouse`: `{ x, y, clicked, pressed }` in canvas coordinates.
- Normalizes WASD/Arrow movement, jump (Space/W/ArrowUp), dash (Shift), pause (Esc/P).
- Provides helpers:
  - Movement: `isMovingLeft/Right/Down()`, `isJumping()`, `isDashing()`.
  - Actions: `consumeActionPress()` (Z), `consumeInteractPress()` (E/Enter), `consumeKeyPress(key)`.
  - Mouse: `getMousePosition()`, `isMouseClicked()`, `isMousePressed()`.

---
## InputService (Wrapper)
- Thin proxy over InputManager used in `game.services.input`.
- Allows scenes/systems to access input without holding Game directly.

---
## Adding a New Action
1) Pick a key (e.g., `KeyF`).
2) Add a helper to InputManager or consume via `consumeKeyPress('f')`.
   ```js
   if (input.consumeKeyPress('f')) { /* do action */ }
   ```
3) Wire consumption in the appropriate place (UIManager for interactions, player update for moves/abilities).

---
## Interaction Priority (UIManager.handleChestInput)
- Interact (E/Enter) flow: if chest overlay open -> close; else door -> NPC -> sign -> chest.
- Action (Z) flow: closes shop if open, otherwise opens shop if ghost nearby, otherwise `player.handleInteraction()`.

---
## Troubleshooting
- Key not detected: ensure `keydown/keyup` not blocked by other listeners; check lowercased key name.
- Repeats undesired: use `consumeKeyPress`/`consumeInteractPress` to consume one-shot presses.
- Mouse coords off: ensure `#gameCanvas` matches the render size and isn’t scaled by CSS.
