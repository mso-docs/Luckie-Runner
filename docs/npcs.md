# Creating a New NPC from Scratch

This guide explains how to author new NPCs, wire them into the factory, and place them in towns, levels, or rooms. It covers coordinate basics, NPC types, and how to hook up dialogue/behavior. Minimal prior knowledge assumed.

## Core Components
- **BaseNPC** (`game/scripts/npcs/BaseNPC.js`): Base class for all NPCs with common functionality (dialogue, facing, proximity detection).
- **GenericNPC** (`game/scripts/npcs/GenericNPC.js`): Configurable NPC for static/animated characters (Princess, Balloon Fan, Shop Ghost).
- **TownPatrolNPC** (`game/scripts/npcs/TownPatrolNPC.js`): Patrolling NPC class for town characters that walk back and forth.
- **EntityFactory** (`game/scripts/core/EntityFactory.js`): Spawns NPCs from plain data or creates them programmatically.
- **TownManager** (`game/scripts/town/TownManager.js`): Spawns/removes town NPCs when you enter/exit a town region; aligns them to ground.
- **Level/Room placement**: You can also place NPCs directly via `npcs: [{ type: 'townNpc', ... }]` in levels/rooms (bypassing towns).
- **DialogueManager** (`game/scripts/ui/DialogueManager.js` + `Dialogues.js` / `NPCDialogues.js`): Provides dialogue lines keyed by `dialogueId`.

## Where to Configure NPCs

### Town NPCs (Patrolling Characters)
**Location:** `game/scripts/core/config/TownsConfig.js`

Configure in the `towns` array under the `npcs` property:
```js
npcs: [
    {
        id: 'mike',
        type: 'townNpc',
        name: 'Mike',
        sprite: 'art/sprites/mike.png',
        width: 38,
        height: 63,
        frames: 4,
        idleFrame: 2,
        walkFrames: [2, 3],
        talkFrames: [0, 1],
        dialogueId: 'npc.mike',
        x: 8800,
        y: 0,  // auto-aligned to ground
        speed: 35,
        pauseMs: 40,
        spriteDefaultFacesLeft: true,  // Mike sprite faces left by default
        patrol: [{ x: 8700 }, { x: 9100 }]
    }
]
```

### Static NPCs (Princess, Balloon Fan, Shop Ghost)
**Location:** `game/scripts/core/EntityFactory.js`

Update the factory methods (around lines 49-95):
```js
princess(x, y, dialogueId = null) {
    const princess = new GenericNPC({
        id: 'princess',
        name: 'Princess',
        sprite: 'art/sprites/princess-sprite.png',  // Change sprite here
        width: 49,   // Change size here
        height: 64,
        // ... other config
    });
    princess.game = this.game;
    return princess;
}
```

**Spawn Location:** `game/scripts/core/WorldBuilder.js` in `createTestRoom()` method:
```js
// Around line 540-560
this.game.princess = this.factory.princess(2950, 145, 'princess.default');
this.game.balloonFan = this.factory.balloonFan(2950, 30, 'balloon.default');
this.game.shopGhost = this.factory.shopGhost(375, 275, 'shop.ghost');
```

### Room/Interior NPCs
**Location:** `game/scripts/core/config/TownsConfig.js` in building interior definitions:
```js
interior: {
    room: {
        npcs: [
            {
                id: 'dj_cidic',
                type: 'townNpc',
                name: 'DJ Cidic',
                sprite: 'art/sprites/dj-cidic.png',
                dialogueId: 'npc.dj_cidic',
                x: 750,
                y: 557,
                // ... other config
            }
        ]
    }
}
```

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

## Sprite Sheet Layout and Animation System

Understanding how sprite sheets work is critical for creating NPCs that animate correctly.

### Sprite Sheet Anatomy

NPCs use **tile-based sprite sheets** where each frame is a fixed-size tile arranged in a strip (horizontal or vertical).

**Horizontal Layout (Most Common):**
```
Total Image Width = frameWidth × totalFrames
Total Image Height = frameHeight

Example: 4-frame NPC at 48×70 per frame
Image dimensions: 192×70 pixels

[Frame 0][Frame 1][Frame 2][Frame 3]
 (Talk1) (Talk2) (Walk1) (Walk2)
   48px    48px    48px    48px
```

