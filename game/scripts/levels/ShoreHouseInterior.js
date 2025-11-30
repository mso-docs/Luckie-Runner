// Shore house interior level definition
window.LevelDefinitions = window.LevelDefinitions || {};

const shoreHouseInteriorLevel = {
    width: 1200,
    height: 720,
    spawn: { x: 220, y: 420 },
    exit: { x: 220, y: 470, radius: 70 },
    // Simple floor and a couple of props to stand on
    platforms: [
        // Main floor
        { x: 0, y: 500, width: 1200, height: 80, type: 'ground' },
        // Small step near the door
        { x: 170, y: 480, width: 120, height: 20, type: 'platform' },
        // Shelf/loft
        { x: 700, y: 360, width: 240, height: 24, type: 'platform' }
    ],
    enemies: [],
    items: [],
    npcs: [],
    theme: 'interior'
};

window.LevelDefinitions.shore_house_interior = shoreHouseInteriorLevel;
// Alias without underscore for legacy/typo references
window.LevelDefinitions.shorehouseinterior = shoreHouseInteriorLevel;
