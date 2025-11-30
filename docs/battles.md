# Battle System (Scene + Manager) Guide

Classes covered explicitly:
- `BattleScene` — `game/scripts/core/scene/BattleScene.js`
- `BattleManager` — `game/scripts/battle/BattleManager.js` (instance is `game.battleManager`)
- Scene/state glue: `SceneManager` (`game/scripts/core/SceneManager.js`) and `GameStateManager` (`game/scripts/core/GameStateManager.js`)
- Entry helpers on `Game` (`game/scripts/Game.js`) via `startBattle` / `finishBattle`

This document explains how battles are defined, started, updated, and rendered. It includes file paths, required variables, and runnable snippets.

---
## Files and Locations
- Battle scene: `game/scripts/core/scene/BattleScene.js`
- Battle manager (logic/render stub): `game/scripts/battle/BattleManager.js`
- Scene/state wiring: `game/scripts/Game.js`, `game/scripts/core/GameStateManager.js`, `game/scripts/core/SceneManager.js`
- Definitions (optional holder): create `game/scripts/battle/BattleDefinitions.js` if you want a shared registry.

---
## Battle State Flow
1) Call `game.startBattle(battleDef)` from gameplay code or the console.
2) Game snapshots prior scene/state/music, sets state to `battle`, and switches to the `battle` scene.
3) `BattleScene.enter()` starts the queued battle and (optionally) stops/ducks music.
4) `Game.onTick()` routes updates/renders to `BattleManager` while state is `battle`.
5) `BattleManager` runs the loop; resolving calls `BattleManager.onComplete`, which triggers `game.finishBattle(result)`.
6) `game.finishBattle` restores the previous scene/state/music via `resumePreviousScene()`.

---
## Battle Definition Shape
Minimal example (JS snippet):
```js
const battleDef = {
  id: 'slime_intro',
  background: { src: 'art/bg/battle/arena.png', size: { w: 800, h: 600 } },
  playerParty: [{ type: 'player', hp: 100, skills: ['strike'] }],
  enemyParty: [{ type: 'Slime', hp: 30 }],
  mode: 'turn',           // or 'real-time'
  music: { id: 'battle1', volume: 0.9 },
  ui: { showTurnOrder: true, showActions: true }
};
game.startBattle(battleDef);
```

Notes:
- `playerParty` defaults to the player HP if omitted.
- `enemyParty` defaults to a placeholder if omitted.
- `music.src` is optional; `AudioService.playMusic(id, volume)` is used.

---
## Starting and Finishing Battles (API)
Path: `game/scripts/Game.js`
```js
// Start
game.startBattle(battleDef);
// Finish manually (if needed)
game.finishBattle({ outcome: 'win' });
```

`startBattle` effects:
- Calls `captureSceneReturnInfo()`.
- Queues the definition via `battleManager.queue(battleDef)`.
- Hooks `battleManager.onComplete = (result) => this.finishBattle(result)`.
- Sets state to `battle` and switches to `battle` scene.
- Plays battle music if provided; otherwise stops all music.
- Restarts the loop with `running = true`.

`finishBattle` effects:
- Clears pending battle, sets manager state to `resolved`, and calls `resumePreviousScene()` (restores scene/state/music and restarts loop).

---
## BattleScene Lifecycle
Path: `game/scripts/core/scene/BattleScene.js`
```js
class BattleScene {
  attach(ctx) { this.ctx = ctx; }
  enter() {
    const audio = this.ctx?.audio || this.ctx?.services?.audio;
    this.ctx.setRunning?.(true);
    this.ctx.stateManager?.setState?.(this.ctx.stateManager?.states?.BATTLE || 'battle');
    if (audio?.stopAllMusic) audio.stopAllMusic(); // duck/stop previous
    this.ctx.battleManager?.start();               // start queued def
  }
  exit() { /* handled by Game.finishBattle */ }
}
```
Key variables this scene uses:
- `ctx.stateManager.states.BATTLE` — the battle state token set on enter.
- `ctx.battleManager` — injected manager instance (`game.battleManager`).
- `ctx.setRunning(true)` — ensures the loop runs while in battle.
- `ctx.audio.stopAllMusic()` — ducks/halts previous music; battle music is started by `Game.startBattle`.

---
## BattleManager Behavior (stub)
Path: `game/scripts/battle/BattleManager.js`

Key fields:
- `activeBattle`: current definition plus runtime data.
- `state`: `"idle" | "intro" | "playerTurn" | "enemyTurn" | "resolved"`.
- `queuedDefinition`: last queued def.
- `onComplete`: callback invoked on resolve.

Public methods:
- `queue(def)` store definition.
- `start(def)` begin a battle (uses queued if none).
- `resolve(outcome)` finishes and calls `onComplete`.
- `update(dt, input)` stub loop; Enter/Interact -> win, Esc -> escape; cycles turns on timers.
- `render(renderCtx)` draws a simple background, party/enemy text, and a turn bar.

Render contract:
```js
const renderCtx = game.getRenderService(); // { ctx, canvas, clear(), width(), height() }
battleManager.render(renderCtx);
```
Key variables to know:
- `activeBattle.background`, `playerParty`, `enemyParty`, `music`, `mode`, `ui` — parsed from the definition passed to `start/queue`.
- `state` — phase string controlling behavior; extend this when adding phases.
- `onComplete` — assign to receive the resolved battle object (with `outcome`).

---
## Hook Points for a Real Battle System
Where to extend:
- Turn/phase logic: inside `BattleManager.update`.
- Actor models/adapters: add a file like `game/scripts/battle/Actors.js` or enrich `BattleManager` with stat handling.
- Rendering: replace the stub in `BattleManager.render` with sprite/animation drawing; or create `BattleRenderer.js` and call it from `update/render`.
- UI: wire DOM/canvas UI for actions and targets; connect to `InputManager` (passed in as `input` to `update`).
- Rewards/XP: in `finishBattle(result)`, grant loot/XP before calling `resumePreviousScene()`.
- Audio: adjust enter/exit hooks to crossfade rather than hard stop.

---
## Testing a Battle Quickly
Open the browser console after the game loads and run:
```js
game.startBattle({
  id: 'debug_fight',
  enemyParty: [{ type: 'Ghost', hp: 50 }],
  music: { id: 'battle1', volume: 0.9 }
});
```
Then press Enter to win or Esc to escape; you should return to the prior scene with music restored.
