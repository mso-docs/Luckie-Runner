# Service Loader / Locator Guide

This guide explains how services are created, stored, and consumed via the ServiceLocator. It assumes no prior knowledge.

---
## Files and Classes
- Service locator: `game/scripts/core/ServiceLocator.js`
- Services created in `Game`: `game/scripts/Game.js`
  - `AudioService`, `InputService`, `RenderContext`, `PersistenceService`, `ResetService`, `SaveService`, `EventBus` (wrapped)

---
## How Services Are Built (Game.js)
```js
const persistence = new PersistenceService();
this.services = {
  input: new InputService(this.input),
  audio: new AudioService(this.audioManager),
  render: new RenderContext(this.canvas, this.ctx),
  persistence,
  reset: null, // set below
  save: null,  // set below
  eventBus: new EventBus()
};
this.serviceLocator = new ServiceLocator(this.services);
this.services.reset = new ResetService(this);
this.services.save = new SaveService(persistence);
```

Scene context (`sceneContext`) passes these to scenes:
```js
this.sceneContext = {
  services: this.services,
  audio: this.services.audio,
  events: this.serviceLocator.eventBus.bind(this.serviceLocator),
  renderer: this.renderer,
  // ...other helpers...
};
```

---
## Using Services in Code
- Directly from Game: `game.services.audio.playMusic('level1', 0.8);`
- From a scene: `this.ctx.audio.playSound('jump');`
- From elsewhere via locator (if injected): `locator.get('audio').playMusic('menu', 0.7);`

Input helper example:
```js
const input = this.services.input;
if (input.isKeyDown?.('space')) { /* ... */ }
```

Render context example:
```js
const render = this.services.render;
render.clear(); // clears canvas
const ctx = render.ctx;
```

---
## What Each Service Does
- `AudioService`: wraps AudioManager for music/SFX control.
- `InputService`: wraps InputManager for key/mouse queries.
- `RenderContext`: exposes canvas/ctx plus helpers `clear()`, `width()`, `height()`.
- `PersistenceService`: storage backend for saves.
- `SaveService`: higher-level save/load operations.
- `ResetService`: resets world/player/UI to a clean state.
- `EventBus`: decoupled pub/sub (see `docs/event-bus.md`).

---
## Adding a New Service
1) Create a class (e.g., `AnalyticsService`) under `game/scripts/core/services/` or similar.
2) Instantiate it in `Game` when building `this.services`.
3) Expose it via `sceneContext` if scenes need it.
4) Optionally add a getter on `ServiceLocator`.

Example:
```js
this.services.analytics = new AnalyticsService();
this.sceneContext.analytics = this.services.analytics;
```

---
## Troubleshooting
- Service undefined: ensure it’s constructed before `SceneManager` is created so `sceneContext` sees it.
- Not available in scenes: add it to `sceneContext` in `Game.js`’s constructor.
