# Backgrounds and Parallax Guide

This guide explains how backgrounds are defined per level and per room, how to swap them safely, and how the renderer respects the active world. It assumes no prior knowledge.

## Where Backgrounds Are Defined
- **Levels (overworld):** In each LevelDefinition (`game/scripts/levels/*.js`), via `theme` or `backgroundImage`.
- **Rooms (interiors):** In each room descriptor (`game/scripts/rooms/*.js`), via `backgroundImage` or `backgroundLayers`.
- **Builders/Renderers:**
  - `WorldBuilder.createBackground(theme)` builds parallax layers for levels when no explicit image is provided.
  - `RoomWorldBuilder` (inside `RoomManager`) builds room background layers from `backgroundImage` or `backgroundLayers`.
  - `SceneRenderer` draws background layers for the active world and hides level/town decor when in rooms.

## Level Backgrounds (Data-First)
In a LevelDefinition, use one of these approaches:
- **Theme-based (procedural/parallax):**
  ```js
  window.LevelDefinitions.forest = {
    id: 'forest',
    width: 6000,
    height: 900,
    spawn: { x: 100, y: 600 },
    theme: 'forest',      // picked up by WorldBuilder.createBackground
    platforms: [ /* ... */ ],
    enemies: [ /* ... */ ]
  };
  ```
  `WorldBuilder` uses `theme` to build parallax layers.

- **Explicit image:**
  ```js
  window.LevelDefinitions.canyon = {
    id: 'canyon',
    width: 6000,
    height: 900,
    spawn: { x: 120, y: 620 },
    backgroundImage: { src: 'art/bg/canyon.png', width: 6000, height: 900 },
    platforms: [ /* ... */ ]
  };
  ```
  The image is drawn 1:1 behind everything; no parallax unless you add custom layers.

## Room Backgrounds
- **Image:**
  ```js
  const hut = {
    id: 'hut_room',
    width: 1024,
    height: 720,
    backgroundImage: { src: 'art/bg/buildings/interior/hut.png', width: 1024, height: 720 },
    // platforms/items/etc...
  };
  ```
- **Custom layers:** Provide `backgroundLayers` as an array of `{ render(ctx, camera), update(dt) }` objects for advanced cases. When present, they replace the image-based layer.
- **Fallback:** If nothing is provided, rooms render a black backplate.

## Active World Separation
- `SceneRenderer` checks `game.activeWorld.kind`:
  - In **level** mode: draws level background layers, level/town decor, entities.
  - In **room** mode: draws room background layers; hides level/town decor and level platforms visually.
- Town decor is rendered over levels; it is not used in rooms.

## Swapping Backgrounds Per Level Safely
- Each LevelDefinition holds its own `theme`/`backgroundImage`. Changing one level’s background does **not** affect others.
- To make a second level with a different look, set a different `theme` or `backgroundImage` in that level’s data file. No code changes required in other levels.

## Custom Parallax (Advanced)
- You can extend `WorldBuilder` to add extra parallax layers per theme or per level.
- Alternatively, after level creation, assign `game.backgroundLayers = [...]` with custom layer objects:
  ```js
  game.backgroundLayers = [
    { render: (ctx, cam) => {/* draw far mountains */}, update: () => {} },
    { render: (ctx, cam) => {/* draw near trees */}, update: () => {} }
  ];
  ```

## Common Terms
- **theme:** String id used by `WorldBuilder` to pick a preset parallax stack.
- **backgroundImage:** A single image drawn as the backdrop (width/height should match your level/room for 1:1).
- **backgroundLayers:** An array of custom render/update objects that replace the default image layer in rooms (or override level layers if you set them manually).
- **activeWorld.kind:** `'level'` or `'room'`; renderer uses this to choose which backgrounds to draw.

## Pitfalls and Tips
- Match `backgroundImage.width/height` to your level/room bounds to avoid stretching.
- Ensure asset paths exist (`art/bg/...`). Broken paths result in missing backgrounds.
- If you supply `backgroundLayers`, make sure each has a `render` function that handles camera offset (e.g., draw at `-camera.x`, `-camera.y` for fixed layers).
- Changing a level’s `theme` or `backgroundImage` won’t break other levels; they are isolated by their own definitions.

## Quick Checklist to Add a New Background
1) Add your art file under `art/bg/...`.
2) In the level (or room) definition, set either `theme: 'yourTheme'` **or** `backgroundImage: { src, width, height }`.
3) Load/run the level; verify the background appears.
4) For rooms, ensure `RoomManager` loads your descriptor (via TownManager or direct entry).
5) (Optional) Add custom parallax layers by overriding `game.backgroundLayers` or extending `WorldBuilder`.
