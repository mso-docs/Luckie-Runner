# RoomManager Guide (Interiors, Snapshots, Entry/Exit)

This guide explains how interiors (rooms) are entered/exited and how room state is managed. It assumes no prior knowledge.

---
## File and Class
- Path: `game/scripts/rooms/RoomManager.js`
- Class: `RoomManager`

---
## Responsibilities
- Enter building interiors (rooms) and swap world state (platforms/enemies/items/chests/NPCs/backgrounds).
- Capture a snapshot of the current level to restore on exit.
- Coordinate room music vs level/town music.

---
## Data Sources
- Room descriptors: `game/scripts/rooms/*.js`, `window.RoomDescriptors`, or `RoomRegistry`.
- Each descriptor: `{ id, width, height, spawn, exit { x,y,radius }, backgroundImage, platforms, enemies, items, hazards, chests, npcs, music }`.

---
## Entry Flow
1) Called via `enterRoom(descriptor, returnPosition)` (usually from TownManager door interaction).
2) Captures level snapshot (entities, decor, player position) for restoration.
3) Builds room world (RoomWorldBuilder): adds floor/walls, background, entities from descriptor.
4) Sets `game.activeWorld.kind = 'room'` and teleports player to room spawn.
5) Starts room music (or default `music/beach-house.mp3`), pauses level/town music.

---
## Exit Flow
- `exitRoom()`: restores captured level snapshot, sets `activeWorld.kind = 'level'`, resumes town/level music, returns player to stored position.

---
## Integration Points
- UIManager interaction flow calls TownManager `handleDoorInteract`; if a door is used, RoomManager `enterRoom` is invoked.
- WorldBuilder/RoomManager also keep chest blueprints so contents reset correctly when re-entering.

---
## Adding/Editing a Room
1) Define a room descriptor file or register in `RoomDescriptors`/RoomRegistry`:
   ```js
   const myRoom = { id:'house1', width:1024, height:720, spawn:{x:200,y:520}, exit:{x:220,y:560,radius:80}, backgroundImage:{ src:'art/bg/interior.png', width:1024, height:720 }, platforms:[{x:0,y:640,width:1024,height:80,type:'ground'}], chests: [] };
   window.RoomDescriptors = window.RoomDescriptors || {}; window.RoomDescriptors.house1 = myRoom;
   ```
2) Point a building interior id to this room in `TownsConfig`.

---
## Troubleshooting
- Black background: set `backgroundImage` or `backgroundLayers` in the descriptor.
- Can’t exit: ensure `exit` radius overlaps the player and `exitRoom` is called on interact; check UIManager flow.
- Entities missing: verify `type` strings are registered in EntityFactory; ensure `RoomRegistry` normalization includes your fields.
