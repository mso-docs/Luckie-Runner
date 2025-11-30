# Scenes Guide (Menu, Play, Pause, Battle, Cutscene)

Classes described here (with paths):
- `SceneManager` — `game/scripts/core/SceneManager.js`
- `GameStateManager` — `game/scripts/core/GameStateManager.js`
- `MenuScene`, `PlayScene`, `PauseScene`, `BattleScene`, `CutsceneScene` — `game/scripts/core/scene/*.js`
- Scene-aware loop helpers in `game/scripts/Game.js`

---
## Core Files
- Scene manager: `game/scripts/core/SceneManager.js`
- Scene definitions: `game/scripts/core/scene/*.js`
  - `MenuScene.js`, `PlayScene.js`, `PauseScene.js`, `BattleScene.js`, `CutsceneScene.js`
- State manager: `game/scripts/core/GameStateManager.js`
- Scene-aware game loop and helpers: `game/scripts/Game.js`

---
## How SceneManager Works
Path: `game/scripts/core/SceneManager.js`

Key fields:
- `scenes`: map of name -> scene instance.
- `current`, `currentName`: active scene instance/name.
- `previous`, `previousName`: last scene instance/name.

Lifecycle:
```js
const mgr = new SceneManager(game, context);
mgr.register('play', new PlayScene());
mgr.change('play'); // calls exit() on previous, then enter() on new
mgr.update(dt);     // forwards to current.update(dt)
mgr.render();       // forwards to current.render()
```

Registering attaches context if the scene implements `attach(ctx)`, so every scene can use shared helpers.

Scenes should implement:
- `attach(context)` to receive shared context (game, services, helpers).
- `enter()` called on activation.
- `exit()` called on deactivation.
- `update(dt)` optional; run per tick.
- `render()` optional; run per frame.

---
## Scene Context (what scenes can access)
Provided from `game/scripts/Game.js` when constructing `SceneManager`:
```js
this.sceneContext = {
  game: this,
  stateManager: this.stateManager,
  audio: this.services.audio,
  services: this.services,
  systems: this.systems,
  renderer: this.renderer,
  progress: this.progress,
  events: this.serviceLocator.eventBus.bind(this.serviceLocator),
  resetAll: (opts) => this.resetAll(opts),
  initializeGameSystems: () => this.initializeGameSystems(),
  startLoop: () => this.startLoop(),
  stopLoop: () => this.stopLoop(),
  onTick: (dt, info) => this.onTick(dt, info),
  render: () => this.render(),
  setRunning: (val) => { this.running = val; },
  getGameTime: () => this.gameTime,
  ensureTitleMusicPlaying: () => this.ensureTitleMusicPlaying(),
  battleManager: this.battleManager,
  cutscenePlayer: this.cutscenePlayer,
  startBattle: (def) => this.startBattle(def),
  finishBattle: (result) => this.finishBattle(result),
  startCutscene: (script) => this.startCutscene(script),
  finishCutscene: () => this.finishCutscene(),
  resumePreviousScene: () => this.resumePreviousScene?.(),
  getRenderService: () => this.getRenderService()
};
```

Use `this.ctx` inside a scene after `attach(ctx)` to access these.

---
## Registered Scenes (default)
Set up in `Game.init()` (`game/scripts/Game.js`):
```js
this.sceneManager.register('menu', new MenuScene());
this.sceneManager.register('play', new PlayScene());
this.sceneManager.register('pause', new PauseScene());
this.sceneManager.register('battle', new BattleScene());
this.sceneManager.register('cutscene', new CutsceneScene());
this.sceneManager.change('menu');
```

---
## GameStateManager (states + shortcuts)
Path: `game/scripts/core/GameStateManager.js`

States: `menu`, `playing`, `paused`, `battle`, `cutscene`, `gameOver`, `victory`.

Helpers:
- `setState(newState)`, `getState()`, `isState(state)`
- Convenience: `isPlaying()`, `isPaused()`, `isBattle()`, `isCutscene()`
- `allowsSimulation()` -> true during play/battle/cutscene.
- Menu helpers: `showMenu(id)`, `hideAllMenus()`
- Game flow: `startGame()`, `pauseGame()`, `resumeGame()`, `returnToMenu()`, `restartGame()`, `gameOver()`, `victory()`

It also stores `previousState` and minimal run stats for end screens.

Example usage (pause/resume):
```js
if (stateManager.isPlaying()) {
  stateManager.pauseGame(); // switches scene to pause, ducks audio
} else if (stateManager.isPaused()) {
  stateManager.resumeGame(); // switches scene back to play
}
```

### GameStateManager Details
- Constructor: `new GameStateManager(gameInstance)` stores `game`, initializes `currentState = 'menu'`, `previousState = null`, and `states` enum-like object:
  ```js
  this.states = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    BATTLE: 'battle',
    CUTSCENE: 'cutscene',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
  };
  ```
