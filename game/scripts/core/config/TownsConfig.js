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
                    id: 'shore_inn',
                    name: 'Driftwood Inn',
                    exterior: {
                        x: 7000,
                        y: 400,
                        width: 260,
                        height: 200,
                        sprite: 'art/towns/inn.png'
                    },
                    door: {
                        x: 7120,
                        y: 440,
                        width: 48,
                        height: 72,
                        interactRadius: 48
                    },
                    interiorId: 'shore_inn_interior',
                    npcs: [
                        { id: 'innkeeper', name: 'Bree', role: 'Innkeeper', dialogueId: 'innkeeper.default' }
                    ]
                },
                {
                    id: 'gear_shop',
                    name: 'Tide Tools',
                    exterior: {
                        x: 7400,
                        y: 400,
                        width: 240,
                        height: 190,
                        sprite: 'art/towns/shop.png'
                    },
                    door: {
                        x: 7500,
                        y: 440,
                        width: 44,
                        height: 70,
                        interactRadius: 48
                    },
                    interiorId: 'shore_shop_interior',
                    npcs: [
                        { id: 'shopkeeper', name: 'Koa', role: 'Merchant', dialogueId: 'shopkeeper.default' }
                    ]
                }
            ],
            setpieces: [
                { id: 'palm_cluster', name: 'Palm Cluster', x: 6800, y: 380, width: 120, height: 180, layer: 'foreground' },
                { id: 'market_stall', name: 'Market Stall', x: 7280, y: 410, width: 140, height: 120, layer: 'foreground' },
                { id: 'dock_piles', name: 'Dock Piles', x: 7700, y: 410, width: 160, height: 110, layer: 'background' }
            ],
            interiors: []
        }
    ]
};
