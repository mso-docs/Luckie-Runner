# Performance Tips and Profiling

This guide covers what to watch for (overdraw, heavy tiling), and how to profile/debug performance issues.

## Common Performance Risks
- **Overdraw:** Too many overlapping large sprites/layers (e.g., big tiled backdrops).
- **Excessive tiling:** Very wide `tileX` setpieces with small `tileWidth` can create many draw calls.
- **Huge sprites:** Extremely large images consume memory and can cause slow decode.
- **Too many entities:** Large counts of enemies/projectiles/items on-screen.
- **Frequent reflow in DOM UI:** Avoid unnecessary DOM updates; batch UI changes where possible.

## Mitigation Tips
- Keep background images sized to level/room bounds; avoid oversized unused areas.
- For tiling, choose reasonable `tileWidth` (often `frameWidth * scale`) and limit `width` to the region you need.
- Split distant backdrops into fewer large tiles instead of many tiny ones.
- Reuse spritesheets instead of many unique textures.
- Cull or despawn offscreen entities when possible.

## Profiling (Browser DevTools)
- **Performance panel:** Record a profile while playing; look for long frames.
- **Network panel:** Check asset sizes and load times; ensure no 404s (missing assets can stall).
- **Memory tab:** Watch for large images; ensure unused DOM nodes are removed (callouts, overlays).

## Debugging Tiling/Backdrop Issues (Fronds example)
- If FPS drops near a tiled backdrop:
  - Reduce `width` or `tileWidth`.
  - Lower `scale` if the source image is large.
  - Move backdrop to a farther layer if overdraw is high.

## Quick Checks
- Count entities:
  ```js
  game.enemies.length, game.items.length, game.projectiles.length
  ```
- Check canvas size vs. viewport; avoid excessively large canvases.
- Verify `tileX` usage in setpieces; confirm `width` and `tileWidth` are sensible.

## When to Optimize
- If you see frame drops, profile first. Optimize the heaviest contributors (largest draw spans, biggest images, excessive tiling, or huge entity counts).***