**Vertical Layout (Alternative):**
```
Total Image Width = frameWidth
Total Image Height = frameHeight × totalFrames

Example: 4-frame NPC at 48×70 per frame
Image dimensions: 48×280 pixels

[Frame 0] ← Talk1
[Frame 1] ← Talk2
[Frame 2] ← Walk1
[Frame 3] ← Walk2
   48×70 each
```

### Frame Indexing System

Frames are **zero-indexed** and read in order based on `frameDirection`:

**Horizontal (default):**
```
┌─────┬─────┬─────┬─────┐
│  0  │  1  │  2  │  3  │
└─────┴─────┴─────┴─────┘
```

**Vertical:**
```
┌─────┐
│  0  │
├─────┤
│   1  │
├─────┤
│  2  │
├─────┤
│  3  │
└─────┘
```

### Animation Frame Assignments

**Standard 4-Frame Convention:**
```
Frame 0: Talk pose 1
Frame 1: Talk pose 2
Frame 2: Walk pose 1 / Idle
Frame 3: Walk pose 2
```

Configuration:
```javascript
{
    frames: 4,
    idleFrame: 2,           // Use walk frame 1 as idle
    walkFrames: [2, 3],     // Alternate between walk poses
    talkFrames: [0, 1]      // Alternate between talk poses
}
```

**Advanced 6-Frame Layout:**
```
[Talk1][Talk2][Talk3][Idle][Walk1][Walk2]
   0      1      2      3     4      5
```

Configuration:
```javascript
{
    frames: 6,
    idleFrame: 3,
    walkFrames: [4, 5],
    talkFrames: [0, 1, 2]
}
```

**Minimal 2-Frame Layout:**
```
[Idle][Walk]
  0     1
```

Configuration:
```javascript
{
    frames: 2,
    idleFrame: 0,
    walkFrames: [0, 1],     // Bounces between both
    talkFrames: [0, 1]      // Same for talking
}
```

### Creating Your Sprite Sheet

**Step-by-Step Process:**

1. **Design individual frames** at your target size (e.g., 48×70px)
2. **Arrange frames** in a strip (horizontal recommended)
3. **Calculate total dimensions:**
   - Horizontal: `width = frameWidth × frames`, `height = frameHeight`
   - Vertical: `width = frameWidth`, `height = frameHeight × frames`
4. **Export as PNG** with transparency
5. **Place in** `game/art/sprites/`

**Example Calculation:**
```
NPC Design:
- Frame size: 50×65 pixels
- Total frames: 4
- Layout: Horizontal

Total image size:
- Width: 50 × 4 = 200 pixels
- Height: 65 pixels
- File: art/sprites/merchant.png (200×65)
```

### Frame Direction Setting

**When to use horizontal (default):**
- Most sprite editors export horizontal strips
- Easier to visualize frame order
- Standard for most game engines

**When to use vertical:**
- Tall narrow sprites
- Legacy sprite sheets
- Specific art pipeline requirements

```javascript
// Horizontal (default - no need to specify)
{ sprite: 'art/sprites/guard.png', frames: 4 }

// Vertical (must specify)
{ 
    sprite: 'art/sprites/guard-vertical.png', 
    frames: 4,
    frameDirection: 'vertical'
}
```

### Animation Timing

**Frame Duration:**
NPCs use `tileAnimationSpeed` (milliseconds per frame):

```javascript
// In TownPatrolNPC constructor
this.tileAnimationSpeed = 320;  // Walk animation speed
```

**Walk animation** (320ms per frame):
```
Frame 2 → (320ms) → Frame 3 → (320ms) → Frame 2 → ...
```

**Talk animation** (280ms per frame, faster):
```javascript
this.setTalking(true);  // Switches to talk frames at 280ms
```

**Customizing animation speed:**
```javascript
// Slower, more deliberate movement
{ speed: 25, pauseMs: 60, tileAnimationSpeed: 400 }

// Faster, energetic character  
{ speed: 50, pauseMs: 20, tileAnimationSpeed: 200 }
```