- Fields:
  - `currentState`: active logical state string (not the scene name, though usually aligned).
  - `previousState`: last state string.
  - `lastRunStats`: `{ score, coins }` cached on game over/victory.
- Core methods:
  - `setState(newState)`: validates against `states` values, stores `previousState`, sets `currentState`, and mirrors to `game.currentStateLabel`.
  - `getState()`: returns `currentState`.
  - `isState(state)`: exact comparison helper.
  - Convenience: `isPlaying()`, `isPaused()`, `isBattle()`, `isCutscene()`, `isInMenu()`.
  - `allowsSimulation()`: true when play/battle/cutscene (loop should tick).
- Flow methods (side effects):
  - `startGame()`: sets state to playing, swaps scene to `play` (if SceneManager exists), rebuilds world (legacy path), starts loop, plays level music, autosaves.
  - `pauseGame()`: only from playing; sets state paused, swaps to `pause` scene (or shows menu), ducks music volume.
  - `resumeGame()`: only from paused; sets state playing, swaps back to `play`, restores music volume.
  - `returnToMenu()`: captures run stats, sets state menu, stops loop, saves progress, resets game, shows start menu, plays title music.
  - `restartGame()`: resets world and calls `startGame()`.
  - `gameOver()` / `victory()`: capture stats, stop loop, update end-screen UI, reset game, show end menu, play sounds.
  - `handleKeyboardShortcuts(key)`: toggles pause on Escape/P, restarts after end states on R.
- Menu helpers:
  - `showMenu(menuId)`: hides all menus, shows target, plays menu enter sound.
  - `hideAllMenus()`: hides all menus, plays menu exit sound if something was visible.
- Audio expectations:
  - Uses `game.getAudio()` (AudioService/AudioManager) for ducking/restoring music inside pause/resume/victory/game over flows.

Typical integration points:
- Scenes call `stateManager.setState(stateManager.states.PLAYING)` (or BATTLE/CUTSCENE) on enter.
- Game loop consults `stateManager.isPlaying()/isBattle()/isCutscene()` to decide which subsystem to tick.
- Input shortcuts can delegate to `handleKeyboardShortcuts(e.key)`.

---
## Loop Routing
Path: `game/scripts/Game.js`, method `onTick(deltaTime, info)`
```js
if (this.stateManager.isPlaying()) {
  this.update(deltaTime);
  this.render();
} else if (this.stateManager.isBattle()) {
  this.battleManager?.update(deltaTime, this.input);
  this.battleManager?.render(this.getRenderService());
} else if (this.stateManager.isCutscene()) {
  this.cutscenePlayer?.update(deltaTime, this.input);
  this.cutscenePlayer?.render(this.getRenderService());
}
```
`PlayScene.render/update` are handled indirectly via `Game.update/render`.

---
## Entering and Exiting Scenes
Typical transitions:
- Menu -> Play: `stateManager.startGame()` or `sceneManager.change('play')`.
- Play -> Pause: `stateManager.pauseGame()` -> `sceneManager.change('pause')`.
- Play -> Battle: `game.startBattle(def)` (captures state, swaps scene/state).
- Play -> Cutscene: `game.startCutscene(script)` (captures state, swaps scene/state).
- Battle/Cutscene -> return: `game.finishBattle(result)` / `game.finishCutscene()` call `resumePreviousScene()`.

State restoration:
- `Game.captureSceneReturnInfo()` stores previous scene/state + music id/volume.
- `Game.resumePreviousScene()` reapplies music and switches back to stored scene/state, restarts the loop, and clears the snapshot.

---
## Minimal Scene Example
Path suggestion: `game/scripts/core/scene/MyScene.js`
```js
class MyScene {
  attach(ctx) { this.ctx = ctx; }
  enter() { console.log('MyScene enter'); }
  exit() { console.log('MyScene exit'); }
  update(dt) { /* per-frame logic */ }
  render() { /* draw or delegate to renderer */ }
}
// Registration
this.sceneManager.register('myScene', new MyScene());
this.sceneManager.change('myScene');
```

---
## Notes and Watchouts
- Keep scenes self-contained: avoid mutating unrelated state without restoring it.
- Use `this.ctx.setRunning(false)` inside pause-like scenes to stop the loop, or `true` to resume.
- `PlayScene` now checks for an existing player/world; if present, it resumes instead of rebuilding (important when returning from battle/cutscene).
- Audio: use `this.ctx.audio.playMusic(id, volume)` inside scenes; battle/cutscene helpers already duck/stop and restore.

---
## Quick References by Class
- `SceneManager`: registers scenes, tracks `currentName/previousName`, calls `enter/exit/update/render`.
- `GameStateManager`: owns logical game states and menu/show helpers.
- `BattleScene`: sets state to battle, starts `battleManager`, stops previous music.
- `CutsceneScene`: sets state to cutscene, ducks music, starts `cutscenePlayer`, restores volume on exit.
- `PlayScene`: resumes existing world if present; otherwise rebuilds via `resetAll` + `initializeGameSystems`.
