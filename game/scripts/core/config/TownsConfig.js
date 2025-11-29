/**
 * TownsConfig - data-only definitions for towns and their regions/assets.
 */
const TownsConfig = {
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
                    id: 'shore_villa',
                    name: 'Seabreeze Villa',
                    exterior: {
                        x: 8800,
                        y: 0, // auto aligned to ground
                        width: 701, // source frame width (display is scaled via scale)
                        height: 769, // source frame height
                        frames: 2, // closed + open
                        frameWidth: 701, // source frame dimensions (do not scale)
                        frameHeight: 769,
                        frameDirection: 'horizontal',
                        scale: 0.4,
                        autoAlignToGround: true,
                        sprite: 'art/bg/buildings/exterior/house.png'
                    },
                    door: {
                        width: 120, // raw door size; scaled by exterior.scale
                        height: 190,
                        interactRadius: 96
                    },
                    interiorId: 'shore_villa_interior',
                    npcs: []
                }
            ],
            setpieces: [
                // Town center fountain with benches
                { id: 'fountain_center', name: 'Fountain', x: 8200, y: 0, width: 517, height: 507, frames: 12, frameWidth: 517, frameHeight: 507, frameDirection: 'horizontal', frameTimeMs: 120, scale: 0.4, layer: 'foreground', autoAlignToGround: true, sprite: 'art/bg/exterior-decor/fountain.png' },
                { id: 'bench_west', name: 'Bench', x: 8060, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },
                { id: 'bench_east', name: 'Bench', x: 8340, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },

                // Additional benches spread through town
                { id: 'bench_entry', name: 'Bench', x: 6580, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },
                { id: 'bench_far', name: 'Bench', x: 9600, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },
                { id: 'bench_villa', name: 'Bench', x: 8950, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },

                // Street lamps for ambience
                { id: 'lamp_west', name: 'Street Lamp', x: 6500, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_mid_west', name: 'Street Lamp', x: 7000, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_center', name: 'Street Lamp', x: 8200, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_mid_east', name: 'Street Lamp', x: 9000, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_east', name: 'Street Lamp', x: 9900, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_villa', name: 'Street Lamp', x: 8720, y: 380, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' }
            ],
            interiors: []
        }
    ]
};