### Visual Reference: Complete NPC Sprite

```
File: art/sprites/shopkeeper.png (192×70 pixels)
┌──────────┬──────────┬──────────┬──────────┐
│          │          │          │          │
│   [0]    │   [1]    │   [2]    │   [3]    │
│  Talk1   │  Talk2   │  Idle/   │  Walk2   │
│          │          │  Walk1   │          │
│   48×70  │   48×70  │   48×70  │   48×70  │
└──────────┴──────────┴──────────┴──────────┘

Configuration:
{
    sprite: 'art/sprites/shopkeeper.png',
    width: 48,
    height: 70,
    frames: 4,
    frameWidth: 48,      // Usually same as width
    frameHeight: 70,     // Usually same as height
    frameDirection: 'horizontal',
    idleFrame: 2,
    walkFrames: [2, 3],
    talkFrames: [0, 1]
}
```

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

---

## Complete Working Examples

### Example 1: Simple Stationary Shopkeeper

**Sprite:** `art/sprites/shopkeeper.png` (192×70, 4 frames horizontal)

**NPC Configuration:**
```javascript
// In TownsConfig.towns[0].npcs array
{
    id: 'shopkeeper',
    type: 'townNpc',
    name: 'Shop Owner',
    sprite: 'art/sprites/shopkeeper.png',
    width: 48,
    height: 70,
    frames: 4,
    frameDirection: 'horizontal',
    idleFrame: 2,
    walkFrames: [2, 3],
    talkFrames: [0, 1],
    dialogueId: 'npc.shopkeeper',
    x: 8500,
    speed: 0,              // Stationary
    pauseMs: 0,
    patrol: [{ x: 8500 }], // Single point - no movement
    interactRadius: 120
}
```

**Dialogue:**
```javascript
// In NPCDialogues.js
window.NPCDialogues['npc.shopkeeper'] = [
    'Welcome to my shop!',
    'We have the *finest* goods in town.',
    'Come back anytime!'
];
```

**Result:** Shopkeeper stands at x=8500, plays idle animation, talks when player presses E nearby.

---

### Example 2: Patrolling Guard

**Sprite:** `art/sprites/guard.png` (200×80, 4 frames horizontal)

**NPC Configuration:**
```javascript
{
    id: 'town_guard',
    type: 'townNpc',
    name: 'Guard Captain',
    sprite: 'art/sprites/guard.png',
    width: 50,
    height: 80,
    frames: 4,
    frameDirection: 'horizontal',
    idleFrame: 2,
    walkFrames: [2, 3],
    talkFrames: [0, 1],
    dialogueId: 'npc.guard',
    x: 7200,
    speed: 45,                    // Moderate patrol speed
    pauseMs: 60,                  // Pause at waypoints
    patrol: [
        { x: 7000 },              // West waypoint
        { x: 7800 }               // East waypoint
    ],
    interactRadius: 110
}
```

**Dialogue:**
```javascript
window.NPCDialogues['npc.guard'] = [
    'Halt! State your business.',
    'The town is under my protection.',
    'Move along, citizen.'
];
```

**Behavior:** Guard walks between x=7000 and x=7800, pauses 60ms at each end, faces movement direction.

---

### Example 3: Fast-Moving Courier

**Sprite:** `art/sprites/courier.png` (144×60, 4 frames horizontal)

**NPC Configuration:**
```javascript
{
    id: 'courier',
    type: 'townNpc',
    name: 'Swift Courier',
    sprite: 'art/sprites/courier.png',
    width: 36,
    height: 60,
    frames: 4,
    frameDirection: 'horizontal',
    idleFrame: 2,
    walkFrames: [2, 3],
    talkFrames: [0, 1],
    dialogueId: 'npc.courier',
    x: 9000,
    speed: 80,                    // Fast movement
    pauseMs: 20,                  // Brief pauses
    patrol: [
        { x: 8500 },
        { x: 10200 }
    ],
    interactRadius: 130           // Larger radius for fast NPC
}
```

