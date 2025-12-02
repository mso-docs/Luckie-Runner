# Door System Documentation

## Overview

The door system provides automatic visual exit indicators for all interior rooms. Doors appear at room exit points, animate when the player interacts, and prevent premature exits until the animation completes. This creates a polished experience where players clearly understand where to exit and see a satisfying door-opening animation.

**Key Features:**
- Automatically renders at exit zones in ALL rooms (no per-room configuration needed)
- 2-frame sprite animation (closed → open)
- Delays room exit until door animation completes
- Scales to 2x size for better visibility
- Renders behind player so character can walk in front
- Works with any room configuration (RoomManager, legacy systems, global descriptors)

## Architecture

### Core Components

**DoorRenderer** (`game/scripts/environment/DoorRenderer.js`)
- Singleton instance managed by `Game` class
- Handles sprite loading, state management, animation timing, and rendering
- Automatically detects room state and exit coordinates from multiple sources

**Integration Points:**
1. **Game.js** - Initializes `doorRenderer` instance
2. **GameSystems.js** - Calls `doorRenderer.update(deltaTime)` every frame
3. **SceneRenderer.js** - Calls `doorRenderer.render(ctx, camera)` before player rendering
4. **RoomManager.js** - Checks `doorRenderer.canExit()` before allowing room exit

### Data Flow

```
Room Entry → RoomManager sets exit coordinates
     ↓
Every Frame → DoorRenderer.update() checks:
     • Is activeWorld.kind === 'room'?
     • Where is exit? (roomManager.room.exit || RoomDescriptors || level.exit)
     • Is player near exit?
     • Did player press Enter/E?
     ↓
If interaction → Start animation (show frame 1, start timer)
     ↓
After 500ms → Set animationComplete = true
     ↓
Player tries to exit → RoomManager checks canExit()
     ↓
If canExit() true → Exit room and restore level
```

## File Structure

```
game/scripts/environment/DoorRenderer.js  - Main door system class
game/scripts/Game.js                      - Initializes doorRenderer
game/scripts/core/GameSystems.js          - Updates door state
game/scripts/core/SceneRenderer.js        - Renders door sprite
game/scripts/rooms/RoomManager.js         - Coordinates exit with animation
game/art/bg/buildings/interior/door.png   - 64x64px sprite (2 frames)
game/index.html                           - Loads DoorRenderer.js
```

## Door Sprite Specifications

**File:** `game/art/bg/buildings/interior/door.png`

**Dimensions:** 64 pixels wide × 64 pixels tall (total image)

**Format:** Horizontal sprite sheet with 2 frames

**Frame Layout:**
```
┌─────────────┬─────────────┐
│   Frame 0   │   Frame 1   │
│  (Closed)   │   (Open)    │
│   32×64px   │   32×64px   │
└─────────────┴─────────────┘
```

**Frame 0 (x: 0-32):** Door closed - idle state
**Frame 1 (x: 32-64):** Door open - triggered when player presses Enter/E

**Rendering Scale:** 2x (door appears as 64×128 pixels in-game)

## DoorRenderer Class API

### Constructor

```javascript
new DoorRenderer(game)
```

**Parameters:**
- `game` (Game) - Reference to main game instance

**Properties Initialized:**
- `doorSprite` - Image object for door sprite
- `frameWidth` - 32px (source frame width)
- `frameHeight` - 64px (source frame height)
- `currentFrame` - 0 (closed) or 1 (open)
- `isOpen` - Boolean tracking animation state
- `openTimer` - Countdown timer in milliseconds
- `openDuration` - 500ms (time door stays open)
- `animationComplete` - Boolean indicating animation finished

### Methods

#### `loadDoorSprite()`

Loads the door sprite image asynchronously.

```javascript
loadDoorSprite()
```

**Behavior:**
- Sets `src` to `'art/bg/buildings/interior/door.png'`
- Enables async decoding for performance
- Logs error if sprite fails to load

