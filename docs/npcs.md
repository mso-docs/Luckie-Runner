# Creating a New NPC from Scratch

This guide explains how to author new NPCs, wire them into the factory, and place them in towns, levels, or rooms. It covers coordinate basics, NPC types, and how to hook up dialogue/behavior. Minimal prior knowledge assumed.

## Core Components
- **TownPatrolNPC** (`game/scripts/npcs/TownPatrolNPC.js`): Main NPC class with patrol, idle/talk frames, dialogue hook.
- **EntityFactory** (`game/scripts/core/EntityFactory.js`): Spawns NPCs from plain data (uses `townNpc` factory helper).
- **TownManager** (`game/scripts/town/TownManager.js`): Spawns/removes town NPCs when you enter/exit a town region; aligns them to ground.
- **Level/Room placement**: You can also place NPCs directly via `npcs: [{ type: 'townNpc', ... }]` in levels/rooms (bypassing towns).
- **DialogueManager** (`game/scripts/ui/DialogueManager.js` + `Dialogues.js` / `NPCDialogues.js`): Provides dialogue lines keyed by `dialogueId`.

## Coordinate Basics
- Origin `(0,0)` is top-left; X increases right, Y increases downward.
- `x`, `y` in NPC defs are top-left positions.
- TownManager auto-aligns y to the ground (platform with `type: 'ground'`) each ensure step; patrol points’ y are also aligned.

## NPC Types You Can Create
- **TownPatrolNPC-based**: Standard walking/talking town NPCs. Use `type: 'townNpc'` in data; EntityFactory builds `TownPatrolNPC`.
- **Custom NPC class**: You can add new behavior by creating your own class (e.g., `ShopGhost`, `PrincessNPC`, `BalloonNPC` already exist) and registering a new factory type.
- **Static/Setpiece NPCs**: Could be a custom subclass with no movement that only shows dialogue.

## Anatomy of a Town NPC Definition
Used in `TownsConfig.towns[].npcs` or in level/room `npcs` arrays.

```js
{
  id: 'maria',
  type: 'townNpc',           // factory key
  name: 'Maria',
  sprite: 'art/sprites/maria.png',
  width: 48,
  height: 70,
  frames: 4,
  idleFrame: 1,
  walkFrames: [2, 3],
  talkFrames: [0, 1],
  dialogueId: 'npc.maria',   // key into Dialogues/NPCDialogues
  speed: 35,                 // patrol speed (px/sec)
  pauseMs: 40,               // idle pause between patrol steps
  x: 8800,                   // start x; y auto-aligns to ground
  patrol: [ { x: 8700 }, { x: 9100 } ] // patrol points; y auto-filled to ground
}
```

### Field Explanations
- `id`: Identifier for your NPC instance.
- `type`: Factory key. `townNpc` builds `TownPatrolNPC`; custom types need factory registration.
- `name`: Display name (not always shown; useful for debugging/logs).
- `sprite`: Sprite sheet path.
- `width`/`height`: Sprite display/collision size.
- `frames`: Total frames in the sheet.
- `idleFrame`: Frame index when standing.
- `walkFrames`: Frame indices cycled during walking.
- `talkFrames`: Frames used while talking.
- `dialogueId`: Looks up lines in `Dialogues.js` / `NPCDialogues.js`.
- `speed`: Horizontal patrol speed.
- `pauseMs`: Idle time between patrol legs.
- `x`, `y`: Start position. TownManager adjusts `y` to ground.
- `patrol`: Array of points `{ x, y? }`. TownManager overwrites `y` to ground height, keeping NPC on terrain.

## Step 1: Create/Choose the NPC Class
### Using TownPatrolNPC (recommended starting point)
No code needed; just supply data with `type: 'townNpc'`. EntityFactory’s `townNpc` helper builds `TownPatrolNPC` and assigns the game.

### Creating a Custom NPC Class
Place it under `game/scripts/npcs/YourNPC.js`.

```js
// game/scripts/npcs/BardNPC.js
class BardNPC extends TownPatrolNPC {
  constructor(game, def = {}) {
    super(game, def);
    this.type = 'bard';
    this.songId = def.songId || 'bard_theme';
  }

  update(deltaTime) {
    super.update(deltaTime);
    // Custom behavior: sing when player is near
    const player = this.game?.player;
    if (player && Math.abs(player.x - this.x) < 200) {
      this.sing();
    }
  }

  sing() {
    const audio = this.game?.services?.audio || this.game?.audioManager;
    if (audio?.playSound) audio.playSound(this.songId, 0.8);
    this.frameIndex = this.talkFrames?.[0] ?? this.frameIndex;
  }
}

if (typeof window !== 'undefined') window.BardNPC = BardNPC;
if (typeof module !== 'undefined' && module.exports) module.exports = BardNPC;
```