**Dialogue:**
```javascript
window.NPCDialogues['npc.courier'] = [
    '_Can\'t talk long!_ I have deliveries to make.',
    'The mail must go through!',
    '<<RUSH>> delivery in progress!'
];
```

**Behavior:** Courier moves quickly between waypoints with minimal pause, harder to catch for dialogue.

---

### Example 4: Multi-Stop Patrol Route

**NPC Configuration:**
```javascript
{
    id: 'wanderer',
    type: 'townNpc',
    name: 'Town Wanderer',
    sprite: 'art/sprites/wanderer.png',
    width: 44,
    height: 68,
    frames: 4,
    idleFrame: 2,
    walkFrames: [2, 3],
    talkFrames: [0, 1],
    dialogueId: 'npc.wanderer',
    x: 7500,
    speed: 35,
    pauseMs: 50,
    patrol: [
        { x: 7500 },              // Start/End
        { x: 8200 },              // Fountain
        { x: 9000 },              // Boba shop
        { x: 8200 }               // Back to fountain
    ],
    interactRadius: 110
}
```

**Dialogue:**
```javascript
window.NPCDialogues['npc.wanderer'] = [
    'Just enjoying a walk around town.',
    'I visit the fountain, then the shops, then back.',
    'It\'s a nice ^peaceful^ routine.'
];
```

**Behavior:** Walks in a circuit: start → fountain → shop → fountain → start (loops).

---

### Example 5: Room-Based NPC (Manual Y Positioning)

**In Room Definition:**
```javascript
// In LibraryInterior.js or room descriptor
{
    id: 'library_interior',
    width: 1024,
    height: 720,
    npcs: [
        {
            id: 'librarian',
            type: 'townNpc',
            name: 'Librarian',
            sprite: 'art/sprites/librarian.png',
            width: 45,
            height: 68,
            frames: 4,
            idleFrame: 2,
            walkFrames: [2, 3],
            talkFrames: [0, 1],
            dialogueId: 'npc.librarian',
            x: 600,
            y: 622,                // Manual Y - on ground at 690 (690 - 68)
            speed: 30,
            pauseMs: 50,
            patrol: [
                { x: 400, y: 622 },  // Y doesn't auto-align in rooms
                { x: 800, y: 622 }
            ],
            interactRadius: 120
        }
    ],
    platforms: [
        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
    ]
}
```

**Key Difference:** In rooms without TownManager, manually calculate Y positions:
- Ground platform at y=690
- NPC height: 68
- NPC y position: 690 - 68 = 622

---

### Example 6: Custom NPC with Special Behavior

**Custom Class:**
```javascript
// game/scripts/npcs/MusicianNPC.js
class MusicianNPC extends TownPatrolNPC {
    constructor(game, def = {}) {
        super(game, def);
        this.type = 'musician';
        this.songId = def.songId || 'town_music';
        this.playingMusic = false;
        this.musicCooldown = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Countdown music cooldown
        if (this.musicCooldown > 0) {
            this.musicCooldown -= deltaTime;
        }
        
        // Play music when player is nearby and cooldown expired
        const player = this.game?.player;
        if (player && !this.playingMusic && this.musicCooldown <= 0) {
            const dx = (player.x + player.width/2) - (this.x + this.width/2);
            const dy = (player.y + player.height/2) - (this.y + this.height/2);
            const dist = Math.hypot(dx, dy);
            
            if (dist < 200) {
                this.playMusic();
            }
        }
    }

    playMusic() {
        const audio = this.game?.services?.audio || this.game?.audioManager;
        if (audio?.playSound) {
            audio.playSound(this.songId, 0.6);
            this.playingMusic = true;
            this.musicCooldown = 5000; // 5 second cooldown
            
            // Switch to talk animation briefly
            const oldFrames = this.tileAnimationFrames;
            this.tileAnimationFrames = this.talkFrames;
            setTimeout(() => {
                this.tileAnimationFrames = oldFrames;
                this.playingMusic = false;
            }, 1000);
        }
    }

    setTalking(talking) {
        super.setTalking(talking);
        if (talking) {
            this.musicCooldown = 8000; // Longer cooldown when talking
        }
    }
}

if (typeof window !== 'undefined') window.MusicianNPC = MusicianNPC;
if (typeof module !== 'undefined' && module.exports) module.exports = MusicianNPC;
```

