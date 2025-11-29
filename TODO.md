### Refactor Checklist

- [x] Extract per-frame pipeline into `GameSystems` orchestrator (update, stats tick, game over check, camera update) and wire `Game.onTick` to it.
- [x] Move save/load snapshot logic into `ProgressManager` wrapping `SaveService` (build/apply snapshots, slot I/O).
- [x] Shift audio UI/volume controls into `AudioController` bridging `AudioService` and DOM controls.
- [x] Push dialogue/interaction handling fully into `UIManager/DialogueManager` (start/advance/hide bubble, NPC talk), with `Game` only routing signals.
- [x] Extract test-room/reset snapshot utilities into `TestRoomManager` (or extend `ResetService`) for debug mode toggles and state restore.
- [x] Create `StatsManager` to handle enemy/item events, badges/HUD updates, and stats accumulation.
- [x] Extend factories/registries to be data-driven (pluggable builders, config-driven types).
- [x] Move UI strings into `UIConfig`; centralize dialogue formatting in `DialogueManager` and keep speech/NPC/sign dialogue routed through it.
- [ ] Add more modular render targets (multi-canvas/offscreen) using `RenderTarget` abstraction.
- [ ] Hook UI/Audio responses to event bus signals for further decoupling.
