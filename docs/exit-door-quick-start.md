# Exit Door System - Quick Setup Summary

## What Was Implemented

A complete door sprite system that automatically appears at the exit of every interior room. The door:
- Shows closed by default
- Opens when player presses Enter/E near the exit
- Works for all existing and future rooms without additional configuration

## Files Created

1. **DoorRenderer.js**
   - `game/scripts/environment/DoorRenderer.js`
   - Handles door rendering, animation, and player interaction detection

2. **exit-door-system.md**
   - `docs/exit-door-system.md`
   - Complete documentation with examples and troubleshooting

## Files Modified

1. **Game.js** - Added DoorRenderer initialization
2. **GameSystems.js** - Added door update call in game loop
3. **SceneRenderer.js** - Added door rendering after player
4. **RoomManager.js** - Added door reset on room entry
5. **index.html** - Added DoorRenderer.js script tag

## How It Works

### Door Sprite
- **Location:** `game/art/bg/buildings/interior/door.png`
- **Format:** 2 frames (32×64px each), horizontal layout
- **Frame 0:** Closed door (idle)
- **Frame 1:** Open door (when Enter/E pressed)

### Automatic Behavior
The door automatically:
1. Positions itself at the room's exit coordinates
2. Detects when player is within exit radius
3. Animates to open state when Enter/E is pressed
4. Returns to closed state after 500ms

### No Configuration Needed
Every room with an exit automatically gets a door:
```javascript
room: {
    exit: { x: 200, y: 690, radius: 80 }  // Door appears here!
}
```

## Testing Checklist

- [ ] Enter any interior room (shore house, boba shop, etc.)
- [ ] Door sprite appears at exit location
- [ ] Door shows closed frame by default
- [ ] Walk near exit zone
- [ ] Press Enter or E key
- [ ] Door animates to open frame
- [ ] Door returns to closed after ~500ms
- [ ] Exit still works normally

## Customization

### Change Door Sprite
Replace `game/art/bg/buildings/interior/door.png` with your own sprite (2 frames, 32×64px each)

### Adjust Animation Duration
Edit `openDuration` in DoorRenderer.js constructor (default: 500ms)

### Change Door Size
Edit `frameWidth` and `frameHeight` in DoorRenderer.js constructor

## Debug Mode

Enable to see exit radius visualization:
```javascript
// In browser console
game.debugMode = true;
```

Green circle shows exit trigger area.

## Key Features

✅ **Automatic:** Works in all rooms without manual setup
✅ **Non-blocking:** Doesn't interfere with exit functionality
✅ **Future-proof:** New rooms automatically get doors
✅ **Lightweight:** Minimal performance impact
✅ **Configurable:** Easy to customize appearance and behavior

## Room Examples

### Shore House
```javascript
exit: { x: 200, y: 994, radius: 80 }
// Door appears at bottom of room near spawn point
```

### Beachside Boba
```javascript
exit: { x: 240, y: 690, radius: 80 }
// Door appears centered near bottom
```

All rooms automatically display doors at their exit points!

## Troubleshooting

**Door doesn't appear?**
- Check room has `exit` property defined
- Verify door.png exists at correct path
- Check browser console for errors

**Door in wrong position?**
- Adjust room's `exit.x` and `exit.y` values

**Door doesn't animate?**
- Ensure player is within exit radius
- Check radius value (80-100px recommended)

See `docs/exit-door-system.md` for complete documentation.