**Factory Registration:**
```javascript
// In EntityFactory.js
this.registerType('musician', (def) => {
    const npc = new MusicianNPC(this.game, def);
    return npc;
});
```

**Usage:**
```javascript
// In TownsConfig
{
    id: 'musician',
    type: 'musician',           // Custom type
    name: 'Street Musician',
    sprite: 'art/sprites/musician.png',
    width: 48,
    height: 72,
    frames: 4,
    idleFrame: 2,
    walkFrames: [2, 3],
    talkFrames: [0, 1],
    dialogueId: 'npc.musician',
    songId: 'street_song',      // Custom field
    x: 8800,
    speed: 25,
    pauseMs: 80,
    patrol: [{ x: 8700 }, { x: 8900 }]
}
```

**Dialogue:**
```javascript
window.NPCDialogues['npc.musician'] = [
    '*Music* is the soul of the town!',
    'I play songs to ~lift spirits~.',
    'Enjoy the melody, friend!'
];
```

**Behavior:** Plays a sound effect when player comes within 200px, cooldown prevents spam, talk animation triggers during music.

---

## Troubleshooting Guide

### NPC Not Appearing

**Symptom:** NPC doesn't show up in game.

**Checklist:**
- ✅ **Verify `type` registration:**
  ```javascript
  // In EntityFactory, check for:
  this.registerType('townNpc', ...);
  ```
- ✅ **Confirm script loaded:**
  ```html
  <!-- In index.html -->
  <script src="scripts/npcs/TownPatrolNPC.js"></script>
  ```
- ✅ **Check coordinates:**
  ```javascript
  // Is x within the town region?
  // Town region: { startX: 6500, endX: 11500 }
  // NPC x: 8800 ✓ (within bounds)
  ```
- ✅ **Verify town is active:**
  - Player must be between `region.startX` and `region.endX`
  - Check console for "Entered town: [townName]" message

**Debug steps:**
```javascript
// Add to TownManager after NPC spawn
console.log('Spawned NPCs:', this.game.npcs.map(n => n.id));

// Check if NPC was created
const npc = this.game.npcs.find(n => n.id === 'your_npc_id');
console.log('NPC exists:', !!npc);
if (npc) console.log('NPC position:', npc.x, npc.y);
```

---

### NPC Floating or Sinking

**Symptom:** NPC hovers above ground or sinks through floor.

**Cause:** Y position not aligned to ground platform.

**Solutions:**

**For Town NPCs (auto-aligned):**
```javascript
// Check ground platform exists and has correct type
platforms: [
    { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
    //                                        ^^^^^^^^
    //                                        Must be 'ground'
]

// TownManager looks for platforms with type: 'ground'
```

**For Room NPCs (manual positioning):**
```javascript
// Calculate correct Y
const groundY = 690;           // Ground platform Y
const npcHeight = 68;          // NPC sprite height
const correctY = groundY - npcHeight;  // 622

npcs: [{
    id: 'my_npc',
    x: 400,
    y: 622,  // Calculated position
    height: 68
}]
```

**Visual reference:**
```
Height: 720px
               ┌─────────────┐
            0  │             │
               │             │
               │    Room     │
               │             │
          622  │   [NPC]     │ ← NPC top-left (y=622)
               │    68px     │
          690  ├─────────────┤ ← Ground platform (y=690)
               │░░░░░Ground░░│
          720  └─────────────┘
```

---

### Animation Not Playing or Wrong Frames

**Symptom:** NPC stuck on one frame, wrong animation, or flickering.

**Common causes:**

**1. Frame indices out of bounds:**
```javascript
// BAD - Frame 4 doesn't exist in 4-frame sprite
{
    frames: 4,             // Frames 0-3
    walkFrames: [3, 4]     // ❌ Frame 4 is invalid!
}

// GOOD
{
    frames: 4,
    walkFrames: [2, 3]     // ✓ Both frames exist
}
```

