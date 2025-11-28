/**
 * GameConfig - central place for tunable constants and defaults.
 */
const GameConfig = {
    camera: {
        lead: { x: 100, y: 50 },
        lerpSpeed: 0.15
    },
    level: {
        width: 3000,
        height: 600,
        spawn: { x: 100, y: 400 },
        scrollSpeed: 2
    },
    timing: {
        timeScale: 0.6,
        fps: 60
    },
    audio: {
        master: 1.0,
        music: 0.6,
        sfx: 0.8,
        muted: false
    },
    controls: {
        toggleDebug: ['F1'],
        toggleTest: ['F2'],
        toggleMute: ['m', 'M'],
        toggleInventory: ['i', 'I'],
        pause: ['Escape', 'p', 'P']
    },
    testRoom: {
        groundHeight: 50,
        spawnAnchorX: 140,
        fallDeathBuffer: 200,
        teleportBuffer: 500
    }
};
