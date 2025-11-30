# Rendering Stack Guide (Renderer vs RenderTarget vs SceneRenderer vs UIRenderer)

This guide explains the rendering pipeline and how the renderer classes differ. It assumes no prior knowledge.

---
## Files and Classes
- `game/scripts/core/Renderer.js` — top-level orchestrator that calls scene and UI renderers.
- `game/scripts/core/SceneRenderer.js` — draws world elements (backgrounds, platforms, entities, chests, NPCs, projectiles).
- `game/scripts/core/UIRenderer.js` — draws canvas-based UI overlays (if used; most UI is DOM).
- `game/scripts/core/RenderTarget.js` — offscreen buffer helper (optional composition).
- Debug overlay: `game/scripts/core/DebugRenderer.js` (hitboxes).

---
## Renderer (Orchestrator)
- Called from `Game.render()`.
- Holds references to SceneRenderer/UIRenderer/DebugRenderer.
- Chooses what to draw based on active world and debug flags.
- Delegates to:
  - `sceneRenderer.renderBackground(...)`
  - `sceneRenderer.renderPlatforms(...)`
  - `sceneRenderer.renderEntities(...)` (enemies/items/chests/NPCs/projectiles/player)
  - UI overlays (DOM are separate; canvas UI via UIRenderer if enabled)

---
## SceneRenderer (World Drawing)
Responsibilities:
- Renders parallax/background layers.
- Draws platforms, decor, entities, NPCs, chests, projectiles, flag, signs.
- Uses `camera` to offset world positions (`screenX = worldX - camera.x`).
- Provides helpers like `renderBackground`, `renderPlatforms`, `renderNPCs`, `renderChests`, `renderTestBackground`.

Key inputs:
- `game.activeWorld` (`level` or `room`) affects what is drawn (rooms hide level decor).
- `camera` for offsets.
- World collections: `platforms, enemies, items, hazards, chests, npcs, projectiles, backgroundLayers, townDecor`.

---
## UIRenderer (Canvas UI)
- Draws optional canvas-based UI elements (most HUD is DOM). Check if your build uses it; otherwise it may be minimal/no-op.
- Takes `RenderContext` (ctx/canvas) and may overlay debug or prompts.

---
## RenderTarget (Offscreen Buffer)
- Wrapper around an offscreen canvas:
  ```js
  const rt = new RenderTarget(width, height);
  rt.begin();   // set as current target (ctx changes)
  // draw...
  rt.end(ctx);  // blit to main ctx
  ```
- Useful for effects or composition; not mandatory in the default pipeline.

---
## DebugRenderer
- Renders hitboxes and debug overlays when debug mode is enabled.
- Called from Renderer when `game.debug` is true.

---
## Render Flow (Default)
1) `game.render()` -> `renderer.renderFrame()`
2) Renderer clears canvas (via RenderContext)
3) Renderer calls SceneRenderer to draw background, platforms, entities (camera-adjusted)
4) Renderer may call DebugRenderer for hitboxes
5) DOM-based UI (HUD, menus, chest overlay) sits above the canvas via HTML/CSS

---
## Customizing
- To add new world visuals: extend `SceneRenderer` to draw your new entity type.
- To add a canvas HUD widget: extend/enable `UIRenderer`.
- To add post-processing: draw to a `RenderTarget` then composite to the main ctx.