**2. Wrong frame direction:**
```javascript
// Sprite is horizontal but config says vertical
{
    sprite: 'art/sprites/npc.png',  // 192×70 (4 frames × 48px wide)
    frameDirection: 'vertical'       // ❌ Wrong!
}

// CORRECT
{
    sprite: 'art/sprites/npc.png',
    frameDirection: 'horizontal'     // ✓ Matches sprite layout
}
```

**3. Sprite dimensions mismatch:**
```javascript
// Sprite file is 200×80, but config says 48×70
{
    sprite: 'art/sprites/guard.png',  // Actual: 200×80 (4×50px)
    width: 48,                         // ❌ Wrong
    height: 70,                        // ❌ Wrong
    frames: 4
}

// CORRECT
{
    sprite: 'art/sprites/guard.png',
    width: 50,                         // ✓ 200 ÷ 4 = 50
    height: 80,                        // ✓ Matches sprite
    frames: 4,
    frameWidth: 50,                    // Optional: explicit frame size
    frameHeight: 80
}
```

**Debug animation:**
```javascript
// Add to NPC update method temporarily
console.log('Frame:', this.frameIndex, 'Anim:', this.tileAnimationFrames);
```

---

### No Dialogue Appearing

**Symptom:** Pressing E near NPC does nothing.

**Checklist:**

**1. Dialogue is defined:**
```javascript
// In NPCDialogues.js, verify key exists
window.NPCDialogues = {
    'npc.shopkeeper': [  // ← This must match dialogueId
        'Hello!'
    ]
};
```

**2. DialogueId matches:**
```javascript
// NPC config
{
    dialogueId: 'npc.shopkeeper'  // Must match key above exactly
}
```

**3. Player is within interaction radius:**
```javascript
// Default interactRadius: 110px
{
    interactRadius: 110
}

// Increase if player can't reach
{
    interactRadius: 150  // Larger range
}
```

**4. Interaction key is correct:**
- Default: `E` key or `Enter`
- Check `InputManager` settings
- Try both keys

**Debug interaction:**
```javascript
// Add to TownPatrolNPC.isPlayerNearby
isPlayerNearby(player, radius) {
    const r = radius || this.interactRadius;
    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
    const dist = Math.hypot(dx, dy);
    console.log(`Distance to ${this.id}: ${dist.toFixed(1)}px (radius: ${r}px)`);
    return dist <= r;
}
```

---

### NPC Not Walking/Patrol Not Working

**Symptom:** NPC stands still despite having patrol points.

**Causes:**

**1. Identical patrol points:**
```javascript
// BAD - Both points are the same
patrol: [
    { x: 8800 },
    { x: 8800 }  // ❌ No movement
]

// GOOD - Different X coordinates
patrol: [
    { x: 8700 },
    { x: 8900 }  // ✓ 200px apart
]
```

**2. Speed is zero:**
```javascript
// BAD
{
    speed: 0,              // ❌ No movement
    patrol: [{ x: 100 }, { x: 500 }]
}

// GOOD
{
    speed: 40,             // ✓ Moves at 40 px/sec
    patrol: [{ x: 100 }, { x: 500 }]
}
```

**3. Only one patrol point:**
```javascript
// No patrol (stationary)
patrol: [{ x: 8800 }]

// Needs at least 2 different points to walk
patrol: [{ x: 8700 }, { x: 8900 }]
```

**4. NPC is talking:**
```javascript
// Patrol pauses during dialogue
// This is intentional behavior
// NPC resumes walking after dialogue ends
```

---

### Custom NPC Type Not Creating

**Symptom:** Console error: "Unknown entity type: myCustomNpc"

**Solution:**

**1. Register the type:**
```javascript
// In EntityFactory.bootstrapDefaults() or custom init
this.registerType('myCustomNpc', (def) => {
    const npc = new MyCustomNPC(this.game, def);
    return npc;
});
```

**2. Ensure class is in scope:**
```javascript
// Check class is loaded before EntityFactory runs
console.log('MyCustomNPC available:', typeof MyCustomNPC !== 'undefined');

// If false, add script to index.html:
// <script src="scripts/npcs/MyCustomNPC.js"></script>
```

