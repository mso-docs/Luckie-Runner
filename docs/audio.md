# Audio: Adding New Music/SFX and How the Audio System Works

This guide explains how to add a new MP3 (or other audio) file, hook it up for level music and sound effects, and how the audio manager controls volume/settings. It assumes minimal prior knowledge.

## Core Components
- **AudioManager** (`game/scripts/utils/AudioManager.js`): Loads, plays, pauses, and tracks music/SFX; holds volume settings.
- **AudioController** (`game/scripts/core/AudioController.js`): Bridges UI (sliders/buttons) to AudioManager; applies defaults from config.
- **UI Integration:** Pause/settings menus use sliders to adjust master/music/sfx volumes.
- **Call Sites:** TownManager, RoomManager, UIManager, Player/Enemy code, and various systems call AudioManager/AudioController to play sounds or music.

## Where to Put Your Audio Files
- Music: `game/music/your-file.mp3`
- SFX: `game/sfx/your-file.mp3` (or `.wav`, `.ogg`)
Ensure the file paths you reference match where you place them.

## Adding a New Music Track (Level or Town)
1) **Place the MP3** under `game/music/`.
2) **Load it in AudioManager**: Either preload or lazy-load. Example preload:
   ```js
   // At init time (e.g., in AudioManager.initializeGameSounds or custom init)
   audioManager.loadMusic('myLevelTheme', 'music/my-level-theme.mp3');
   ```
3) **Play it** when entering the level/town:
   ```js
   audioManager.playMusic('myLevelTheme', 0.8, { allowParallel: false, restartIfPlaying: true });
   ```
   - `id`: `'myLevelTheme'`
   - `src`: `'music/my-level-theme.mp3'`
   - `volume`: `0.0 - 1.0`
   - Options: `allowParallel` (play alongside others), `restartIfPlaying` (force restart).

4) **Hook into level/town config:**
   - Level music: set `game.currentLevelMusicId = 'myLevelTheme'` before calling `createLevel`.
   - Town music: in `TownsConfig`, set `music: { id: 'myTownTheme', src: 'music/my-town.mp3', volume: 0.9 }`.
   TownManager will load/play/fade these automatically on entry/exit.

5) **Room music:** In a room descriptor, set:
   ```js
   music: { src: 'music/my-room.mp3', volume: 0.8 }
   ```
   RoomManager/AudioManager will pause level/town music and play this while inside.

## Adding a New SFX
1) **Place the file** under `game/sfx/your-sound.mp3`.
2) **Load it** (optional preload):
   ```js
   audioManager.loadSound('doorOpen', 'sfx/door-open.mp3');
   ```
3) **Play it** where needed:
   ```js
   audioManager.playSound('doorOpen', 0.7);
   ```
   - `id`: `'doorOpen'`
   - `src`: `'sfx/door-open.mp3'`
   - `volume`: `0.0 - 1.0`

## Example: New Level Music via Config + Code
```js
// During init
audioManager.loadMusic('forestTheme', 'music/forest-theme.mp3');

// Before creating level
game.currentLevelMusicId = 'forestTheme';
audioManager.playMusic('forestTheme', 0.85, { allowParallel: false, restartIfPlaying: true });
```
In TownsConfig for a town inside that level:
```js
music: { id: 'forestTownTheme', src: 'music/forest-town.mp3', volume: 0.9 }
```

## Example: New SFX for Interact
```js
// Preload (optional)
audioManager.loadSound('interact', 'sfx/interact.mp3');

// On interact event
audioManager.playSound('interact', 0.8);
```

## How AudioManager Works (High-Level)
- Holds dictionaries:
  - `music[id]`: HTMLAudioElement for music tracks.
  - `sounds[id]`: HTMLAudioElement for SFX.
- Provides methods:
  - `loadMusic(id, src)`, `loadSound(id, src)`: Create and store Audio elements, set `src`.
  - `playMusic(id, volume, opts)`: Sets volume (`master * musicVolume * requestedVolume`), handles looping, parallel play, restart logic.
  - `playSound(id, volume)`: One-shot SFX; volume scales by master * sfxVolume.
  - `setTrackVolume(id, volume)`: Adjusts volume of a specific track.
  - `pause/stop` helpers (called by managers during transitions).
- Volume application: Effective volume = `masterVolume * categoryVolume * requestedVolume`.

## How AudioController Works
- Reads defaults from config (`game/scripts/core/config/AudioConfig.js`) or game settings.
- Wires UI sliders/buttons (pause/settings menu) to:
  - `setMasterVolume(value)`
  - `setMusicVolume(value)`
  - `setSfxVolume(value)`
  - `toggleMute()`
- Updates AudioManager’s internal volume factors and refreshes UI labels.
- `applyConfigDefaults()` and `updateUI()` sync current settings to sliders and the audio system.

## Volume and Settings (UI)
- Sliders in pause/settings menu control:
  - **Master Volume:** Overall multiplier.
  - **Music Volume:** Music-only multiplier.
  - **SFX Volume:** Sound effects multiplier.
- UI reflects percentages; AudioController converts to `0.0 - 1.0` floats for AudioManager.

## Adding Your Track/SFX to the Game Flow
- **Level music:** Set `game.currentLevelMusicId` and preload/load the track; World/Town/Room managers will fade/pause as you enter/exit towns/rooms.
- **Town music:** Define in `TownsConfig` (`music { id, src, volume }`).
- **Room music:** Add `music` object to room descriptor.
- **UI/Interaction SFX:** Call `audioManager.playSound('id')` in event handlers (interact, jump, door, chest open).
- **Combat SFX:** Play in damage/hit/attack handlers (e.g., in Enemy/Player/Projectile code).

## Troubleshooting
- **No sound:** Check browser autoplay policies (may require user interaction first). Verify paths and ids match. Ensure volume sliders are not at 0 or muted.
- **Track doesn’t stop:** Ensure transitions (RoomManager/TownManager) set other tracks’ volume to 0 or pause them; use `allowParallel: false` where appropriate.
- **Volume too loud/quiet:** Adjust per-track volume in the `playMusic`/`music` object or the category sliders.
- **Missing file:** Confirm the file exists under `music/` or `sfx/` and the `src` matches exactly.

## Quick Checklist
1) Add your MP3 to `game/music/` (for music) or `game/sfx/` (for SFX).
2) Call `audioManager.loadMusic/loadSound('id', 'path')`.
3) Play via `playMusic('id', volume, opts)` or `playSound('id', volume)` in the right event/entry flow.
4) For level music, set `game.currentLevelMusicId` and/or town/room `music` configs.
5) Verify volumes via the pause/settings menu sliders (master/music/sfx).
6) Test transitions: entering/leaving towns/rooms, interacting, attacking, and UI actions.***
