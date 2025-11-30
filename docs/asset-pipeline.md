# Asset Pipeline Guide (Art/Audio Conventions & Optimization)

This guide covers how to add art/audio assets, naming/path conventions, frame/sizing tips, optimization, and how to avoid load-order issues. It assumes minimal prior knowledge.

## Paths and Organization
- Art: `game/art/...`
  - Backgrounds: `game/art/bg/...`
  - Buildings: `game/art/bg/buildings/...`
  - Tiles/Decor: `game/art/bg/tiles/...`, `game/art/bg/exterior-decor/...`, `game/art/bg/town backdrop/...`
  - Sprites (NPCs/Enemies/Player): `game/art/sprites/...`
  - Items: `game/art/items/...`
- Audio:
  - Music: `game/music/...`
  - SFX: `game/sfx/...`

Keep file names descriptive and avoid spaces when possible. Example: `forest-theme.mp3`, `maria.png`, `small-palm.png`.

## Spritesheet Conventions
- Frame layout: Decide `frameDirection` (`horizontal` or `vertical`).
- Frame sizes: Use consistent `frameWidth`/`frameHeight` that divide the source image evenly.
- Frame count: Match `frames` to actual frames in the sheet.
- NPCs/Buildings examples:
  ```js
  // NPC
  { sprite: 'art/sprites/maria.png', width: 48, height: 70,
    frames: 4, frameDirection: 'vertical', idleFrame: 1,
    walkFrames: [2,3], talkFrames: [0,1], frameTimeMs: 120 }

  // Building exterior (2 frames horizontal: closed/open)
  exterior: { sprite: 'art/bg/buildings/exterior/house.png',
              width: 689, height: 768, frames: 2,
              frameWidth: 689, frameHeight: 768,
              frameDirection: 'horizontal', scale: 0.4 }
  ```
- Tiling decor: Use `tileX: true` and `tileWidth` for repeated patterns (see `docs/spritesheets.md`).

## Backgrounds
- Level: `theme` (procedural/parallax) or `backgroundImage { src, width, height }`.
- Room: `backgroundImage` or `backgroundLayers`. Match `width/height` to room/level bounds for 1:1.

## Audio Conventions
- Music IDs: unique per level/town/room (e.g., `forestTheme`, `shoreTownTheme`).
- SFX IDs: action-based (e.g., `interact`, `doorOpen`, `jump`).
- Load/Play:
  ```js
  audioManager.loadMusic('forestTheme', 'music/forest-theme.mp3');
  audioManager.playMusic('forestTheme', 0.85, { allowParallel: false });
  audioManager.loadSound('interact', 'sfx/interact.mp3');
  audioManager.playSound('interact', 0.8);
  ```

## Load Order (Avoiding Breakage)
- HTML includes: Ensure new scripts are added to `game/index.html` in correct order (classes before they’re used; EntityFactory after class definitions).
- Globals: LevelDefinitions, RoomDescriptors, TownsConfig must be loaded before use.
- Assets: Broken paths fail silently; check Network tab for 404s.

## Optimization Tips (Art/Audio)
- Use power-of-two-ish sizes when possible for better GPU handling (not strict, but helps).
- Trim transparent padding; keep frames tight to reduce overdraw.
- Reuse spritesheets across similar NPCs/enemies where possible.
- Compress audio to reasonable bitrate; keep loops cleanly cut.
- Avoid excessively large tiled spans; set `tileWidth` appropriately.

## Adding New Assets Safely
1) Place the file under the correct folder (`art/bg/...`, `art/sprites/...`, `music/...`, `sfx/...`).
2) Reference the exact path in your data (LevelDefinition, TownsConfig, NPC/Enemy/Item definitions, AudioManager calls).
3) If adding a new entity type, load the class script before EntityFactory registers/uses it.
4) Test in browser; check console/Network for missing assets.

## Example: Adding a New NPC Sprite
1) Save `art/sprites/guide.png` (4 frames horizontal, 48x70 each).
2) Add NPC data:
   ```js
   { type: 'townNpc', id: 'guide', sprite: 'art/sprites/guide.png',
     width: 48, height: 70,
     frames: 4, frameDirection: 'horizontal',
     idleFrame: 0, walkFrames: [1,2,3], talkFrames: [0,1],
     frameTimeMs: 120, x: 5000, patrol: [{x:4900},{x:5100}] }
   ```
3) Run and verify animation frames.

## Example: Adding a New Music Track to a Town
1) Save `game/music/forest-town.mp3`.
2) In `TownsConfig`:
   ```js
   music: { id: 'forestTownTheme', src: 'music/forest-town.mp3', volume: 0.9 }
   ```
3) AudioManager/TownManager will load/play it on entry.