**3. Verify class export:**
```javascript
// At end of MyCustomNPC.js
if (typeof window !== 'undefined') {
    window.MyCustomNPC = MyCustomNPC;  // ← Required for browser
}
```

---

### NPC Facing Wrong Direction

**Symptom:** NPC sprite flipped incorrectly or faces wrong way during dialogue or patrol.

**Common Causes:**
1. Patrol movement determines facing direction
2. Incorrect `spriteDefaultFacesLeft` configuration
3. Sprite assets facing unexpected direction

---

#### Patrol-Based Facing (Patrolling NPCs)

**Behavior:**
TownPatrolNPC uses the same sprite-orientation-aware logic as dialogue facing:

```javascript
// In TownPatrolNPC update loop
if (this.spriteDefaultFacesLeft) {
    this.flipX = dir > 0;  // Flip when moving right
} else {
    this.flipX = dir < 0;  // Flip when moving left
}
```

This ensures patrol facing matches the sprite's default orientation, so the NPC appears to face the direction they're walking.

**To control initial facing:**
```javascript
// Set first patrol point to desired direction
// NPC walks to nearest waypoint first
patrol: [
    { x: 8700 },  // If NPC starts at 8800, will walk left initially
    { x: 8900 }   // Then walk right
]
// Set x position and patrol to control starting direction
```

---

#### Dialogue Facing Logic (All NPCs)

**How It Works:**
All NPCs use `BaseNPC.faceToward()` during dialogue interactions:

```javascript
// In BaseNPC.js
faceToward(targetCenterX) {
    const npcCenterX = this.bounds.x + this.bounds.width / 2;
    const playerIsOnLeft = targetCenterX < npcCenterX;
    
    // Flip sprite based on default orientation
    if (this.spriteDefaultFacesLeft) {
        this.flipX = !playerIsOnLeft;  // Invert for left-facing sprites
    } else {
        this.flipX = playerIsOnLeft;   // Normal for right-facing sprites
    }
}
```

**Key Configuration:**
- `spriteDefaultFacesLeft`: Tells the system which direction your sprite asset faces in its default (non-flipped) state
- Most sprites face RIGHT by default (`spriteDefaultFacesLeft: false`)
- Some sprites face LEFT by default (`spriteDefaultFacesLeft: true`)

---

#### Fixing Facing Issues

**Problem:** NPC faces away from player during dialogue

**Solution:** Check and set correct sprite orientation

```javascript
// In GenericNPC config
const npc = new GenericNPC({
    sprite: 'art/sprites/my-npc.png',
    spriteDefaultFacesLeft: false,  // ← Set based on YOUR sprite's default
    // ... other config
});
```

**How to determine your sprite's default facing:**
1. Look at the sprite image file directly
2. If character faces RIGHT in the image → `spriteDefaultFacesLeft: false`
3. If character faces LEFT in the image → `spriteDefaultFacesLeft: true`

**Common Configurations:**
```javascript
// Most sprites (Princess, Shop Ghost, etc.)
spriteDefaultFacesLeft: false  // Sprite faces right by default

// Mike sprite (specific example)
spriteDefaultFacesLeft: true   // This sprite faces left by default
```

---

#### Default Values by NPC Type

**GenericNPC:**
```javascript
// Default changed from true to false (most sprites face right)
spriteDefaultFacesLeft: config.spriteDefaultFacesLeft ?? false
```

**TownPatrolNPC:**
```javascript
// Inherits from BaseNPC, defaults to false but can be overridden in config
spriteDefaultFacesLeft: config.spriteDefaultFacesLeft ?? false
```

**Static NPCs (EntityFactory):**
```javascript
// Princess
princess(x, y, dialogueId = null) {
    const princess = new GenericNPC({
        spriteDefaultFacesLeft: false,  // Princess sprite faces right
        // ...
    });
}

// Shop Ghost
shopGhost(x, y, dialogueId = null) {
    const ghost = new GenericNPC({
        spriteDefaultFacesLeft: false,  // Ghost sprite faces right
        // ...
    });
}
```

---