---

#### `update(deltaTime)`

Updates door state based on player position and input. Called every frame by `GameSystems`.

```javascript
update(deltaTime)
```

**Parameters:**
- `deltaTime` (number) - Milliseconds since last frame

**Logic Flow:**
1. Check if in a room (`activeWorld.kind === 'room'`)
2. Get exit coordinates from available sources (priority order):
   - `game.roomManager.room.exit`
   - `window.RoomDescriptors[roomId].exit`
   - `game.level.exit`
3. Check if player is near exit (`isPlayerNearExit()`)
4. Detect Enter/E key press via `inputManager.keyPresses`
5. If near exit AND pressed interact → trigger animation
6. Count down `openTimer` until animation completes

**Exit Detection Sources (Fallback Chain):**
```javascript
// Priority 1: RoomManager (preferred)
if (game.roomManager?.room?.exit) {
    exit = game.roomManager.room.exit;
}
// Priority 2: Global RoomDescriptors (legacy)
else if (window.RoomDescriptors?.[roomId]?.exit) {
    exit = window.RoomDescriptors[roomId].exit;
}
// Priority 3: Level object (fallback)
else if (game.level?.exit) {
    exit = game.level.exit;
}
```

---

#### `isPlayerNearExit(player, exit)`

Calculates if player is within exit trigger radius.

```javascript
isPlayerNearExit(player, exit)
```

**Parameters:**
- `player` (object) - Player entity with `x`, `y`, `width`, `height`
- `exit` (object) - Exit zone with `x`, `y`, `radius`

**Returns:** Boolean - true if player center point is within exit radius

**Algorithm:**
```javascript
const px = player.x + (player.width / 2);  // Player center X
const py = player.y + player.height;       // Player bottom Y
const ex = exit.x ?? 0;
const ey = exit.y ?? 0;
const radius = exit.radius ?? 64;

const dx = px - ex;
const dy = py - ey;
const distSq = dx * dx + dy * dy;

return distSq <= radius * radius;  // Circular distance check
```

---

#### `render(ctx, camera)`

Renders the door sprite at the exit location. Called by `SceneRenderer` before player rendering.

```javascript
render(ctx, camera)
```

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context
- `camera` (Camera) - Camera object with `x`, `y` for offset

**Rendering Process:**
1. Verify in room and sprite loaded
2. Get exit coordinates (same fallback chain as `update()`)
3. Calculate screen position with camera offset
4. Apply 2x scale for better visibility
5. Draw appropriate frame (0 = closed, 1 = open)

**Position Calculation:**
```javascript
const scale = 2;                              // 2x size
const scaledWidth = frameWidth * scale;       // 64px
const scaledHeight = frameHeight * scale;     // 128px

// Center horizontally on exit, bottom aligned
const scaledDoorX = exit.x - scaledWidth / 2;
const scaledDoorY = exit.y - scaledHeight;

// Draw with camera offset
ctx.drawImage(
    doorSprite,
    srcX, srcY, frameWidth, frameHeight,       // Source rect
    scaledDoorX - camera.x,                    // Screen X
    scaledDoorY - camera.y,                    // Screen Y
    scaledWidth, scaledHeight                  // Destination size
);
```

---

#### `reset()`

Resets door to closed state. Called when entering a new room.

```javascript
reset()
```

**Behavior:**
- Sets `isOpen = false`
- Sets `currentFrame = 0` (closed)
- Sets `openTimer = 0`
- Sets `animationComplete = false`

---

#### `canExit()`

Returns whether door animation has completed and room exit is allowed.

```javascript
canExit()
```

**Returns:** Boolean - true if `animationComplete === true`

**Usage:** RoomManager calls this before allowing `exitRoom()`

```javascript
// In RoomManager.tryExitRoom()
if (this.game.doorRenderer && !this.game.doorRenderer.canExit()) {
    return false; // Wait for door animation
}
```

