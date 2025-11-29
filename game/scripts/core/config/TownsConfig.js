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
                    id: 'boba_shop',
                    name: 'Beachside Boba',
                    exterior: {
                        x: 6700,
                        y: 360,
                        width: 320,
                        height: 230,
                        sprite: 'art/bg/buildings/exterior/beachside-boba.png'
                    },
                    door: {
                        x: 6835,
                        y: 420,
                        width: 54,
                        height: 78,
                        interactRadius: 54
                    },
                    interiorId: 'boba_shop_interior',
                    npcs: [
                        { id: 'barista', name: 'Lani', role: 'Barista', dialogueId: 'shop.boba' }
                    ]
                },
                {
                    id: 'club_cidic',
                    name: 'Club Cidic',
                    exterior: {
                        x: 7100,
                        y: 350,
                        width: 360,
                        height: 240,
                        sprite: 'art/bg/buildings/exterior/club-cidic.png'
                    },
                    door: {
                        x: 7260,
                        y: 420,
                        width: 60,
                        height: 82,
                        interactRadius: 56
                    },
                    interiorId: 'club_cidic_interior',
                    npcs: [
                        { id: 'dj', name: 'Cid', role: 'Host', dialogueId: 'club.cidic' }
                    ]
                },
                {
                    id: 'shore_house',
                    name: 'Seashell House',
                    exterior: {
                        x: 7600,
                        y: 370,
                        width: 280,
                        height: 210,
                        sprite: 'art/bg/buildings/exterior/house.png'
                    },
                    door: {
                        x: 7720,
                        y: 430,
                        width: 50,
                        height: 76,
                        interactRadius: 50
                    },
                    interiorId: 'shore_house_interior',
                    npcs: [
                        { id: 'resident', name: 'Mara', role: 'Local', dialogueId: 'resident.default' }
                    ]
                }
            ],
            setpieces: [
                // Town center fountain with benches
                { id: 'fountain_center', name: 'Fountain', x: 8200, y: 420, width: 140, height: 140, layer: 'foreground', sprite: 'art/bg/exterior-decor/fountain.png' },
                { id: 'bench_west', name: 'Bench', x: 8060, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },
                { id: 'bench_east', name: 'Bench', x: 8340, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },

                // Additional benches spread through town
                { id: 'bench_entry', name: 'Bench', x: 6580, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },
                { id: 'bench_far', name: 'Bench', x: 9600, y: 450, width: 120, height: 64, layer: 'foreground', sprite: 'art/bg/exterior-decor/bench.png' },

                // Street lamps for ambience
                { id: 'lamp_west', name: 'Street Lamp', x: 6500, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_mid_west', name: 'Street Lamp', x: 7000, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_center', name: 'Street Lamp', x: 8200, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_mid_east', name: 'Street Lamp', x: 9000, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' },
                { id: 'lamp_east', name: 'Street Lamp', x: 9900, y: 360, width: 64, height: 180, layer: 'foreground', sprite: 'art/bg/exterior-decor/street-lamp.png' }
            ],
            interiors: []
        }
    ]
};
