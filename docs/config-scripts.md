# Config Scripts Guide (What They Are and What They Do)

This guide explains the configuration scripts used to seed defaults for camera, audio, controls, levels, themes, and towns. It assumes no prior knowledge.

---
## Files
- `game/scripts/core/config/AudioConfig.js`
- `game/scripts/core/config/CameraConfig.js`
- `game/scripts/core/config/ControlsConfig.js`
- `game/scripts/core/config/LevelDefaultsConfig.js`
- `game/scripts/core/config/ThemesConfig.js`
- `game/scripts/core/config/TownsConfig.js`

These are plain JS modules exporting objects the game reads on startup.

---
## What Each Config Provides
- **AudioConfig**: master/music/sfx default volumes, mute flags, maybe track ids for menus/levels.
- **CameraConfig**: look-ahead (`lead`), `lerpSpeed`, and other camera tuning values consumed by `GameConfig.camera`.
- **ControlsConfig**: key bindings for movement/interactions (used by Input/UI hints).
- **LevelDefaultsConfig**: fallback width/height/spawn/scroll speed for levels if not provided per LevelDefinition.
- **ThemesConfig**: named themes for backgrounds (colors, layers) used by `SceneRenderer`/`WorldBuilder`.
- **TownsConfig**: town list with regions, music, buildings, interiors, setpieces, and NPC data.

---
## How They Are Consumed
- `GameConfig` imports or aggregates these to initialize systems.
- `WorldBuilder` reads `LevelDefaultsConfig` and `ThemesConfig` when building levels.
- `TownManager` reads `TownsConfig` to place buildings/interiors/music.
- `Camera` defaults are pulled from `CameraConfig` when created in `Game`.
- `AudioController` applies `AudioConfig` defaults to UI sliders and AudioManager.

---
## Editing Configs
Example (CameraConfig):
```js
const CameraConfig = {
  lead: { x: 120, y: 40 },
  lerpSpeed: 0.18
};
export default CameraConfig;
```
Example (AudioConfig):
```js
const AudioConfig = {
  master: 0.8,
  music: 0.8,
  sfx: 0.9,
  titleTrackId: 'title'
};
export default AudioConfig;
```
After editing, reload the game; no build step required if scripts are loaded directly via `index.html`.

---
## Troubleshooting
- New theme not showing: ensure `ThemesConfig` entry matches the `theme` string in LevelDefinitions.
- Town not loading: check `TownsConfig` ids and region bounds; ensure level id matches.
- Controls mismatch: update `ControlsConfig` and any UI hint text to match new bindings.