---

## Configuration & Customization

### Adjusting Animation Duration

Change the delay before exit is allowed:

```javascript
// In DoorRenderer constructor
this.openDuration = 500; // Milliseconds

// Examples:
this.openDuration = 300;  // Faster (0.3 seconds)
this.openDuration = 800;  // Slower (0.8 seconds)
this.openDuration = 1200; // Very slow (1.2 seconds)
```

### Changing Door Scale

Modify the rendering scale to make doors larger or smaller:

```javascript
// In DoorRenderer.render() method
const scale = 2; // Current: 2x size (64×128 pixels)

// Examples:
const scale = 1.5; // Smaller (48×96 pixels)
const scale = 3;   // Larger (96×192 pixels)
const scale = 1;   // Original size (32×64 pixels)
```

### Changing Door Sprite

Replace `game/art/bg/buildings/interior/door.png` with your own sprite:

**Requirements:**
- Image must be 64×64 pixels total
- 2 frames arranged horizontally (32×64 each)
- Frame 0 (left): Closed/idle state
- Frame 1 (right): Open/active state

**Example Alternative Paths:**
```javascript
// In DoorRenderer.loadDoorSprite()
this.doorSprite.src = 'art/bg/buildings/interior/door.png';       // Default
this.doorSprite.src = 'art/bg/buildings/interior/fancy-door.png'; // Custom
this.doorSprite.src = 'art/ui/exit-portal.png';                   // Portal style
```

### Adjusting Door Position

Doors automatically position at exit coordinates. To adjust offset:

```javascript
// In DoorRenderer.render() method

// Current (bottom-aligned to exit point):
const scaledDoorY = exit.y - scaledHeight;

// Alternative: Center vertically on exit
const scaledDoorY = exit.y - scaledHeight / 2;

// Alternative: Top-aligned to exit
const scaledDoorY = exit.y;

// Horizontal adjustment examples:
const scaledDoorX = exit.x - scaledWidth / 2;      // Centered (current)
const scaledDoorX = exit.x - scaledWidth;          // Right-aligned
const scaledDoorX = exit.x;                        // Left-aligned
const scaledDoorX = exit.x - scaledWidth / 2 + 10; // Offset right by 10px
```

### Changing Interaction Keys

Modify which keys trigger door opening:

```javascript
// In DoorRenderer.update() method
const pressedInteract = keys && (
    keys.has('enter') ||       // Enter key
    keys.has('numpadenter') || // Numpad Enter
    keys.has('e') ||           // E key
    keys.has('keye')           // E key (alternate)
);

// Add more keys:
const pressedInteract = keys && (
    keys.has('enter') ||
    keys.has('e') ||
    keys.has('space') ||       // Add spacebar
    keys.has('keyf')           // Add F key
);
```

### Disabling Door Animation Delay

To allow instant exit without waiting for animation:

```javascript
// Option 1: Remove animation requirement from RoomManager.tryExitRoom()
// Comment out or remove this check:
/*
if (this.game.doorRenderer && !this.game.doorRenderer.canExit()) {
    return false;
}
*/

// Option 2: Set openDuration to 0 for instant completion
this.openDuration = 0; // In DoorRenderer constructor
```

### Debug Visualization

Enable debug rendering to see exit zones:

```javascript
// In DoorRenderer.render() method (after drawing door)
if (this.game.debugMode) {
    ctx.save();
    
    // Draw exit radius as green circle
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(exit.x - camX, exit.y - camY, exit.radius || 64, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw door bounding box as red rectangle
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.strokeRect(
        scaledDoorX - camX,
        scaledDoorY - camY,
        scaledWidth,
        scaledHeight
    );
    
    // Draw exit center point
    ctx.fillStyle = 'red';
    ctx.fillRect(exit.x - camX - 2, exit.y - camY - 2, 4, 4);
    
    ctx.restore();
}
```

Enable in console: `game.debugMode = true`

