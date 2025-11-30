# Camera Guide (Following, Lerp, and Bounds)

This guide explains the camera system, what fields it has, how it follows the player, and how to adjust its behavior. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/core/Camera.js`
- Class: `Camera`

---
## Constructor and Fields
```js
const cam = new Camera({
  viewportWidth,    // canvas width
  viewportHeight,   // canvas height
  lead: { x: 100, y: 50 }, // look-ahead offset
  lerpSpeed: 0.15          // smoothing factor [0..1]
});
```
Runtime fields you can read/modify:
- `x, y`: top-left of the camera in world space.
- `viewportWidth, viewportHeight`: copied from options (canvas size).
- `lead`: { x, y } look-ahead offset toward the player’s facing/movement.
- `lerpSpeed`: smoothing for follow; higher snaps faster.
- `bounds`: optional clamp rectangle `{ minX, maxX, minY, maxY }`.

---
## Core Methods
- `follow(target, deltaTime)`: moves camera toward `target.x/y` minus half viewport, plus `lead`. Uses lerp with `lerpSpeed` and deltaTime.
- `setBounds(bounds)`: set clamp values to keep camera inside world.
- `reset(state)`: set `x/y` to provided state (used on reset).
- `getState()`: returns `{ x, y }` for saving/restoring.

Typical call (done in systems, not manually):
```js
camera.follow(game.player, deltaTime);
```

---
## How It’s Used
- `Game` constructs one camera using canvas dimensions and config lead/lerp (`GameConfig.camera`).
- `GameSystems.updateCamera()` (called from the play loop) tells the camera to follow the player each frame.
- Renderers (SceneRenderer/UI) subtract `camera.x/y` when drawing world objects so the world scrolls while the HUD stays fixed.

---
## Adjusting Feel
- Faster snap: increase `lerpSpeed` (e.g., 0.25).
- More look-ahead: increase `lead.x` (100 -> 160) so the camera looks further ahead of movement.
- Vertical lead: raise/lower `lead.y` or set 0 to center vertically.
- Hard clamp: set `camera.setBounds({ minX: 0, maxX: level.width - viewportWidth, minY: 0, maxY: level.height - viewportHeight })`.

---
## Troubleshooting
- Camera shows void: check bounds vs. level size; ensure `viewportWidth/Height` match canvas.
- Camera not moving: verify `updateCamera()` is called (play state only) and player exists.
- Jitter: lower `lerpSpeed` or ensure `deltaTime` is passed consistently.
