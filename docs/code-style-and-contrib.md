# Code Style & Contribution Guide

This guide summarizes preferred practices for JS style, file naming, entity registration, and a lightweight PR checklist. Adapt as needed for your team.

## JS Style
- Use clear, descriptive names. Prefer early returns over deep nesting.
- Favor plain objects for data (levels, rooms, towns) and keep them JSON-like.
- Keep functions small; extract helpers when logic grows.
- Use optional chaining (`obj?.prop`) and nullish coalescing (`??`) where appropriate.
- Comments: Add only where intent isn’t obvious; avoid narrating trivial code.
- Avoid global mutations unless intended (e.g., `window.LevelDefinitions`, `window.RoomDescriptors`).

## File Naming and Structure
- Levels: `game/scripts/levels/MyLevel.js`
- Rooms: `game/scripts/rooms/MyRoom.js`
- Town config: `game/scripts/core/config/TownsConfig.js`
- Entities: `game/scripts/enemies/*.js`, `game/scripts/items/*.js`, `game/scripts/environment/*.js`, `game/scripts/npcs/*.js`
- UI: `game/scripts/ui/*.js`
- Docs: `docs/*.md`
- Assets: `game/art/...`, `game/music/...`, `game/sfx/...`

## Entity Registration (Best Practice)
1) Define the class in its own file, loaded before the factory runs.
2) Register a `type` in `EntityFactory.bootstrapDefaults` (or similar):
   ```js
   this.registerType('my_type', (def) => {
     const e = new MyEntity(def.x ?? 0, def.y ?? 0, def);
     e.game = this.game;
     return e;
   });
   ```
3) Use the `type` in data:
   ```js
   { type: 'my_type', x: 100, y: 200, width: 50, height: 20 }
   ```
4) Ensure assets (sprites, audio) exist at the referenced paths.

## PR Checklist (Lightweight)
- [ ] Scripts load order intact (`index.html` includes new files; classes before factory/usage).
- [ ] EntityFactory registration matches the data `type` string.
- [ ] Assets added under the correct paths (`art/...`, `music/...`, `sfx/...`); paths verified.
- [ ] Levels/rooms/towns updated with the new content (if applicable).
- [ ] UI updated if controls/overlays/dialogue changed; callouts/hints reflect new keys.
- [ ] Tested locally: spawn/enter/interact; check console for errors; verify audio.
- [ ] Docs updated if new systems or patterns were introduced.

## General Contribution Tips
- Keep changes small and focused.
- Reuse existing systems (EntityFactory, Room/Town managers, UIManager) instead of duplicating logic.
- For new data-driven content, prefer adding to configs/definitions over hardcoding.
- Profile if you add large backgrounds or heavy tiling (see `docs/performance.md`).
