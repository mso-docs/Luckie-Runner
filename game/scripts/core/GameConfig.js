/**
 * GameConfig - central place for tunable constants and defaults.
 */
const GameConfig = {
    camera: (typeof CameraConfig !== 'undefined') ? CameraConfig : {
        lead: { x: 100, y: 50 },
        lerpSpeed: 0.15
    },
    level: (typeof LevelDefaultsConfig !== 'undefined') ? LevelDefaultsConfig : {
        width: 3000,
        height: 600,
        spawn: { x: 100, y: 400 },
        scrollSpeed: 2
    },
    timing: {
        timeScale: 0.6,
        fps: 60
    },
    audio: (typeof AudioConfig !== 'undefined') ? AudioConfig : {
        master: 1.0,
        music: 0.6,
        sfx: 0.8,
        muted: false
    },
    controls: (typeof ControlsConfig !== 'undefined') ? ControlsConfig : {
        toggleDebug: ['F1'],
        toggleTest: ['F2'],
        toggleMute: ['m', 'M'],
        toggleInventory: ['i', 'I'],
        pause: ['Escape', 'p', 'P']
    },
    themes: (typeof ThemesConfig !== 'undefined') ? ThemesConfig : {
        defaultTheme: 'beach'
    },
    testRoom: {
        groundHeight: 50,
        spawnAnchorX: 140,
        fallDeathBuffer: 200,
        teleportBuffer: 500
    }
};