---

## Room Integration

### How Doors Work with Rooms

Doors are **completely automatic** for all rooms. No per-room configuration needed.

**Requirements for Door to Appear:**
1. `game.activeWorld.kind` must be `'room'`
2. Exit coordinates must be available from one of:
   - `game.roomManager.room.exit`
   - `window.RoomDescriptors[roomId].exit`
   - `game.level.exit`

**Room Descriptor Example:**
```javascript
const myRoom = {
    id: 'my_custom_room',
    width: 1024,
    height: 720,
    spawn: { x: 200, y: 520 },
    exit: { x: 200, y: 560, radius: 80 }, // Door appears here automatically
    backgroundImage: { src: 'art/bg/my-room.png', width: 1024, height: 720 },
    platforms: [],
    enemies: [],
    items: [],
    npcs: []
};
```

**That's it!** The door system handles the rest:
- Loads door sprite on game init
- Detects room entry automatically
- Positions door at exit coordinates
- Handles animation and player interaction
- Controls exit timing

### Exit Coordinate Formats

**Circular Exit (Recommended):**
```javascript
exit: { x: 200, y: 560, radius: 80 }
```
- Door centers at `(x, y)`
- Player triggers exit within `radius` pixels
- Works with `isPlayerNearExit()` distance check

**Rectangular Exit (Supported):**
```javascript
exit: { x: 180, y: 540, width: 40, height: 60 }
```
- Door centers at `(x + width/2, y + height/2)`
- Exit check uses bounding box instead of circle
- Requires custom `isPlayerNearExit()` implementation

**Best Practices:**
- Place exit near spawn point (common pattern: `exit.y = spawn.y + 40`)
- Use radius 60-100 for comfortable interaction zone
- Position exit at floor level (near ground platform Y)
- Avoid placing exit behind walls or obstacles

### Multiple Exits Per Room

Current system supports **one exit per room**. To add multiple exits:

**Approach 1: Extend DoorRenderer**
```javascript
// Modify render() to loop over exit array
if (Array.isArray(room.exits)) {
    room.exits.forEach(exit => {
        // Render door at each exit
    });
}
```

**Approach 2: Create Multiple DoorRenderer Instances**
```javascript
// In Game.js constructor
this.doorRenderers = [
    new DoorRenderer(this, 'front_exit'),
    new DoorRenderer(this, 'back_exit')
];

// Update each in GameSystems
game.doorRenderers.forEach(dr => dr.update(deltaTime));
```

**Approach 3: Different Exit Types**
```javascript
exit: {
    type: 'door',      // Render door sprite
    x: 200, y: 560,
    radius: 80
}

exit: {
    type: 'stairs',    // Render stairs sprite
    x: 800, y: 600,
    radius: 100
}

// In DoorRenderer, check exit.type to decide sprite/behavior
```

---

## Troubleshooting

### Door Not Appearing

**Check these in order:**

1. **Is `activeWorld.kind` set to `'room'`?**
   ```javascript
   console.log(game.activeWorld?.kind); // Should log 'room'
   ```

2. **Are exit coordinates defined?**
   ```javascript
   console.log(game.roomManager?.room?.exit);
   console.log(window.RoomDescriptors?.[roomId]?.exit);
   console.log(game.level?.exit);
   ```

3. **Is DoorRenderer initialized?**
   ```javascript
   console.log(game.doorRenderer); // Should not be null
   ```

4. **Is sprite loaded?**
   ```javascript
   console.log(game.doorRenderer?.doorSprite?.complete); // Should be true
   ```

5. **Is door off-screen?**
   - Check console logs: `[DoorRenderer] Door position: {...}`
   - Verify exit coordinates are within room bounds
   - Check camera position: `console.log(game.camera?.x, game.camera?.y)`

### Door Not Animating

**Check these:**

