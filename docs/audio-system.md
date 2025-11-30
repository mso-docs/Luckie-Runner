# Audio System Guide (AudioManager + AudioController + AudioService)

This guide explains how music/SFX are loaded, played, and controlled. It assumes no prior knowledge.

---
## Files and Classes
- `game/scripts/utils/AudioManager.js` — core loader/player for music and SFX.
- `game/scripts/core/AudioController.js` — bridges UI sliders/buttons to AudioManager; applies config defaults.
- `game/scripts/core/services/AudioService.js` — DI wrapper over AudioManager (used via `services.audio`).
- Config: `game/scripts/core/config/AudioConfig.js` (default volumes, track ids).

---
## AudioManager Basics
- Stores `music` and `sfx` maps keyed by id.
- Load and play:
  ```js
  audioManager.loadMusic('level1', 'music/level1.mp3');
  audioManager.playMusic('level1', 0.8);
  audioManager.loadSound('chest', 'sfx/chest.mp3');
  audioManager.playSound('chest', 1.0);
  ```
- Volumes: effective = `masterVolume * musicVolume * requestedVolume` for music; `masterVolume * sfxVolume * requestedVolume` for SFX.
- Helpers: `setMasterVolume`, `setMusicVolume`, `setSfxVolume`, `toggleMute`, `isMusicPlaying(id)`.

---
## AudioController
- Reads defaults from `AudioConfig` and writes them to UI sliders on startup.
- Listens to slider/button changes to call `AudioManager` setters.
- Applies ducking for pause/menu when asked (via GameStateManager flows).

---
## AudioService (used in scenes)
- Exposes `playMusic(id, volume)`, `playSound(id, volume)`, `stopAllMusic()`, `setMaster/setMusic/setSfx`, `getMusicVolume()`.
- Available via `game.services.audio` and `ctx.audio` in scenes.

---
## Modal Scenes (battle/cutscene) Behavior
- Battle: `Game.startBattle` stops current music or plays battle track.
- Cutscene: `CutsceneScene` ducks current music (`setMusicVolume(current*0.7)`) and restores on exit.

---
## Adding New Audio
1) Place files under `game/music/` or `game/sfx/`.
2) Load them at startup or lazily:
   ```js
   audioManager.loadSound('laser', 'sfx/laser.wav');
   ```
3) Play by id where needed.
4) Optionally add ids to `AudioConfig` for defaults.

---
## Troubleshooting
- No sound: check browser autoplay policies; call `playMusic` after user interaction; verify file path.
- Volume sliders ignored: ensure `AudioController` initialized before UI events; check config values.
- Overlapping tracks: use `stopAllMusic()` before starting exclusive music.
