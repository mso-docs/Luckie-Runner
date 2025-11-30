// Shore house interior room descriptor (for RoomManager, not LevelDefinitions)
const shoreHouseInteriorRoom = {
    id: 'shorehouseinterior',
    width: 1024,
    height: 720,
    spawn: { x: 200, y: 520 },
    exit: { x: 200, y: 560, radius: 80 },
    music: { src: 'music/beach-house.mp3', volume: 0.8 },
    backgroundImage: {
        src: 'art/bg/buildings/interior/house-inside.png',
        width: 1024,
        height: 720
    },
    platforms: [
        { x: 0, y: 640, width: 1024, height: 80, type: 'ground' },
        { x: 0, y: 0, width: 32, height: 720, type: 'ground' },
        { x: 1024 - 32, y: 0, width: 32, height: 720, type: 'ground' },
        { x: 0, y: 0, width: 1024, height: 32, type: 'ground' }
    ],
    enemies: [],
    items: [],
    npcs: [],
    theme: 'interior'
};

// Optional global export so RoomManager users can fetch it.
if (typeof window !== 'undefined') {
    window.RoomDescriptors = window.RoomDescriptors || {};
    window.RoomDescriptors.shorehouseinterior = shoreHouseInteriorRoom;
    window.RoomDescriptors.shore_house_interior = shoreHouseInteriorRoom;
}

// CommonJS/ESM fallback (ignored in browser unless bundled)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = shoreHouseInteriorRoom;
}
