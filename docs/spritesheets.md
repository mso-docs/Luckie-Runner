# Spritesheet Guide (Houses, NPCs, Entities)

This guide explains how spritesheets work in the game for exteriors (houses), NPCs, and other entities. It covers frame slicing, frame directions, and where to set these values so animations render correctly.

## Key Concepts
- **Spritesheet:** A single image containing multiple frames of animation.
- **Frame width/height:** The size (in pixels) of one frame.
- **Frames count:** How many frames the sheet contains.
- **Frame direction:** How frames are laid out—horizontal (side-by-side) or vertical (stacked).
- **Animation timing:** How long each frame is shown (ms per frame).

## Where Frame Data Is Used
- **Buildings (exteriors):** `TownsConfig.js` under `buildings[].exterior` (and sometimes `interior` art).
- **NPCs:** NPC definitions (e.g., in `TownsConfig` or level/room NPC arrays) specify `frames`, `frameDirection`, `idleFrame`, `walkFrames`, `talkFrames`.
- **Entities (general):** Classes that call `loadSprite(path, { frameWidth, frameHeight, frames, frameDirection })` use these to slice the sheet (e.g., Player, Enemies, DecorPlatform).

## Houses/Exteriors (TownsConfig)
Example excerpt for a building exterior:
```js
exterior: {
  x: 8800,
  y: 0,
  width: 689,        // source frame width
  height: 768,       // source frame height
  frames: 2,         // total frames (closed + open)
  frameWidth: 689,   // per-frame width (if not auto-sliced)
  frameHeight: 768,  // per-frame height
  frameDirection: 'horizontal', // frames side-by-side
  scale: 0.4,
  sprite: 'art/bg/buildings/exterior/house.png'
}
```
- **Doors:** Door offsets (`spriteOffsetX/Y`) align the interaction hotspot to the sprite.
- **Animation:** Frames 0/1 often represent closed/open door; TownManager toggles `frameIndex` on interaction.

## NPC Sprites
Example NPC definition (in `TownsConfig` or level NPC array):
```js
{
  id: 'maria',
  type: 'townNpc',
  sprite: 'art/sprites/maria.png',
  width: 48,
  height: 70,
  frames: 4,
  idleFrame: 1,
  walkFrames: [2, 3],
  talkFrames: [0, 1],
  frameDirection: 'vertical', // or 'horizontal' depending on sheet layout
  frameTimeMs: 120,
  x: 8800,
  patrol: [{ x: 8700 }, { x: 9100 }]
}
```
- **idleFrame:** Shown when standing still.
- **walkFrames:** Cycling frames for walking.
- **talkFrames:** Shown when talking.
- **frameDirection:** Tell the renderer how to slice frames (vertical stack or horizontal strip).
- **frameTimeMs:** How long each frame stays before advancing.

## General Entity Sprites (loadSprite)
Classes often call:
```js
this.loadSprite('art/sprites/foo.png', {
  frameWidth: 64,
  frameHeight: 64,
  frames: 6,
  frameDirection: 'horizontal'
});
```
- If `frameWidth/height` are omitted, the class may infer them (e.g., by dividing total width by frames when horizontal).
- For vertical sheets, set `frameDirection: 'vertical'` and `frameHeight` explicitly.

## Frame Direction Rules
- **Horizontal:** Frames laid left→right. Source width ≈ frameWidth * frames.
- **Vertical:** Frames stacked top→bottom. Source height ≈ frameHeight * frames.

## Animation Timing
- **NPCs/buildings:** Frame choice is manual (door open/closed) or timer-driven (`frameTimeMs` for walking).
- **Player/Enemies:** Their update logic advances frames based on movement state and `frameTimeMs` (see `PlayerAnimations.js`, enemy classes).
- **Badge/Decor callouts:** Typically static frames; can animate if you supply multiple frames and timers.

## Common Pitfalls
- **Wrong frame slicing:** Mismatched `frameWidth/height` or `frameDirection` causes stretched/cut art. Ensure they match your sheet layout.
- **Frame count mismatch:** If `frames` is wrong, you’ll see empty/offset frames. Count frames in your sheet.
- **Scale vs. source size:** Exteriors may use `scale`; keep frame sizes consistent with the source image and let scale handle display size.
- **Missing frameTime:** For animated NPCs, set `frameTimeMs` to control speed (e.g., 100–160ms).

## How to Add a New Spritesheet (Example: New NPC)
1) Place the image in `art/sprites/your-npc.png`.
2) Count frames and decide direction (horizontal/vertical).
3) Add an NPC definition:
   ```js
   { type: 'townNpc', id: 'newNpc', sprite: 'art/sprites/your-npc.png',
     width: 50, height: 70,
     frames: 4, idleFrame: 0, walkFrames: [1,2,3], talkFrames: [0,1],
     frameDirection: 'horizontal', frameTimeMs: 120,
     x: 5000, patrol: [{ x: 4900 }, { x: 5100 }] }
   ```
4) Ensure EntityFactory can build `townNpc` (built-in). For custom NPC classes, register a new `type` and use `loadSprite` inside the class with matching frame data.

## How to Add a New Building Spritesheet
1) Place the exterior image in `art/bg/buildings/exterior/your-building.png`.
2) Determine frame layout (e.g., 2 frames horizontal: closed/open).
3) In `TownsConfig.js`, set `exterior` with `width/height`, `frames`, `frameWidth/height`, `frameDirection`, `scale`, and `sprite`.
4) Set door offsets (`spriteOffsetX/Y`) to align the door hotspot with the art.

## Quick Checks When Animations Look Wrong
- Verify `frameDirection` matches the sheet layout.
- Verify `frames` matches the number of actual frames.
- Verify `frameWidth/height` match a single frame’s dimensions.
- For NPCs, confirm `idleFrame`, `walkFrames`, and `talkFrames` are within `[0, frames-1]`.
- For exteriors, ensure `frameWidth`*frames == source width (if horizontal) or `frameHeight`*frames == source height (if vertical).

## Tiling Sprites (Repeated Patterns)
Some entities (decor/setpieces) support horizontal tiling of a frame across a width. Key fields:
- `tileX: true` — repeat the frame across the X axis.
- `tileWidth` — how wide each tile step is (defaults to frameWidth * scale if omitted).

Example (TownsConfig setpiece):
```js
{ id: 'cobble_strip', name: 'Cobble Ground',
  x: 6500, y: 0, width: 3500, height: 40,
  frameWidth: 1024, frameHeight: 1024,
  tileX: true, tileWidth: 128,
  layer: 'ground', autoAlignToGround: true,
  scale: 0.04,
  sprite: 'art/bg/tiles/beach-cobble.png'
}
```
- The renderer will draw the frame repeatedly across `width`, stepping by `tileWidth`.
- For non-tiling sprites, leave `tileX` false/undefined.