1. **Is player near exit?**
   ```javascript
   const isNear = game.doorRenderer.isPlayerNearExit(
       game.player,
       game.roomManager.room.exit
   );
   console.log('Player near exit:', isNear);
   ```

2. **Are keys being detected?**
   ```javascript
   console.log(game.inputManager?.keyPresses); // Check Set contents
   ```

3. **Is animation timer running?**
   ```javascript
   console.log(game.doorRenderer.isOpen);
   console.log(game.doorRenderer.openTimer);
   ```

### Can't Exit Room

**Check these:**

1. **Is animation complete?**
   ```javascript
   console.log(game.doorRenderer.canExit()); // Should be true
   ```

2. **Is exit radius large enough?**
   ```javascript
   // Temporarily increase radius for testing
   room.exit.radius = 150; // Very large for debugging
   ```

3. **Is tryExitRoom() being called?**
   - Add `console.log('tryExitRoom called')` in `RoomManager.tryExitRoom()`
   - Check return value

### Door Appears Behind Player

**Fix:** Rendering order in `SceneRenderer.js` should be:
```javascript
// Correct order (door BEFORE player):
g.doorRenderer.render(ctx, g.camera);  // Draw door
g.player?.render?.(ctx, g.camera);     // Draw player (on top)

// Wrong order (player behind door):
g.player?.render?.(ctx, g.camera);     // Draw player
g.doorRenderer.render(ctx, g.camera);  // Draw door (covers player)
```

### Door Appears at Wrong Position

**Debug with console logs:**
```javascript
// In DoorRenderer.render(), add:
console.log('[DoorRenderer] Debug info:', {
    'exit.x': exit.x,
    'exit.y': exit.y,
    'room.height': this.game.level?.height,
    'scaledDoorX': scaledDoorX,
    'scaledDoorY': scaledDoorY,
    'camera.x': camera?.x,
    'camera.y': camera?.y,
    'final screen X': scaledDoorX - (camera?.x || 0),
    'final screen Y': scaledDoorY - (camera?.y || 0)
});
```

**Common Issues:**
- Exit Y too high → Door appears at top of room
- Exit Y too low → Door appears below floor
- Camera offset wrong → Door moves with camera incorrectly

**Fix:** Adjust exit coordinates in room descriptor:
```javascript
// If floor is at y=640 and spawn is at y=520:
exit: { x: 200, y: 560, radius: 80 } // Good (between spawn and floor)
exit: { x: 200, y: 100, radius: 80 } // Bad (way too high)
exit: { x: 200, y: 650, radius: 80 } // Bad (below floor)
```

---

## Performance Considerations

### Sprite Loading

Door sprite loads once on game initialization:
```javascript
// In DoorRenderer constructor
this.loadDoorSprite(); // Async, non-blocking
```

**Impact:** Minimal - 64×64px image loads in <10ms on modern hardware

**Optimization:** Sprite is cached by browser after first load

### Update Performance

`DoorRenderer.update()` runs every frame but early-exits when not in room:
```javascript
if (!isRoom) return; // Fast exit, no computation
```

**When in room:**
- Distance check: O(1) - simple Pythagorean calculation
- Key check: O(1) - Set lookup
- Timer countdown: O(1) - subtraction

**Impact:** <0.1ms per frame (negligible)

### Render Performance

`DoorRenderer.render()` draws one sprite per frame in rooms:
```javascript
ctx.drawImage(...); // Single draw call
```

**Impact:** <0.5ms per frame (typical for 2D sprite)

**Note:** Door renders even when off-screen. To optimize:
```javascript
// Add viewport culling in render():
const isInViewport = (
    scaledDoorX + scaledWidth > camera.x &&
    scaledDoorX < camera.x + camera.viewportWidth &&
    scaledDoorY + scaledHeight > camera.y &&
    scaledDoorY < camera.y + camera.viewportHeight
);

if (!isInViewport) return; // Skip rendering if off-screen
```

---

## Advanced Customization

### Per-Room Door Styles

Override sprite per room:

