/**
 * TownsConfig - data-only definitions for towns and their regions/assets.
 */
const TownsConfig = {
    preloadDistance: 3600, // lookahead in px for loading town assets
    defaults: {
        houseCount: { min: 2, max: 3 },
        streetLampCount: 1,
        itemPlan: {
            count: 2,
            spacing: 320,
            pool: [
                { type: 'coffee' },
                { type: 'health_potion', healAmount: 25 }
            ]
        }
    },
    assetKits: {
        shore: {
            groundTile: { id: 'shore_ground_tile', role: 'groundTile', name: 'Cobble Ground', frameWidth: 1024, frameHeight: 1024, tileX: true, layer: 'ground', autoAlignToGround: true, scale: 0.04, sprite: 'art/bg/tiles/beach-cobble.png' },
            backdropSlices: [
                { id: 'shore_fronds_start', role: 'backdrop', slot: 'start', frameWidth: 1022, frameHeight: 988, layer: 'midground', autoAlignToGround: true, scale: 0.10, sprite: 'art/bg/town backdrop/frond-start.png' },
                { id: 'shore_fronds_mid', role: 'backdrop', slot: 'mid', width: 35000, frameWidth: 1022, frameHeight: 988, tileX: true, tileWidth: 128, layer: 'midground', autoAlignToGround: true, scale: 0.10, sprite: 'art/bg/town backdrop/fronds.png' },
                { id: 'shore_fronds_end', role: 'backdrop', slot: 'end', frameWidth: 1022, frameHeight: 988, layer: 'midground', autoAlignToGround: true, scale: 0.10, sprite: 'art/bg/town backdrop/frond-end.png' }
            ],
            streetLamp: { id: 'shore_lamp', role: 'streetLamp', name: 'Street Lamp', width: 64, height: 180, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/street-lamp.png' },
            house: {
                id: 'shore_house_template',
                name: 'House',
                exterior: {
                    width: 689,
                    height: 768,
                    frames: 2,
                    frameWidth: 689,
                    frameHeight: 768,
                    frameDirection: 'horizontal',
                    scale: 0.4,
                    autoAlignToGround: true,
                    sprite: 'art/bg/buildings/exterior/house.png'
                },
                door: {
                    width: 180,
                    height: 210,
                    spriteOffsetX: 118,
                    spriteOffsetY: 498,
                    interactRadius: 160
                },
                interior: {
                    id: 'shore_house_interior',
                    spawn: { x: 200, y: 520 },
                    exit: { x: 200, y: 560, radius: 80 },
                    room: {
                        width: 1024,
                        height: 720,
                        spawn: { x: 200, y: 520 },
                        exit: { x: 200, y: 560, radius: 80 },
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
                    }
                }
            }
        }
    },
    towns: [
        {
            id: 'shoreTown',
            name: 'Beachside',
            levelId: 'testRoom',
            region: { startX: 6500, endX: 10000 },
            banner: {
                background: 'art/ui/scroll.png',
                textColor: '#5c3a1a'
            },
            assetKit: 'shore',
            houseCount: { min: 3, max: 3 },
            houseSlots: [7200, 8800, 9600],
            lampSlots: [6900, 8200, 9500],
            streetLampCount: 3,
            itemPlan: { count: 3, spacing: 420 },
            music: {
                id: 'shoreTownTheme',
                src: 'music/beachside.mp3',
                volume: 0.9
            },
            buildings: [
                {
                    id: 'shore_house',
                    name: 'House',
                    exterior: {
                        x: 8800,
                        y: 0, // auto aligned to ground
                        width: 689, // source frame width (display is scaled via scale)
                        height: 768, // source frame height
                        frames: 2, // closed + open
                        frameWidth: 689, // source frame dimensions (do not scale)
                        frameHeight: 768,
                        frameDirection: 'horizontal',
                        scale: 0.4,
                        autoAlignToGround: true,
                        sprite: 'art/bg/buildings/exterior/house.png'
                    },
                    door: {
                        width: 180, // raw door size; scaled by exterior.scale
                        height: 210,
                        // Door art rectangle: x=118..298, y=498..708 on the source sprite
                        spriteOffsetX: 118,
                        spriteOffsetY: 498,
                        interactRadius: 160
                    },
                    interior: {
                        id: 'shorehouseinterior',
                        spawn: { x: 200, y: 520 },
                        exit: { x: 200, y: 560, radius: 80 },
                        // Inline level definition matching house-inside.png bounds
                        room: {
                            width: 1024,
                            height: 720,
                            spawn: { x: 200, y: 520 },
                            exit: { x: 200, y: 560, radius: 80 },
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
                        }
                    },
                    npcs: []
                }
            ],
            setpieces: [
                // Fountain (animated, scales with player)
                { id: 'fountain_center', name: 'Fountain', x: 8200, y: 0, width: 517, height: 507, frames: 12, frameWidth: 517, frameHeight: 507, frameDirection: 'horizontal', frameTimeMs: 120, scale: 0.4, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/fountain.png' },

                // Fixed bench
                { id: 'bench_center', name: 'Bench', x: 8000, y: 0, width: 120, height: 64, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/bench.png' }
            ],
            interiors: [],
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
                    speed: 40,
                    pauseMs: 30,
                    x: 8200,
                    patrol: [
                        { x: 8000 },
                        { x: 8800 }
                    ]
                },
                {
                    id: 'melissa',
                    type: 'townNpc',
                    name: 'Melissa',
                    sprite: 'art/sprites/melissa.png',
                    width: 57,
                    height: 75,
                    frames: 4,
                    idleFrame: 2,
                    walkFrames: [3, 4],
                    talkFrames: [1, 0],
                    dialogueId: 'npc.melissa',
                    speed: 30,
                    pauseMs: 40,
                    x: 9000,
                    patrol: [
                        { x: 9000 },
                        { x: 9800 }
                    ]
                }
            ]
        }
    ]
};
