# Game Vocabulary (Plain-English Glossary)

Use this glossary to understand the core words and labels used across the game. It is written for players and creators with no programming background.

## World Building Blocks
- **Level**: The main outdoor play area (overworld). It has platforms, enemies, items, and space to run and jump.
- **Town**: A themed stretch inside a level with buildings, town NPCs, and its own music. You enter a town by walking into its region.
- **Room**: An indoor area (e.g., building interior). Enter through a door, exit through an exit zone inside the room.
- **Spawn**: The starting position for the player when entering a level or room.
- **Exit (Room)**: A marked spot inside a room that sends you back outside when you stand in it.
- **Region**: A horizontal span in the level (from one x-position to another) that defines where a town starts and ends.

## Entities (Things in the World)
- **Entity**: Any object that exists in the game world (player, enemies, items, platforms, NPCs, projectiles, signs, etc.).
- **Player**: You. Can move, jump, attack, pick up items, talk to NPCs, and enter rooms.
- **Enemy**: A hostile entity (e.g., Slime). Can damage the player and be defeated.
- **NPC**: A friendly or neutral character you can talk to (e.g., town characters, shop ghost, princess).
- **Platform**: Solid ground or ledge you can stand on. The main “ground” platform is the floor.
- **Hazard**: Dangerous objects (e.g., spikes) that hurt on contact.
- **Item**: Collectibles or power-ups (coins, rocks, coffee, health potions, chests, flag).
- **Chest**: A container with loot; interact to open.
- **Projectile**: A flying object thrown or shot (rocks, arrows, fireballs, stings).
- **Flag**: The level goal; reaching it can finish the stage.

## Player Stats and Resources
- **Health (HP)**: How much damage you can take before losing. Shown on the HUD bar and fraction (current/max).
- **Coins**: Currency collected for shopping.
- **Rocks**: Default throwable ammo.
- **Buffs**: Temporary bonuses (e.g., coffee for stamina). Shown in the buff panel with timers.
- **Stamina**: Used for actions like dashing (if applicable).

## UI and HUD
- **HUD**: On-screen display showing health, coins, rocks, buffs, and other quick info.
- **Inventory Overlay**: A full-screen panel showing stats, items, gear, badges, journal tabs.
- **Chest Overlay**: Screen that appears when a chest is open; lists loot.
- **Shop Overlay**: Screen for buying items; shows currencies and a list of offers.
- **Town Banner**: A short banner that appears when you enter a town.
- **Speech Bubble**: Dialogue window for NPCs, signs, and story text.
- **Debug Panel**: Developer info (can be toggled on/off).
- **Menu**: Screens like Start, Pause, Game Over, Load, Settings.

## Controls and Interaction
- **Interact**: The action button (E/Enter) to open doors, talk, open chests, read signs.
- **Attack/Throw**: Use to launch rocks or other projectiles (mouse click by default).
- **Pause**: Opens the pause menu.
- **Door**: The hotspot on a building; interact to enter the interior.

## Audio
- **Music**: Background tracks. Different for level, town, and room.
- **SFX (Sound Effects)**: Sounds for actions like hits, pickups, jumps, doors.
- **Volume (Master/Music/SFX)**: Adjustable in settings or pause menu.

## Position and Movement Terms
- **x / y**: Positions in the world. x increases to the right; y increases downward.
- **Ground**: The main floor (a platform) you stand on.
- **Gravity**: Pulls entities downward unless they are set to float or fly.
- **Velocity**: How fast something moves each frame (speed and direction).

## Managers (Systems That Organize the Game)
- **WorldBuilder**: Puts together levels from data (platforms, enemies, items, background).
- **RoomManager**: Handles entering/exiting rooms and swapping the world to indoor mode.
- **TownManager**: Detects when you enter a town, shows town decor/NPCs, and manages doors to interiors.
- **GameStateManager**: Controls game states (menu, playing, paused, game over) and shows/hides menus.
- **UIManager**: Updates HUD, overlays (inventory, chest, shop), buttons, and tab switching.
- **DialogueManager**: Runs dialogue text and formatting; works with the speech bubble.
- **EntityFactory**: Creates entities (enemies, items, platforms, NPCs) from simple data.
- **CollisionSystem**: Checks collisions between player, enemies, projectiles, platforms, items, hazards.
- **Renderer/SceneRenderer**: Draws the game world and UI.

## Level and Room Data Terms
- **Width/Height**: Size of a level or room in pixels.
- **Background Image**: The art behind the platforms and entities.
- **Theme**: A style preset (e.g., beach, interior) that affects visuals and backgrounds.
- **Platforms List**: A list of ground/ledges defined by position and size.
- **Enemies/Items/NPCs Lists**: Collections of entities to place in the world.
- **Region (Town)**: Defines start and end x-positions where the town is active.

## Shops
- **Shop Items**: Things you can buy (consumables, ammo, power-ups).
- **Price/Currency**: Cost in coins (or other currencies if added).
- **Purchase**: Deducts currency and applies the item effect (heal, ammo, buff, etc.).

## Doors and Interiors
- **Building**: An exterior with a door that can lead to an interior room.
- **Interior**: The inside of a building (a room) with its own spawn, exit, music, and art.
- **Exit Zone**: The spot inside a room that returns you outside when you stand in it.

## Progress and Save
- **Save/Load**: Menus to store or restore game progress.
- **Checkpoint**: Not fully implemented; the flag often serves as the level completion point.

## Common Error Messages or Prompts
- **“Add Room to enter”**: There is a door, but the interior data is missing for that building.
- **“Locked”**: The door cannot be entered (no interior or intentionally locked).

Keep this glossary handy while exploring or building content; it maps the main words you will see in menus, UI, and documentation.***
