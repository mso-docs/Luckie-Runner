# Battle Screen and Cutscene Frameworks (Design + Implementation Plan)

Battle and cutscene are new scene types, not levels or rooms. They should live alongside your existing world modes (menu/play/room) and swap in/out cleanly. This plan lists what to build for each framework and how to integrate them without coupling to overworld rendering.

---
## High-Level Approach
- Treat **battle** and **cutscene** as first-class scenes managed by `SceneManager` (or `GameStateManager`), parallel to `level`/`room`.
- Each has its own renderer/UI and data definitions but reuses shared services (AudioManager, InputManager, UIManager, DialogueManager).
- Preserve modularity: on enter, capture current world state and pause its systems; on exit, restore state and resume music/controls.

---
## Battle Framework (New Battle Scene)

### What to Build
1) **Battle data definition:** Declarative setup for a fight (participants, arena art, music, mode/turn order, UI flags).
   ```js
   const battleDef = {
     id: 'slime_intro',
     background: { src: 'art/bg/battle/arena.png', size: { w: 800, h: 600 } },
     playerParty: [{ type: 'player', hp: 100, skills: ['strike'] }],
     enemyParty: [{ type: 'Slime', hp: 30 }],
     mode: 'turn', // or 'real-time'
     music: { id: 'battle1', volume: 0.9 },
     ui: { showTurnOrder: true, showActions: true }
   };
   ```
2) **BattleScene (new class):** Owns battle update/render loop, input routing, and state machine (start -> player/enemy turns -> resolve -> win/lose).
3) **BattleManager:** Coordinates flow (turn order, AI decisions, damage resolution), handles entry/exit hooks (pause overworld music, apply rewards, drop back to previous scene).
4) **BattleRenderer:** Draws arena background, actors/animations, and HUD (HP bars, action menu, target highlights).
5) **Actor adapters:** Thin wrappers to map player/enemy data into battle stats/animations; can reuse sprites or battle-specific art.
6) **Battle UI layer:** DOM/canvas overlay for actions/targets/turn order; connect to InputManager for keyboard/mouse/gamepad.
7) **Scene registration:** Register `battle` with `SceneManager` and provide a launcher that accepts a `battleDef` and captures prior world state.

### Integration Points
- **Entry:** From overworld/room, call a battle launcher that snapshots world state, pauses overworld input/audio, and switches to `battle` with a definition.
- **Exit:** On win/lose/escape, stop/duck battle music, grant rewards, then restore the previous scene/world and its audio.
- **Input isolation:** While in battle, ignore overworld movement and route input only to battle UI/actions.

---
## Cutscene Framework (New Cutscene Scene or Overlay)

### What to Build
1) **Cutscene script data:** Ordered steps describing actions (dialogue, camera pan, animations, waits, audio, scene change).
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
   ```
2) **CutscenePlayer (new class):** Executes steps sequentially; handles timing, skip/advance, optional branching, and completion callbacks.
3) **CutsceneScene or overlay mode:** Either a dedicated `cutscene` scene registered with `SceneManager` or an overlay flag that locks player controls while steps run.
4) **Renderer/effects:** Camera pans, fades, letterboxing, on-screen prompts; reuse `DialogueManager`/`SpeechBubble` for text steps.
5) **Input handling:** Allow advance/skip via InputManager (Enter/Space/gamepad), with per-step or global skippable rules.
6) **Scene registration:** If using a scene, register `cutscene`; if overlay, gate the main update loop while the cutscene is active.

### Integration Points
- **Entry:** Trigger from events (level start, boss door, item pickup). Snapshot control state; pause player actions and optionally duck music.
- **Exit:** Restore controls/world state and resume prior music; notify caller so gameplay can continue or transition elsewhere.
- **Dialogue:** Use existing dialogue/bubble UI for text; add simple markup if you need speaker names or styling.

---
## Common Infrastructure Needed for Both
- **Scene registration:** Extend `SceneManager` to include `battle` and `cutscene` alongside existing modes.
- **State handoff:** Helper to capture/restore world state (player pos, room/level refs, music id, paused timers) when entering/exiting these modes.
- **Input gating:** Disable overworld input while a battle or cutscene is active; route input to the active mode only.
- **Audio transitions:** Pause/duck current track; play mode-specific music; restore prior audio on exit.
- **UI layering:** Ensure battle/cutscene UI draws over the world (or fully replaces render for battles).

---
## Suggested File Skeletons
- `game/scripts/core/scene/BattleScene.js` - battle loop/update/render, entry/exit hooks.
- `game/scripts/battle/BattleManager.js` - manages battle flow and transitions.
- `game/scripts/battle/BattleRenderer.js` - draws battle background/actors/UI.
- `game/scripts/battle/BattleDefinitions.js` - stores battle definitions (optional).
- `game/scripts/cutscene/CutscenePlayer.js` - executes cutscene steps.
- `game/scripts/cutscene/CutsceneScene.js` - dedicated scene wrapper (if not overlay).
- `game/scripts/cutscene/CutsceneScripts.js` - stores cutscene scripts (optional).

---
## High-Level Steps to Implement
1) Extend `SceneManager` to register `battle` and `cutscene` scenes.
2) Build `BattleScene` + `BattleManager` + `BattleRenderer`; add a launcher that accepts a `battleDef` and restores prior world on completion.
3) Build `CutscenePlayer` (and `CutsceneScene` if desired) to run scripts; gate input/control while active.
4) Implement UI overlays for battle actions/targets and reuse DialogueManager for cutscene text.
5) Add audio transitions (pause/duck/restore) for both modes.
6) Test flows: start battle/cutscene, complete/skip, verify world state, controls, and music are restored cleanly.

---
## Current Engine Hooks (implemented)
- Scenes registered: `battle` and `cutscene` alongside `menu`/`play`/`pause`.
- Runtime helpers on `Game`: `startBattle(def)`, `finishBattle(result)`, `startCutscene(script)`, `finishCutscene()`; they snapshot music/state, switch scenes, and restore on completion.
- Managers: `BattleManager` (queued definitions, simple loop) and `CutscenePlayer` (scripted steps, skip/advance inputs) tick and render while the corresponding state is active.
- Loop routing: `Game.onTick` dispatches to battle/cutscene update+render when the state manager reports `battle` or `cutscene`.
- Play scene resume: returning to `play` no longer rebuilds the world if a player already exists (prevents resets after pausing/battle/cutscene).

---
## Notes
- Keep both frameworks data-driven so adding battles/cutscenes does not require engine changes.
- Avoid coupling to overworld rendering; treat battle/cutscene as self-contained scenes with their own render/UI stacks.
- Reuse existing systems where possible (DialogueManager, AudioManager, EntityFactory for actor setup).
