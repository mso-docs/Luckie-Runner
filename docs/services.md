# Services Overview (What They Are and What They Do)

This guide lists the core services available in the game and what each does. It assumes no prior knowledge.

---
## Services Created in Game.js
Built in the `Game` constructor:
- `input`: `new InputService(InputManager)` — keyboard/mouse wrapper.
- `audio`: `new AudioService(AudioManager)` — music/SFX wrapper.
- `render`: `new RenderContext(canvas, ctx)` — canvas/ctx helpers (`clear()`, `width()`, `height()`).
- `persistence`: `new PersistenceService()` — storage backend.
- `reset`: `new ResetService(game)` — resets world/player/UI.
- `save`: `new SaveService(persistence)` — save/load operations.
- `eventBus`: `new EventBus()` — pub/sub messaging.
- Plus managers outside `services`: `ProgressManager`, `AudioController`, `ServiceLocator`, etc.

Scene context exposes these so scenes can call them directly (`this.ctx.audio`, `this.ctx.services`, `this.ctx.events`).

---
## What Each Service Handles
- **InputService**: key/mouse queries, consumed by UI/gameplay. Delegates to `InputManager`.
- **AudioService**: play/stop music and sounds; set/get volumes; wraps `AudioManager`.
- **RenderContext**: normalized access to canvas and ctx; clears frame; reports size.
- **PersistenceService**: low-level storage (localStorage or similar).
- **SaveService**: higher-level save/load slot operations using PersistenceService.
- **ResetService**: wipes entities/UI and rebuilds the world to a clean state.
- **EventBus**: decoupled events; see `docs/event-bus.md`.

---
## Access Patterns
- From scenes: `this.ctx.audio.playMusic('level1', 0.8);`
- From game code: `game.services.reset.resetAll({ resetWorld: true });`
- Via locator: `game.serviceLocator.get('audio')` (if implemented) or direct `game.services.audio`.

---
## Adding a New Service
1) Implement a class (e.g., `AnalyticsService`) under `game/scripts/core/services/`.
2) Instantiate it in `Game` when building `this.services`.
3) Add it to `sceneContext` if scenes need it.
4) Optionally expose a getter on `ServiceLocator`.

---
## Troubleshooting
- Missing in scenes: ensure it is added to `sceneContext` in `Game.js`.
- Not constructed: create and assign before `SceneManager` registration.
