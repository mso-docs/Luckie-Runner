// Shore house interior room descriptor (for RoomManager, not LevelDefinitions)
const shoreHouseInteriorRoom = {
    id: 'shorehouseinterior',
    width: 1536,
    height: 1024,
    spawn: { x: 200, y: 1024 },
    exit: { x: 200, y: 1024, radius: 80 },
    music: { src: 'music/beach-house.mp3', volume: 0.8 },
    backgroundImage: {
        src: 'art/bg/buildings/interior/house-inside.png',
        width: 1536,
        height: 1024
    },
    platforms: [
        { x: 0, y: 640, width: 1536, height: 80, type: 'ground' },
        { x: 0, y: 0, width: 32, height: 1024, type: 'ground' },
        { x: 1536 - 32, y: 0, width: 32, height: 1024, type: 'ground' },
        { x: 0, y: 0, width: 1536, height: 32, type: 'ground' }
    ],
    enemies: [],
    items: [],
    npcs: [],
    theme: 'interior'
};

// Register through the shared room registry for easy overrides/customization.
const activeRoomRegistry = (typeof window !== 'undefined' ? window.roomRegistry : null);
if (activeRoomRegistry?.register) {
    activeRoomRegistry.register('shorehouseinterior', shoreHouseInteriorRoom);
    activeRoomRegistry.register('shore_house_interior', shoreHouseInteriorRoom);
}

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