```javascript
// In room descriptor
const fancyRoom = {
    id: 'fancy_room',
    // ... other properties
    doorStyle: 'fancy', // Custom property
    customDoorSprite: 'art/bg/buildings/interior/fancy-door.png'
};

// In DoorRenderer.render(), check for custom sprite:
const doorSprite = room.customDoorSprite
    ? this.getCustomSprite(room.customDoorSprite)
    : this.doorSprite;
```

### Animated Doors (Multi-Frame)

Extend to support more frames:

```javascript
// In DoorRenderer constructor
this.frameCount = 4; // 4 frames instead of 2
this.animationSpeed = 100; // ms per frame

// In update()
if (this.isOpen) {
    this.frameTimer += deltaTime;
    if (this.frameTimer >= this.animationSpeed) {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        this.frameTimer = 0;
    }
}
```

Requires sprite sheet: 128×64px (4 frames of 32×64 each)

### Door Sound Effects

Add audio on open/close:

```javascript
// In DoorRenderer constructor
this.doorOpenSound = new Audio('sfx/door-open.wav');
this.doorCloseSound = new Audio('sfx/door-close.wav');

// In update(), when opening
if (isNearExit && pressedInteract && !this.isOpen) {
    this.isOpen = true;
    // ... existing code
    this.doorOpenSound.play(); // Add this
}

// When closing
if (this.openTimer <= 0) {
    this.animationComplete = true;
    this.doorCloseSound.play(); // Add this
}
```

### Particle Effects on Door Open

Integrate with particle system:

```javascript
// In update(), when door opens
if (isNearExit && pressedInteract && !this.isOpen) {
    // ... existing code
    
    // Spawn particles
    this.game.particleSystem?.emit({
        x: exit.x,
        y: exit.y,
        count: 10,
        type: 'sparkle',
        color: '#FFD700'
    });
}
```

### Door Opening Requirements

Add locked doors or requirements:

```javascript
// In room descriptor
exit: {
    x: 200,
    y: 560,
    radius: 80,
    locked: true,
    requiresItem: 'golden_key'
}

// In DoorRenderer.update()
if (exit.locked && !this.game.inventory?.hasItem(exit.requiresItem)) {
    // Show locked indicator instead of opening
    this.game.uiManager?.showMessage('Door is locked!');
    return;
}
```

---

## Code Examples

### Complete Room with Door

```javascript
// game/scripts/rooms/ShopInterior.js
const shopInterior = {
    id: 'shop_interior',
    width: 1280,
    height: 800,
    spawn: { x: 640, y: 640 },          // Center bottom
    exit: { x: 640, y: 680, radius: 100 }, // Door appears here automatically
    music: { src: 'music/shop.mp3', volume: 0.7 },
    backgroundImage: {
        src: 'art/bg/buildings/interior/shop.png',
        width: 1280,
        height: 800
    },
    platforms: [
        { x: 0, y: 720, width: 1280, height: 80, type: 'ground' }
    ],
    npcs: [
        {
            type: 'townNpc',
            name: 'Shopkeeper',
            x: 800,
            y: 640,
            width: 32,
            height: 64,
            dialogue: ['Welcome to my shop!', 'What can I get you?']
        }
    ],
    items: [],
    enemies: []
};

// Register with room registry
if (window.roomRegistry) {
    window.roomRegistry.register('shop_interior', shopInterior);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = shopInterior;
}
```

**Result:** Door automatically appears at `(640, 680)` when player enters shop

### Entering Room from Building

```javascript
// In building configuration (TownsConfig.js)
{
    id: 'item_shop',
    name: 'Item Shop',
    x: 2000,
    y: 500,
    interiorId: 'shop_interior', // Links to room above
    exterior: {
        src: 'art/bg/buildings/shop-exterior.png',
        width: 256,
        height: 320
    }
}
```