#### Debugging Facing Issues

**Step 1: Verify sprite orientation**
Open your sprite image file and note which direction it faces.

**Step 2: Check NPC configuration**
```javascript
// In TownsConfig.js or EntityFactory.js
console.log('NPC sprite:', npc.sprite);
console.log('spriteDefaultFacesLeft:', npc.spriteDefaultFacesLeft);
console.log('flipX:', npc.flipX);
```

**Step 3: Test interaction**
Talk to the NPC and verify facing direction matches player position.

**Step 4: Adjust if needed**
Toggle `spriteDefaultFacesLeft` if NPC faces wrong direction during dialogue.

---

#### Town NPCs vs Regular NPCs

**Town NPCs** (spawned by TownManager):
- Stored in `game.townNpcs` array
- UIManager checks this array first for nearby talkable NPCs
- Uses same `BaseNPC.faceToward()` logic

**Regular NPCs** (spawned by EntityFactory/WorldBuilder):
- Stored in `game.npcs` array
- UIManager checks this array second
- Uses same `BaseNPC.faceToward()` logic

Both use identical facing logic, so configuration should be consistent across all NPC types.

---

#### For Stationary NPCs with Specific Facing

```javascript
// In custom NPC class
constructor(game, def) {
    super(game, def);
    // Set initial facing if needed (overrides default)
    if (def.initialFacing) {
        this.flipX = def.initialFacing === 'left';
    }
}
```

---

### Performance Issues with Many NPCs

**Symptom:** Game slows down with multiple NPCs.

**Optimization strategies:**

**1. Reduce animation complexity:**
```javascript
// Fewer frames
frames: 2,  // Instead of 6

// Slower animation speed
tileAnimationSpeed: 400  // Instead of 200
```

**2. Limit patrol distances:**
```javascript
// Shorter patrol routes reduce path calculations
patrol: [
    { x: 8700 },
    { x: 8900 }  // 200px (good)
]
// vs
patrol: [
    { x: 7000 },
    { x: 12000 }  // 5000px (may cause issues)
]
```

**3. Use fewer NPCs in visible area:**
```javascript
// Spawn NPCs spread across town region
// Not all clustered in one spot
```

**4. Optimize sprite sizes:**
```javascript
// Smaller sprites = less memory
// 48×70 is good
// 200×300 is too large for NPCs
```

---

## NPC Behavior Patterns Reference

### Stationary Guard
```javascript
{ speed: 0, patrol: [{ x: position }], pauseMs: 0 }
```
Use for: Guards, shopkeepers, statues, fixed positions

### Slow Walker
```javascript
{ speed: 25-35, pauseMs: 60-100, patrol: [short distances] }
```
Use for: Elderly NPCs, casual wanderers, contemplative characters

### Normal Walker  
```javascript
{ speed: 35-50, pauseMs: 30-50, patrol: [medium distances] }
```
Use for: Most town NPCs, friendly characters, general population

### Fast Walker
```javascript
{ speed: 60-80, pauseMs: 10-30, patrol: [long distances] }
```
Use for: Couriers, running children, urgent messengers

### Nervous Pacer
```javascript
{ speed: 45, pauseMs: 15, patrol: [very short back-and-forth] }
```
Use for: Anxious NPCs, guards on alert, worried characters

### Circuit Walker
```javascript
{ speed: 40, pauseMs: 40, patrol: [multiple waypoints in loop] }
```
Use for: Town wanderers, inspectors, patrol routes

---

## Quick Reference: Common NPC Configurations

| NPC Type | Speed | Pause | Patrol Distance | Use Case |
|----------|-------|-------|-----------------|----------|
| Shopkeeper | 0 | 0 | None | Fixed position behind counter |
| Town Guard | 45 | 60 | 500-1000px | Patrol route |
| Wanderer | 35 | 50 | 300-800px | Casual walking |
| Courier | 75 | 20 | 1000-2000px | Fast delivery |
| Elder | 25 | 80 | 200-400px | Slow, deliberate |
| Child | 65 | 25 | 400-800px | Energetic movement |
| Merchant | 30 | 70 | 300-500px | Between stalls |
