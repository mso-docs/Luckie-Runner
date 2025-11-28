// Test room level definition (data-only)
window.LevelDefinitions = window.LevelDefinitions || {};
window.LevelDefinitions.testRoom = {
    parkour: [
        { x: 220, width: 120, y: null, yOffset: 0 },   // base
        { x: 420, width: 90, y: null, yOffset: 50 },
        { x: 600, width: 100, y: null, yOffset: 90 },
        { x: 780, width: 80, y: null, yOffset: 130 },
        { x: 950, width: 110, y: null, yOffset: 60 },
        { x: 1140, width: 90, y: null, yOffset: 20 },
        { x: 1320, width: 80, y: null, yOffset: 70 },
        { x: 1480, width: 120, y: null, yOffset: 120 },
        { x: 1660, width: 80, y: null, yOffset: 160 },
        { x: 1800, width: 160, y: null, yOffset: 60 }
    ],
    mountainSteps: [
        { x: 2050, yOffset: 32, width: 180, height: 32 },
        { x: 2220, yOffset: 80, width: 150, height: 32 },
        { x: 2360, yOffset: 132, width: 140, height: 32 },
        { x: 2485, yOffset: 184, width: 120, height: 32 },
        { x: 2605, yOffset: 236, width: 120, height: 32 },
        { x: 2725, yOffset: 288, width: 110, height: 32 },
        { x: 2840, yOffset: 340, width: 170, height: 32 },
        { x: 2980, yOffset: 300, width: 150, height: 32 },
        { x: 3120, yOffset: 240, width: 150, height: 32 },
        { x: 3260, yOffset: 180, width: 150, height: 32 },
        { x: 3400, yOffset: 120, width: 150, height: 32 },
        { x: 3540, yOffset: 70, width: 150, height: 32 },
        { x: 3680, yOffset: 32, width: 180, height: 32 }
    ],
    balloonParkour: [
        { x: 3960, width: 110, yOffset: 90 },
        { x: 4080, width: 100, yOffset: 150 },
        { x: 4220, width: 90, yOffset: 205 },
        { x: 4340, width: 110, yOffset: 255 },
        { x: 4420, width: 140, yOffset: 245 }
    ],
    defaultSignMessages: [
        '<<<~HOWDY!~>>> It is I, your #friendly# neighborhood signboard. I am here to provide you with %important% information as you embark on your adventure.',
        'You _may_ find me scattered throughout the land, offering guidance, tips, and <<maybe>> even a joke or two to ^lighten^ your journey.',
        'You also may find me in places where you %least% expect it, so keep your eyes #peeled#. Safe travels, ^adventurer^!',
        'Also, you may want to #throw# some rocks at those ^slimes^. Just saying.'
    ]
};
