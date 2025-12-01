# Coordinate System and Platform Spawning Guide

This comprehensive guide explains how the coordinate system works in Luckie Runner and how to spawn platforms, entities, and NPCs. Perfect for beginners with no prior game development knowledge.

## Table of Contents
- [Understanding the Coordinate System](#understanding-the-coordinate-system)
- [How Platforms Work](#how-platforms-work)
- [Creating and Spawning Platforms](#creating-and-spawning-platforms)
- [Player Spawn Positioning](#player-spawn-positioning)
- [Entity Positioning](#entity-positioning)
- [Room Interiors](#room-interiors)
- [Level/World Spawn](#levelworld-spawn)
- [Town Buildings](#town-buildings)
- [Common Patterns and Examples](#common-patterns-and-examples)
- [Troubleshooting](#troubleshooting)

---

## Understanding the Coordinate System

The coordinate system in Luckie Runner follows standard 2D canvas conventions. Think of it like a graph, but inverted from what you learned in math class.

### Origin and Direction

- **Origin (0, 0)**: The top-left corner of the canvas/room
- **X-axis**: Increases from left to right (moving right increases X)
- **Y-axis**: Increases from top to bottom (moving down increases Y)

**Visual Representation:**
```
(0, 0) -----> X increases (moving right)
  |
  |
  v
Y increases (moving down)
```

### Example Coordinate Grid

Here's how coordinates map to a typical 800x720 room:

```
(0, 0)                      (800, 0)
  +---------------------------+
  |   (100, 100)              |
  |      *                    |
  |                           |
  |            (400, 360)     |
  |                *          |  <- Room center
  |                           |
  |   (150, 624)              |
  |      P  <- Player         |
  +---------------------------+
(0, 720)                  (800, 720)
```

### Important Y-Axis Measurements

For a standard 720px tall room:
```
Top of room:    y = 0
Quarter down:   y = 180
Middle:         y = 360
Three-quarter:  y = 540
Ground floor:   y = 690 (typical platform height)
Bottom:         y = 720
```

### Entity Registration Points

**Critical Concept:** The `(x, y)` coordinates of entities (player, NPCs, platforms) represent the **top-left corner** of that entity, NOT the center or bottom.

**Example:**
```javascript
// Player at position x: 100, y: 624
// The TOP-LEFT corner of the player sprite is at (100, 624)
// If the player is 45px wide and 66px tall:
// - Top-left: (100, 624)
// - Top-right: (145, 624)
// - Bottom-left: (100, 690)
// - Bottom-right: (145, 690)
```

---

## How Platforms Work

Platforms are the solid surfaces that players and NPCs can stand on, jump between, and collide with. Understanding platforms is essential for building levels.

### What is a Platform?

A platform is a rectangular collision box that:
- Blocks player/NPC movement from above (you can stand on it)
- Has a top surface at a specific Y coordinate
- Has a width (horizontal span) and height (thickness)
- Can be invisible or have visual representation

### Platform Anatomy

```
      x: 200              x: 600
         +------------------+  <- y: 400 (top surface)
         |                  |
         |  PLATFORM AREA   |  <- height: 30 pixels thick
         |                  |
         +------------------+  <- y: 430 (bottom edge)
         <----------------->
           width: 400 pixels
```

**Key Properties:**
- `x`: Left edge position (horizontal start)
- `y`: Top edge position (where entities stand)
- `width`: Horizontal length of platform
- `height`: Vertical thickness (usually 20-40 pixels)
- `type`: Optional identifier like 'ground', 'floating', etc.

---

## Creating and Spawning Platforms

Platforms are created in different ways depending on where you need them.

### Platform Creation in Rooms (TownsConfig.js)

For building interiors and room-based areas:

```javascript
// In TownsConfig.js
rooms: {
    bakery: {
        width: 1024,
        height: 720,
        platforms: [
            // Ground platform (full width)
            { x: 0, y: 690, width: 1024, height: 30, type: 'ground' },
            
            // Floating platform (middle of room)
            { x: 300, y: 500, width: 200, height: 20, type: 'floating' },
            
            // Upper ledge (right side)
            { x: 700, y: 350, width: 300, height: 25, type: 'ledge' }
        ]
    }
}
```

### Platform Creation in Levels (WorldBuilder.js)

For overworld/level areas:

```javascript
// In WorldBuilder.js buildTestRoom() method
createPlatform(x, y, width, height) {
    return {
        x: x,
        y: y,
        width: width,
        height: height,
        type: 'ground',
        render: (ctx) => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    };
}

// Usage
platforms: [
    this.createPlatform(0, 690, 2000, 30),      // Main ground
    this.createPlatform(500, 500, 150, 20),     // Small floating platform
    this.createPlatform(800, 400, 200, 25)      // Mid-height platform
]
```

### Platform Examples by Use Case

#### Example 1: Simple Ground Floor

```javascript
// Full-width ground platform for a room
{
    x: 0,           // Starts at left edge
    y: 690,         // Top surface at y=690
    width: 1024,    // Spans entire room width
    height: 30,     // 30 pixels thick
    type: 'ground'
}
```

**Visual:**
```
Room width: 1024px
+----------------------------------+
|                                  |
|                                  |
|                                  |
|                                  |
|                                  |
|                                  | y: 690
|==================================| <- Ground platform
+----------------------------------+ y: 720
```

#### Example 2: Floating Platform

```javascript
// Single floating platform in center
{
    x: 400,         // 400 pixels from left edge
    y: 450,         // Top surface at y=450
    width: 200,     // 200 pixels wide
    height: 20,     // 20 pixels thick
    type: 'floating'
}
```

**Visual:**
```
        x: 400   x: 600
           +------+    <- y: 450
           | plat |
           +------+    <- y: 470
```

#### Example 3: Staircase Pattern

```javascript
platforms: [
    // Ground
    { x: 0, y: 690, width: 300, height: 30, type: 'ground' },
    
    // First step
    { x: 300, y: 620, width: 150, height: 30, type: 'step' },
    
    // Second step
    { x: 450, y: 550, width: 150, height: 30, type: 'step' },
    
    // Third step
    { x: 600, y: 480, width: 150, height: 30, type: 'step' },
    
    // Upper floor
    { x: 750, y: 480, width: 274, height: 30, type: 'ground' }
]
```

**Visual:**
```
                            +-------+ y: 480 (upper floor)
                    +-------+ y: 550
            +-------+ y: 620
+----------+ y: 690 (ground)
```

#### Example 4: Multiple Floating Platforms

```javascript
platforms: [
    // Ground
    { x: 0, y: 690, width: 1024, height: 30, type: 'ground' },
    
    // Lower floating platforms
    { x: 200, y: 580, width: 120, height: 20, type: 'floating' },
    { x: 500, y: 580, width: 120, height: 20, type: 'floating' },
    { x: 800, y: 580, width: 120, height: 20, type: 'floating' },
    
    // Upper floating platforms
    { x: 350, y: 450, width: 100, height: 20, type: 'floating' },
    { x: 650, y: 450, width: 100, height: 20, type: 'floating' }
]
```

### Platform Positioning Tips

**Ground Platforms:**
- Use `y: 690` for standard ground in 720px tall rooms
- Use `height: 30` for typical ground thickness
- Start at `x: 0` and use full room width for complete floors

**Floating Platforms:**
- Space vertically by at least 100-150 pixels for comfortable jumping
- Make them 100-200 pixels wide for good landing area
- Use `height: 20` for thinner floating platforms

**Calculating Jump Heights:**
- Player can jump approximately 150 pixels high
- To reach a platform 150px above: `targetY = currentPlatformY - 150`
- Example: Ground at y=690, player can reach platforms up to y=540

---

## Player Dimensions

```javascript
// From Player.js constructor
width: 45    // pixels
height: 66   // pixels
```

### Calculating Player Feet Position
To place the player standing on a platform at `y = 690`:
```javascript
playerY = platformY - playerHeight
playerY = 690 - 66 = 624
```

### Calculating Player Center
```javascript
centerX = playerX + (playerWidth / 2)  // 45 / 2 = 22.5
centerY = playerY + (playerHeight / 2) // 66 / 2 = 33
```

---

## Entity Positioning

Entities (NPCs, enemies, chests, items) follow the same coordinate system as platforms and the player.

### NPC Positioning Examples

#### Static NPC on Ground

```javascript
// In TownsConfig.js or EntityFactory
{
    x: 500,          // 500 pixels from left
    y: 624,          // Standing on platform at y=690
    width: 64,       // NPC sprite width
    height: 66,      // NPC sprite height
    spriteSheet: 'art/sprites/npc-sprite.png'
}
```

**Calculation:**
```
Platform top: y = 690
NPC height: 66 pixels
NPC y position: 690 - 66 = 624
```

#### NPC on Floating Platform

```javascript
// Platform
{ x: 400, y: 500, width: 200, height: 20 }

// NPC standing on this platform
{
    x: 450,          // Centered on platform (400 + 50)
    y: 434,          // Standing on platform (500 - 66)
    width: 64,
    height: 66
}
```

### Chest Positioning

```javascript
// Chest on ground platform at y=690
{
    x: 300,
    y: 650,          // Chest bottom at y=690 (assuming 40px tall)
    width: 40,
    height: 40,
    type: 'chest'
}
```

### Multiple Entity Spacing

```javascript
// Three NPCs evenly spaced on ground
platforms: [
    { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
],
npcs: [
    // Left NPC
    { x: 200, y: 624, width: 64, height: 66, name: 'Guard 1' },
    
    // Center NPC
    { x: 480, y: 624, width: 64, height: 66, name: 'Merchant' },
    
    // Right NPC
    { x: 760, y: 624, width: 64, height: 66, name: 'Guard 2' }
]
```

**Visual:**
```
  200        480        760
   |          |          |
  [G1]      [MER]      [G2]  <- NPCs at y=624
================================ <- Ground at y=690
```

### Entity Positioning in WorldBuilder.js

```javascript
// In buildTestRoom() method
this.npcs = [
    EntityFactory.princess(650, 558),  // On upper platform
    EntityFactory.balloonFan(350, 624) // On ground
];

// With platforms
this.platforms = [
    { x: 0, y: 690, width: 2000, height: 30 },       // Ground
    { x: 600, y: 624, width: 200, height: 20 }       // Upper platform (y=624)
];

// Princess calculation:
// Upper platform top: y = 624
// Princess height: 66 pixels
// Princess y position: 624 - 66 = 558
```

### Positioning Tips for Entities

**Ground Level Entities:**
```javascript
// For standard ground at y=690
entityY = 690 - entityHeight

// Examples:
// 66px tall entity: y = 690 - 66 = 624
// 80px tall entity: y = 690 - 80 = 610
// 40px tall chest: y = 690 - 40 = 650
```

**Platform Level Entities:**
```javascript
// For any platform
entityY = platformY - entityHeight

// Example: Platform at y=500, NPC 66px tall
npcY = 500 - 66 = 434
```

**Horizontal Spacing:**
- Leave at least 100-150 pixels between entities for comfortable navigation
- Center entities on platforms: `entityX = platformX + (platformWidth / 2) - (entityWidth / 2)`

---

## Player Spawn Positioning

This section covers where the player spawns when entering different areas.

---

## Room Interiors

Room interiors (like building interiors in towns) define spawn positions in `TownsConfig.js` or room definition files.

### Standard Room Structure
```javascript
{
    width: 1024,
    height: 720,
    spawn: { x: 200, y: 656 },  // Where player appears
    exit: { x: 200, y: 690, radius: 80 },  // Exit trigger zone
    platforms: [
        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
    ]
}
```

### Spawn Position Guidelines

#### Bottom Spawn (Most Common)
Place player near the ground, typical for entering through a door:
```javascript
spawn: { x: 200, y: 656 }
// Player's feet will be at: 656 + 66 = 722
// But with ground at 690, collision system adjusts to: 690 - 66 = 624
```

**Recommended Y values for 720px tall rooms:**
- `y: 624` - Player standing exactly on ground at y=690
- `y: 656` - Slightly above ground (collision system will drop player)
- `y: 660` - Very close to ground, minimal drop

#### Top/Middle Spawn (Less Common)
For dropping in from above or special scenarios:
```javascript
spawn: { x: 512, y: 200 }  // Middle-top of room
spawn: { x: 512, y: 360 }  // Dead center
```

### Exit Zone Configuration

Exit zones are circular trigger areas. When the player's center enters this radius, they exit the room.

```javascript
exit: { 
    x: 200,        // Center X of exit circle
    y: 690,        // Center Y of exit circle (typically at door/ground)
    radius: 80     // Trigger distance in pixels
}
```

**Exit positioning tips:**
- Place `x` at the door location
- Place `y` at ground level (690 for standard rooms)
- Use `radius: 80-90` for doors
- Larger radius (100-120) for more forgiving exits

---

## Level/World Spawn

For overworld/level spawning (main game areas), spawn is handled in `WorldBuilder.js`.

### Level Definition Spawn
```javascript
// In level registry or LevelRegistry.js
{
    id: 'myLevel',
    spawn: { x: 100, y: 500 },  // Absolute position
    // ... other level properties
}
```

### Test Room Spawn
Test room has special spawn logic that positions player near signboards:
```javascript
// From WorldBuilder.js
const getTestSpawn = () => {
    const groundY = g.testGroundY || (g.canvas.height - 50);
    const playerHeight = 66;
    const signX = g.signBoard?.x ?? 140;
    return {
        x: signX - 20 - 45,  // Left of sign, accounting for player width
        y: groundY - playerHeight  // Standing on ground
    };
};
```

### Fallback Spawn
If no spawn is defined:
```javascript
// Default from WorldBuilder.js
defaultSpawn = { 
    x: 100, 
    y: g.canvas.height - 150 
}
```

---

## Town Buildings

Town buildings in `TownsConfig.js` have both exterior and interior configurations.

### Complete Building Example
```javascript
{
    id: 'club_cidic',
    name: 'Club Cidic',
    exterior: {
        x: 10500,              // Position in town world
        y: 0,                  // Auto-aligned to ground
        width: 517,
        height: 530,
        scale: 0.44,
        autoAlignToGround: true,
        sprite: 'art/bg/buildings/exterior/club-cidic.png'
    },
    door: {
        width: 124,
        height: 160,
        spriteOffsetX: 132,    // Door location on sprite
        spriteOffsetY: 306,
        interactRadius: 150    // How close to get before "Press E"
    },
    collider: { 
        width: 230, 
        height: 18, 
        offsetX: 12, 
        offsetY: 55 
    },
    interior: {
        id: 'club_cidic_interior',
        spawn: { x: 200, y: 656 },      // Player entry point
        exit: { x: 200, y: 690, radius: 90 },   // Exit trigger
        room: {
            width: 1024,
            height: 720,
            spawn: { x: 200, y: 656 },   // Duplicate for room def
            exit: { x: 200, y: 690, radius: 90 },
            backgroundImage: {
                src: 'art/bg/buildings/interior/club-cidic-inside.png',
                width: 1024,
                height: 720
            },
            platforms: [
                { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
            ],
            // ... npcs, items, etc
        }
    }
}
```

### Interior vs Room Spawn
Both `interior.spawn` and `interior.room.spawn` should match:
```javascript
interior: {
    spawn: { x: 200, y: 656 },  // Used by town manager
    room: {
        spawn: { x: 200, y: 656 }  // Used by room manager
    }
}
```

---

## Common Patterns and Examples

This section provides complete, copy-paste-ready examples for common room and level setups.

### Pattern 1: Simple Room with Ground Floor

**Use Case:** Basic interior with player entering from bottom, single ground platform.

```javascript
// In TownsConfig.js interior.room
{
    width: 1024,
    height: 720,
    spawn: { x: 200, y: 656 },
    exit: { x: 200, y: 690, radius: 80 },
    platforms: [
        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
    ],
    backgroundImage: {
        src: 'art/bg/buildings/interior/your-room.png',
        width: 1024,
        height: 720
    }
}
```

**Visual Layout:**
```
+--------------------------------+
|                                |
|                                |
|                                |
|                                |
|  [P] <- Player spawns here     | y: 656
|  [X] <- Exit zone              | y: 690
|================================| <- Ground platform
+--------------------------------+ y: 720
```

### Pattern 2: Platformer Level with Multiple Heights

**Use Case:** Action level with jumping between platforms.

```javascript
// In WorldBuilder.js or level config
{
    width: 2000,
    height: 720,
    platforms: [
        // Main ground
        { x: 0, y: 690, width: 2000, height: 30, type: 'ground' },
        
        // Low floating platforms (130px above ground)
        { x: 300, y: 560, width: 150, height: 20, type: 'floating' },
        { x: 600, y: 560, width: 150, height: 20, type: 'floating' },
        { x: 900, y: 560, width: 150, height: 20, type: 'floating' },
        
        // High floating platform (280px above ground)
        { x: 800, y: 410, width: 200, height: 20, type: 'floating' }
    ],
    spawn: { x: 100, y: 624 }  // Start on ground
}
```

**Visual Layout:**
```
                        [====]   <- y: 410 (high platform)


     [===]     [===]     [===]   <- y: 560 (low platforms)



[P]                              <- y: 624 (player on ground)
================================ <- y: 690 (ground)
```

### Pattern 3: Centered Spawn (Puzzle Room)

**Use Case:** Room where player enters from center, can explore in any direction.

```javascript
{
    width: 1024,
    height: 720,
    spawn: { x: 462, y: 624 },  // Centered (1024/2 - 45/2 = 462)
    exit: { x: 50, y: 690, radius: 80 },  // Exit on left side
    platforms: [
        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
    ]
}
```

### Pattern 4: Multi-Level Interior

**Use Case:** Building with multiple floors and stairs.

```javascript
{
    width: 1024,
    height: 720,
    spawn: { x: 100, y: 624 },
    exit: { x: 100, y: 690, radius: 80 },
    platforms: [
        // Ground floor (left side)
        { x: 0, y: 690, width: 400, height: 30, type: 'ground' },
        
        // Stairs
        { x: 400, y: 650, width: 80, height: 30, type: 'step' },
        { x: 480, y: 610, width: 80, height: 30, type: 'step' },
        { x: 560, y: 570, width: 80, height: 30, type: 'step' },
        
        // Second floor (right side)
        { x: 640, y: 530, width: 384, height: 30, type: 'floor' }
    ]
}
```

**Visual Layout:**
```
                    [============]  <- y: 530 (2nd floor)
                  []                <- y: 570 (step 3)
                []                  <- y: 610 (step 2)
              []                    <- y: 650 (step 1)
[P]                                 <- y: 624 (player)
[============]                      <- y: 690 (ground)
```

### Pattern 5: Room with NPCs and Collectibles

**Use Case:** Shop or quest room with interactable entities.

```javascript
{
    width: 1024,
    height: 720,
    spawn: { x: 200, y: 624 },
    exit: { x: 200, y: 690, radius: 80 },
    platforms: [
        { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
    ],
    npcs: [
        {
            id: 'shopkeeper',
            name: 'Shopkeeper',
            x: 700,
            y: 624,  // Standing on ground (690 - 66)
            width: 64,
            height: 66,
            dialogueId: 'shop_keeper_greeting'
        }
    ],
    items: [
        { x: 400, y: 650, type: 'coin' },
        { x: 450, y: 650, type: 'coin' },
        { x: 500, y: 650, type: 'coin' }
    ]
}
```

**Visual Layout:**
```
           [C] [C] [C]        [NPC]    <- Coins and NPC
[P]                                     <- Player spawn
================================        <- Ground
```

### Pattern 6: Vertical Platforming Challenge

**Use Case:** Tower or vertical level requiring climbing.

```javascript
{
    width: 800,
    height: 1440,  // Double height
    spawn: { x: 377, y: 1308 },  // Start at bottom (centered)
    exit: { x: 377, y: 58, radius: 100 },  // Exit at top
    platforms: [
        // Bottom platform
        { x: 0, y: 1374, width: 800, height: 30, type: 'ground' },
        
        // Level 1 (alternating sides)
        { x: 0, y: 1200, width: 300, height: 20, type: 'platform' },
        { x: 500, y: 1100, width: 300, height: 20, type: 'platform' },
        
        // Level 2
        { x: 0, y: 950, width: 300, height: 20, type: 'platform' },
        { x: 500, y: 850, width: 300, height: 20, type: 'platform' },
        
        // Level 3
        { x: 0, y: 700, width: 300, height: 20, type: 'platform' },
        { x: 500, y: 600, width: 300, height: 20, type: 'platform' },
        
        // Top platform (exit)
        { x: 250, y: 450, width: 300, height: 20, type: 'platform' }
    ]
}
```

### Pattern 7: Boss Arena

**Use Case:** Large open space for combat encounters.

```javascript
{
    width: 1600,
    height: 900,
    spawn: { x: 100, y: 768 },  // Enter from left side
    platforms: [
        // Main ground
        { x: 0, y: 834, width: 1600, height: 30, type: 'ground' },
        
        // Small side platforms for dodging
        { x: 200, y: 650, width: 150, height: 20, type: 'platform' },
        { x: 1250, y: 650, width: 150, height: 20, type: 'platform' }
    ],
    enemies: [
        {
            type: 'boss',
            x: 1400,
            y: 768,  // Boss on right side
            width: 100,
            height: 66
        }
    ]
}
```

### Pattern 8: Complete Building with Interior

**Use Case:** Full building configuration in TownsConfig.js.

```javascript
// In TownsConfig.js buildings array
{
    id: 'my_shop',
    name: 'My Shop',
    exterior: {
        x: 5000,
        y: 0,
        width: 400,
        height: 450,
        scale: 0.5,
        autoAlignToGround: true,
        sprite: 'art/bg/buildings/exterior/shop.png'
    },
    door: {
        width: 100,
        height: 150,
        spriteOffsetX: 150,
        spriteOffsetY: 250,
        interactRadius: 120
    },
    collider: {
        width: 200,
        height: 20,
        offsetX: 10,
        offsetY: 50
    },
    interior: {
        id: 'my_shop_interior',
        spawn: { x: 200, y: 656 },
        exit: { x: 200, y: 690, radius: 90 },
        room: {
            width: 1024,
            height: 720,
            spawn: { x: 200, y: 656 },
            exit: { x: 200, y: 690, radius: 90 },
            backgroundImage: {
                src: 'art/bg/buildings/interior/shop-inside.png',
                width: 1024,
                height: 720
            },
            platforms: [
                { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
            ],
            npcs: [
                {
                    id: 'shop_owner',
                    name: 'Shop Owner',
                    x: 700,
                    y: 624,
                    width: 64,
                    height: 66,
                    spriteSheet: 'art/sprites/shop-owner.png',
                    dialogueId: 'shop_owner_greeting'
                }
            ]
        }
    }
}
```

---

## Troubleshooting

### Problem: Player spawns in center of room instead of bottom

**Cause**: Spawn Y is too low (closer to 0) or not set.

**Solution**: Set spawn Y closer to ground:
```javascript
// Before (spawns middle)
spawn: { x: 200, y: 360 }

// After (spawns at bottom)
spawn: { x: 200, y: 656 }
```

### Problem: Player falls through floor

**Cause**: Platform Y position doesn't match ground definition.

**Solution**: Ensure platform exists at correct Y:
```javascript
// Match spawn expectations
spawn: { x: 200, y: 656 },
platforms: [
    { x: 0, y: 690, width: 1024, height: 30, type: 'ground' }
]
// Player feet at: 656 + 66 = 722, will collide with platform at 690
```

### Problem: Can't exit room

**Cause**: Exit zone is too small, mispositioned, or player can't reach it.

**Solution**: Increase radius or move closer to ground:
```javascript
// Before (hard to trigger)
exit: { x: 200, y: 650, radius: 40 }

// After (easier to trigger)
exit: { x: 200, y: 690, radius: 90 }
```

### Problem: Player spawns outside room bounds

**Cause**: Spawn X or Y is beyond room width/height.

**Solution**: Clamp spawn within bounds:
```javascript
// For 1024x720 room
spawn: { 
    x: Math.min(200, 1024 - 45),  // Keep player in bounds
    y: Math.min(656, 720 - 66) 
}
```

### Problem: Spawn looks different in different rooms

**Cause**: Different room heights or platform configurations.

**Solution**: Calculate spawn relative to room height:
```javascript
const roomHeight = 720;
const groundY = roomHeight - 30;  // 690
const spawnY = groundY - 66 - 34;  // 656 (player height + small gap)

spawn: { x: 200, y: spawnY }
```

---

## Advanced: Spawn Position Calculator

Use these formulas to calculate exact spawn positions:

```javascript
// Standing on ground
function calculateGroundSpawn(groundY, playerHeight = 66) {
    return groundY - playerHeight;
}

// Example: ground at 690
const spawnY = calculateGroundSpawn(690);  // Returns 624

// With small gap above ground (common pattern)
function calculateGroundSpawnWithGap(groundY, playerHeight = 66, gap = 34) {
    return groundY - playerHeight - gap;
}

// Example: ground at 690 with 34px gap
const spawnY = calculateGroundSpawnWithGap(690);  // Returns 590
```

### Visual Reference
```
Room Height: 720px
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
y = 0    Top
         │
         │
y = 360  Middle
         │
         │
y = 590  ← Player spawn (with gap)
y = 624  ← Player spawn (on ground)
         ┌─┐ ← Player sprite (66px tall)
         │L│
         └─┘
y = 690  ▓▓▓▓▓▓▓▓▓▓ Ground platform (30px tall)
         ▓▓▓▓▓▓▓▓▓▓
y = 720  Bottom
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Quick Reference

### Standard Room (720px height)
```javascript
spawn: { x: 200, y: 656 },
exit: { x: 200, y: 690, radius: 80 },
platforms: [{ x: 0, y: 690, width: 1024, height: 30, type: 'ground' }]
```

### Player Dimensions
```javascript
width: 45px
height: 66px
```

### Exit Radius Guidelines
- **Small/precise**: 40-60px
- **Standard door**: 80-90px
- **Forgiving/large**: 100-120px

### Common Y Coordinates (for 720px rooms)
- Ground platform: `y: 690`
- Player spawn: `y: 656` (or `y: 624` for exact ground)
- Exit trigger: `y: 690`
- Middle of room: `y: 360`
- Top area: `y: 100-200`

---

## Related Documentation
- [Rooms System](rooms.md) - Room management and transitions
- [Towns](towns.md) - Town and building configuration
- [Collision System](collision.md) - How collision affects positioning
- [Camera](camera.md) - Camera positioning relative to spawn