### Register Custom Type in EntityFactory
Add a builder so `{ type: 'bard', ... }` spawns `BardNPC`.

```js
// in EntityFactory.bootstrapDefaults or a custom registration block
this.registerType('bard', (def) => {
  const npc = new BardNPC(this.game, def);
  return npc;
});
```

Ensure the script is loaded before use (add `<script src="scripts/npcs/BardNPC.js"></script>` in `index.html` or bundle it).

## Step 2: Wire Dialogue
- Add dialogue lines keyed by `dialogueId` in `game/scripts/dialogue/Dialogues.js` or `NPCDialogues.js`.
- Example:
```js
window.Dialogues = window.Dialogues || {};
window.Dialogues['npc.maria'] = [
  "Welcome to Beachside!",
  "The boba shop is just ahead."
];
```
- TownManager/DialogueManager uses `dialogueId` when the player interacts.

## Step 3: Place NPCs
### In a Town (preferred)
Add to `TownsConfig.towns[].npcs`:
```js
npcs: [
  { id: 'maria', type: 'townNpc', sprite: 'art/sprites/maria.png', width: 48, height: 70, frames: 4,
    idleFrame: 1, walkFrames: [2,3], talkFrames: [0,1], dialogueId: 'npc.maria',
    speed: 35, pauseMs: 40, x: 8800, patrol: [{ x: 8700 }, { x: 9100 }] }
]
```
TownManager spawns them when the town loads and realigns y to ground.

### Directly in Levels/Rooms
Add to `npcs` array in a level/room descriptor:
```js
npcs: [
  { type: 'townNpc', id: 'cave_guard', x: 1200, y: 760, dialogueId: 'npc.guard' }
]
```
Note: Without TownManager, y is **not** auto-aligned; set `y` where you want the NPC to stand (top-left). Ensure a ground/platform is at that y or the NPC will fall to the next surface.

## Interaction and Range
- Interaction uses the same input as chests/signs (Enter/E).
- TownManager finds nearby talkable NPCs via `uiManager.getNearbyTalkableNpc()`; ensure the player is within the interaction radius (handled in UIManager/NPC logic).

## Sprite and Animation Notes
- Spritesheets should match `width/height` and `frames`.
- `frameDirection`: TownPatrolNPC assumes vertical strips by default; if horizontal, set `frameDirection` on the NPC definition.
- `walkFrames` and `talkFrames` should exist within `[0, frames-1]`.

## Behavior Customization Tips
- **Patrol**: Provide two or more points to make the NPC walk back and forth.
- **Stationary**: Omit `patrol` or set identical points; speed can stay low.
- **Special actions**: Override `update` in a subclass (e.g., singing, trading, quest giving).
- **Interaction responses**: In `onInteract` (override in subclass) to trigger custom UI or quests.

## Checklist
1) Decide: use `townNpc` (TownPatrolNPC) or create a subclass for custom behavior.
2) If custom: add `game/scripts/npcs/YourNPC.js` and register a factory type in `EntityFactory`.
3) Load NPC scripts in `index.html` (or bundler) before they are instantiated.
4) Add dialogue entries keyed by `dialogueId`.
5) Place NPCs in `TownsConfig.towns[].npcs` (preferred) or level/room `npcs` arrays.
6) Test interaction, patrol, alignment, and dialogue with debug overlays as needed.

## Troubleshooting
- **NPC doesn’t appear**: Verify `type` matches factory registration; script is loaded; x/y are within level bounds.
- **Floating/sinking**: In towns, check ground platform height; in levels/rooms, set y to ground top or add auto-alignment in your subclass.
- **No dialogue**: Confirm `dialogueId` exists in `Dialogues/NPCDialogues`; ensure interaction radius is reached.
- **Animation wrong**: Check `frames`, `walkFrames`, `talkFrames`, `frameDirection`, and sprite dimensions.
- **Custom type not created**: Ensure `registerType` is called, and the class name is in scope (global or imported).
