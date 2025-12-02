# Exit Door System

The exit door system automatically displays a door sprite at the exit point of every interior room, providing visual feedback to players about where to exit.

## Overview

The `DoorRenderer` class manages a door sprite that:
- Appears at the exit zone in all interior rooms
- Shows a closed door by default
- Animates to an open door when the player presses Enter/E near the exit
- Works automatically for all existing and future rooms

## Door Sprite

**Location:** `game/art/bg/buildings/interior/door.png`

**Format:**
- 2 frames arranged horizontally
- Each frame: 32px wide × 64px tall
- Frame 0 (left): Closed door (idle state)
- Frame 1 (right): Open door (interaction state)

## How It Works

### 1. Automatic Positioning

The door is automatically positioned at the room's exit coordinates:
- X position: Centered on `exit.x`
- Y position: Bottom of door aligned to `exit.y`

**Example:**
```javascript
// Room configuration in TownsConfig.js
room: {
    exit: { x: 200, y: 690, radius: 80 }
}

// Door will be rendered at:
// x: 200 - 16 (half of door width)
// y: 690 - 64 (door height)
```

### 2. Animation States

**Closed (Frame 0):**
- Default state when entering a room
- Displayed when player is away from exit
- Displayed after open animation completes

**Open (Frame 1):**
- Triggered when player presses Enter/E within exit radius
- Shows for 500ms (configurable)
- Automatically returns to closed state

### 3. Player Interaction

The door responds when:
1. Player is within the exit radius (defined in room config)
2. Player presses Enter or E key
3. Both conditions are true simultaneously

The door animation is purely visual and doesn't block the actual exit functionality.

## Integration

### Core Files Modified

**DoorRenderer.js** (new file)
- Location: `game/scripts/environment/DoorRenderer.js`
- Handles door state, rendering, and animation

**Game.js**
- Added `doorRenderer` initialization
- Creates DoorRenderer instance when game starts

**GameSystems.js**
- Added door update call in main game loop
- Updates door state every frame

**SceneRenderer.js**
- Added door rendering after player
- Renders door in front of other entities

**RoomManager.js**
- Added door reset on room entry
- Ensures door starts closed in new rooms

**index.html**
- Added DoorRenderer.js script tag
- Loaded after RoomManager.js

## Configuration

### DoorRenderer Properties

Located in `game/scripts/environment/DoorRenderer.js`:

```javascript
this.frameWidth = 32;        // Width of each frame in pixels
this.frameHeight = 64;       // Height of each frame in pixels
this.openDuration = 500;     // How long to show open frame (ms)
```

### Changing Door Appearance

To customize the door:

1. **Replace the sprite:**
   - Update `game/art/bg/buildings/interior/door.png`
   - Maintain 2 frames, horizontal layout

2. **Change frame dimensions:**
   - Edit `frameWidth` and `frameHeight` in DoorRenderer constructor
   - Update sprite file to match new dimensions

3. **Adjust open duration:**
   - Edit `openDuration` in DoorRenderer constructor
   - Value in milliseconds

## Room Setup

No additional configuration needed! The door automatically appears in any room with an exit defined.

**Standard room configuration:**
```javascript
room: {
    width: 1024,
    height: 720,
    spawn: { x: 200, y: 656 },
    exit: { x: 200, y: 690, radius: 80 },  // Door appears here
    platforms: [
        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
    ]
}
```

The door will automatically:
- Position itself at (200, 690)
- Respond to player interaction within 80px radius
- Animate when Enter/E is pressed

## Visual Examples

### Door Positioning

```
Room Layout (side view):
+--------------------------------+
|                                |
|                                |
|                                |
|          [Player]              | y: 656 (spawn)
|            [Door]              | y: 626-690 (door sprite)
|             |                  | y: 690 (exit point)
|================================| Ground platform
+--------------------------------+ y: 720
```

### Exit Radius Visualization

```
Top-down view:

        80px radius
          circle
     .-----------. 
    /             \
   |      [🚪]     |  <- Door sprite at exit
   |       X       |  <- Exit point (200, 690)
    \             /
     '-----------'
         
  [Player] can press Enter/E
  anywhere within this circle
```

## Debug Mode

When `game.debugMode` is enabled, the exit radius is visualized:
- Green circle drawn around exit point
- Shows exact trigger area for door interaction
- Helps with exit positioning during development

**Enable debug mode:**
```javascript
// In browser console
game.debug = true;
// or
game.debugMode = true;
```

## Troubleshooting

### Door doesn't appear

**Check:**
1. Room has `exit` property defined
2. Room is loaded through RoomManager (not a level)
3. DoorRenderer.js is loaded in index.html
4. Door sprite exists at `art/bg/buildings/interior/door.png`

### Door appears in wrong position

**Fix:**
- Adjust room's `exit.x` and `exit.y` values
- Door centers on x, aligns bottom to y

### Door doesn't animate

**Check:**
1. Player is within exit radius
2. Exit radius is large enough (try 80-100px)
3. InputManager is properly initialized
4. No JavaScript errors in console

### Door blocks other interactions

**Note:** The door system doesn't consume key presses, so it shouldn't block other interactions. If this occurs, check that other systems properly check for overlapping interaction zones.

## Performance

The door system is lightweight:
- Single sprite loaded once at game start
- Minimal update logic (distance check + timer)
- Only renders in rooms (not levels)
- No impact on gameplay systems

## Future Enhancements

Potential improvements:
1. **Animated sprite:** Use sprite sheet with multiple animation frames
2. **Sound effects:** Add door open/close sounds
3. **Customizable doors:** Per-room door sprite override
4. **Directional doors:** Different sprites for vertical/horizontal doors
5. **Locked doors:** Visual indicator for locked exits

## Related Documentation

- [Rooms System](rooms.md) - Room management and transitions
- [Spawn and Positioning](spawn-and-positioning.md) - Coordinate system
- [UI Manager](ui-manager.md) - Interaction system
- [Input System](input.md) - Keyboard controls
