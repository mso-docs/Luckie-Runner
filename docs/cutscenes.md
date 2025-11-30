# Cutscene System (Scene + Player) Guide

Classes covered explicitly:
- `CutsceneScene` — `game/scripts/core/scene/CutsceneScene.js`
- `CutscenePlayer` — `game/scripts/cutscene/CutscenePlayer.js` (instance is `game.cutscenePlayer`)
- Scene/state glue: `SceneManager` (`game/scripts/core/SceneManager.js`) and `GameStateManager` (`game/scripts/core/GameStateManager.js`)
- Entry helpers on `Game` (`game/scripts/Game.js`) via `startCutscene` / `finishCutscene`

This document covers how cutscenes are scripted, started, updated, and rendered. It lists file locations, variable names, and code you can paste directly.

---
## Files and Locations
- Cutscene scene: `game/scripts/core/scene/CutsceneScene.js`
- Cutscene player: `game/scripts/cutscene/CutscenePlayer.js`
- Scene/state helpers: `game/scripts/Game.js`, `game/scripts/core/GameStateManager.js`, `game/scripts/core/SceneManager.js`
- (Optional) Script registry: create `game/scripts/cutscene/CutsceneScripts.js` to store named scripts.

---
## Cutscene Flow
1) Call `game.startCutscene(script)` from gameplay code or the console.
2) Game snapshots prior scene/state/music, sets state to `cutscene`, and switches to the `cutscene` scene.
3) `CutsceneScene.enter()` ducks music slightly and starts the queued script.
4) `Game.onTick()` routes updates/renders to `CutscenePlayer` while state is `cutscene`.
5) `CutscenePlayer` executes steps sequentially; on completion or skip, it calls `onComplete`, which triggers `game.finishCutscene()`.
6) `finishCutscene` restores the previous scene/state/music via `resumePreviousScene()`.

---
## Cutscene Script Shape
Minimal example:
```js
const introCutscene = {
  id: 'intro1',
  steps: [
    { action: 'playMusic', id: 'intro_theme', volume: 0.8 },
    { action: 'dialogue', lines: ['Welcome to Beachside!'] },
    { action: 'panCamera', to: { x: 1200, y: 600 }, duration: 2000 },
    { action: 'wait', duration: 1000 },
    { action: 'finish' }
  ],
  skippable: true
};
game.startCutscene(introCutscene);
```

Step actions supported by the current stub:
- `playMusic`: plays `id` at `volume` (uses `AudioService.playMusic`).
- `dialogue`: shows text (stored as `activeLine`); Enter/Space advances.
- `panCamera`: placeholder timer; completes after `duration` ms.
- `wait`: waits for `duration` ms.
- `finish`: ends the cutscene.

Global skip: if the step or script has `skippable: true`, Esc skips to the end.

---
## Start/Finish API
Path: `game/scripts/Game.js`
```js
// Start
game.startCutscene(scriptObject);
// Finish manually (if needed)
game.finishCutscene();
```

`startCutscene` effects:
- Calls `captureSceneReturnInfo()`.
- Queues script via `cutscenePlayer.queue(script)`.
- Hooks `cutscenePlayer.onComplete = () => this.finishCutscene()`.
- Sets state to `cutscene` and switches to `cutscene` scene.
- Restarts the loop with `running = true`.

`finishCutscene` effects:
- Clears pending script, stops the player, and calls `resumePreviousScene()` (restores scene/state/music and restarts loop).

---
## CutsceneScene Lifecycle
Path: `game/scripts/core/scene/CutsceneScene.js`
```js
class CutsceneScene {
  attach(ctx) { this.ctx = ctx; }
  enter() {
    const audio = this.ctx?.audio || this.ctx?.services?.audio;
    this.ctx.setRunning?.(true);
    this.ctx.stateManager?.setState?.(this.ctx.stateManager?.states?.CUTSCENE || 'cutscene');
    // Duck music while in cutscene
    if (audio?.setMusicVolume) {
      const current = audio.getMusicVolume ? audio.getMusicVolume() : 1;
      audio._cutsceneRestoreVolume = current;
      audio.setMusicVolume(current * 0.7);
    } else if (audio?.setMusic) {
      const current = audio.getMusic ? audio.getMusic() : 1;
      audio._cutsceneRestoreVolume = current;
      audio.setMusic(current * 0.7);
    }
    this.ctx.cutscenePlayer?.start();
  }
  exit() {
    const audio = this.ctx?.audio || this.ctx?.services?.audio;
    if (audio && audio._cutsceneRestoreVolume) {
      if (audio.setMusicVolume) audio.setMusicVolume(audio._cutsceneRestoreVolume);
      else if (audio.setMusic) audio.setMusic(audio._cutsceneRestoreVolume);
      audio._cutsceneRestoreVolume = null;
    }
  }
}
```
Key variables this scene uses:
- `ctx.stateManager.states.CUTSCENE` — the cutscene state token set on enter.
- `ctx.cutscenePlayer` — injected player instance (`game.cutscenePlayer`).
- `ctx.setRunning(true)` — ensures the loop runs during cutscene playback.
- `audio._cutsceneRestoreVolume` — temp storage to restore volume on exit.

---
## CutscenePlayer Behavior (stub)
Path: `game/scripts/cutscene/CutscenePlayer.js`

Key fields:
- `current`: active script.
- `currentIndex`: step pointer.
- `timer`: for wait/pan steps.
- `activeLine`: current dialogue text.
- `isRunning`: boolean flag.
- `queuedScript`: pending script before start.
- `onComplete`: callback invoked when done/skip.

Public methods:
- `queue(script)` store script.
- `start(script)` begin playback (uses queued if none).
- `finish()` stop and call `onComplete`.
- `nextStep()` advance index; finishes at end.
- `update(dt, input)` drives steps; Enter/Space advances dialogue, Esc skips if allowed.
- `render(renderCtx)` draws simple letterbox bars and text prompts on the canvas.

Render contract:
```js
const renderCtx = game.getRenderService(); // { ctx, canvas, clear(), width(), height() }
cutscenePlayer.render(renderCtx);
```

---
## Extending the Cutscene System
Where to add features:
- Camera control: implement real camera tweening in the `panCamera` case of `update`.
- Dialogue UI: route dialogue steps to `DialogueManager` / `SpeechBubble` instead of the stub text render.
- Actions: add more step types (`spawn`, `fade`, `shakeCamera`, `runFunction`, `setFlag`, `startBattle`).
- Skipping rules: per-step `skippable: false` or global lockouts.
- Persistence: store scripts in `game/scripts/cutscene/CutsceneScripts.js` and reference by id.

---
## Testing a Cutscene Quickly
Run this in the browser console:
```js
game.startCutscene({
  id: 'debug_cutscene',
  steps: [
    { action: 'dialogue', lines: ['Hello from a cutscene!'] },
    { action: 'wait', duration: 1000 },
    { action: 'finish' }
  ]
});
```
Use Enter/Space to advance or Esc to skip; you should return to the prior scene with music restored.
