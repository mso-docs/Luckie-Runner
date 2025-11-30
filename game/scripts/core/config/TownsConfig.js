/**
 * TownsConfig - data-only definitions for towns and their regions/assets.
 */
const TownsConfig = {
    preloadDistance: 3600, // lookahead in px for loading town assets
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
                        id: 'shore_house_interior',
                        spawn: { x: 120, y: 400 },
                        exit: { x: 120, y: 460, radius: 70 }
                    },
                    npcs: []
                }
            ],
            setpieces: [
                // Ground tiling across town region (replaces platform texture)
                { id: 'shore_ground', name: 'Cobble Ground', x: 6500, y: 0, width: 3500, height: 40, frameWidth: 1024, frameHeight: 1024, tileX: true, layer: 'ground', autoAlignToGround: true, scale: 0.04, sprite: 'art/bg/tiles/beach-cobble.png' },

                // Fountain (animated, scales with player)
                { id: 'fountain_center', name: 'Fountain', x: 8200, y: 0, width: 517, height: 507, frames: 12, frameWidth: 517, frameHeight: 507, frameDirection: 'horizontal', frameTimeMs: 120, scale: 0.4, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/fountain.png' },

                // Fixed bench
                { id: 'bench_center', name: 'Bench', x: 8000, y: 0, width: 120, height: 64, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/bench.png' },

                // Three fixed street lamps
                { id: 'lamp_west', name: 'Street Lamp', x: 6900, y: 0, width: 64, height: 180, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_center', name: 'Street Lamp', x: 8200, y: 0, width: 64, height: 180, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_east', name: 'Street Lamp', x: 9500, y: 0, width: 64, height: 180, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/street-lamp.png' }

                // Town overlay fronds (in front of palms/bushes)
                ,{ id: 'shore_fronds_start', name: 'Fronds Start', x: 6500, y: 0, frameWidth: 1022, frameHeight: 988, tileX: false, layer: 'midground', autoAlignToGround: true, scale: 0.10, sprite: 'art/bg/town backdrop/frond-start.png' }
                ,{ id: 'shore_fronds_mid', name: 'Fronds Mid', x: 6602, y: 0, width: 35000, frameWidth: 1022, frameHeight: 988, tileX: true, tileWidth: 128, layer: 'midground', autoAlignToGround: true, scale: 0.10, sprite: 'art/bg/town backdrop/fronds.png' }
                ,{ id: 'shore_fronds_end', name: 'Fronds End', x: 10102, y: 0, frameWidth: 1022, frameHeight: 988, tileX: false, layer: 'midground', autoAlignToGround: true, scale: 0.10, sprite: 'art/bg/town backdrop/frond-end.png' }
            ],
            interiors: []
            ,
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