**Flow:**
1. Player approaches building exterior
2. Presses Enter/E in door radius
3. `TownManager.enterBuilding()` called
4. `RoomManager.enterRoom('shop_interior')` loads room
5. Door automatically renders at exit point in room
6. Player walks to door, presses Enter/E
7. Door opens (animation plays for 500ms)
8. `RoomManager.tryExitRoom()` waits for `canExit() === true`
9. Room exits, player returns to level

### Custom Door Behavior

```javascript
// Create custom door renderer class
class TimedDoor extends DoorRenderer {
    constructor(game) {
        super(game);
        this.openDuration = 1000; // Override to 1 second
        this.autoCloseDelay = 2000; // Auto-close after 2 seconds
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Add auto-close behavior
        if (this.animationComplete) {
            this.autoCloseTimer = (this.autoCloseTimer || 0) + deltaTime;
            
            if (this.autoCloseTimer >= this.autoCloseDelay) {
                this.reset(); // Close door
                this.autoCloseTimer = 0;
            }
        }
    }
}

// Use in Game.js
this.doorRenderer = new TimedDoor(this);
```

---

## Testing Checklist

When adding or modifying door system:

- [ ] Door appears in ALL existing rooms
- [ ] Door scales correctly (2x = 64×128 pixels)
- [ ] Door positioned at exit coordinates
- [ ] Door renders behind player (can walk in front)
- [ ] Pressing Enter/E near exit triggers animation
- [ ] Door shows open frame (frame 1) when triggered
- [ ] Animation plays for full duration (500ms default)
- [ ] Cannot exit room until animation completes
- [ ] After animation, pressing Enter/E exits room
- [ ] Door resets to closed when entering new room
- [ ] Door sprite loads successfully (check console for errors)
- [ ] Works with RoomManager-based rooms
- [ ] Works with legacy room systems
- [ ] Works with global RoomDescriptors
- [ ] Debug mode shows exit radius correctly
- [ ] Multiple room entries/exits work without issues
- [ ] No performance issues (check FPS in console)

---

## Future Enhancements

### Potential Features

1. **Per-Room Door Types**
   - Different sprites per room theme (wood door, metal door, portal, etc.)
   - Configuration: `room.doorType = 'metal'`

2. **Multi-Frame Animations**
   - Smooth opening animation (4-8 frames)
   - Closing animation separate from opening

3. **Door Sound Effects**
   - Creak sound on open
   - Latch sound on close
   - Configurable per door type

4. **Locked Doors**
   - Require items/keys to unlock
   - Show locked indicator
   - Different sprite for locked state

5. **Directional Doors**
   - Face left or right based on room layout
   - Flip sprite horizontally as needed

6. **Multiple Exits**
   - Support multiple doors per room
   - Different destinations per exit

7. **Particle Effects**
   - Sparkles/dust when door opens
   - Configurable per door type

8. **Viewport Culling**
   - Skip rendering when door off-screen
   - Performance optimization for large rooms

---

## Related Documentation

- [rooms.md](./rooms.md) - Complete room system guide
- [room-manager.md](./room-manager.md) - RoomManager API reference
- [town-manager.md](./town-manager.md) - Building/interior integration
- [scenes.md](./scenes.md) - Scene rendering pipeline
- [input.md](./input.md) - Input system and key detection

---

## Summary

The door system provides automatic, zero-configuration exit indicators for all interior rooms. By rendering a 2-frame animated door sprite at exit points and coordinating with RoomManager, it creates polished room transitions without requiring per-room setup.

**Key Takeaways:**
- Doors appear automatically in every room (no configuration needed)
- Position determined by `exit` coordinates in room descriptor
- 500ms animation delay before exit prevents accidental exits
- Completely customizable (scale, duration, sprite, position)
- Works with any room loading system (RoomManager, legacy, global descriptors)
- Renders behind player for proper layering
- Minimal performance impact (<1ms per frame)

For new rooms, simply define exit coordinates - the door handles itself!
