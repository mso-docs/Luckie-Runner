/**
 * UIInputController - handles DOM wiring for menus and overlays.
 * Keeps UIManager focused on state.
 */
class UIInputController {
    constructor(game, uiManager) {
        this.game = game;
        this.uiManager = uiManager;
        this.controls = game.config?.controls || {};
    }

    bindDom() {
        const g = this.game;
        const sm = g.stateManager;

        // Start menu buttons
        document.getElementById('startButton')?.addEventListener('click', () => {
            g.ensureTitleMusicPlaying();
            sm.startGame();
        });
        document.getElementById('loadButton')?.addEventListener('click', () => {
            g.ensureTitleMusicPlaying();
            this.uiManager.renderSaveSlots();
            sm.showMenu('loadMenu');
        });
        document.getElementById('instructionsButton')?.addEventListener('click', () => {
            g.ensureTitleMusicPlaying();
            sm.showMenu('instructionsMenu');
        });
        document.getElementById('backButton')?.addEventListener('click', () => {
            g.ensureTitleMusicPlaying();
            sm.showMenu('startMenu');
        });
        document.getElementById('loadBackButton')?.addEventListener('click', () => {
            g.ensureTitleMusicPlaying();
            sm.showMenu('startMenu');
        });

        // Game over buttons
        document.getElementById('restartButton')?.addEventListener('click', () => {
            sm.restartGame();
        });
        document.getElementById('mainMenuButton')?.addEventListener('click', () => {
            sm.returnToMenu();
        });

        // Pause menu buttons
        document.getElementById('resumeButton')?.addEventListener('click', () => {
            sm.resumeGame();
        });
        document.getElementById('pauseSaveButton')?.addEventListener('click', () => {
            g.saveProgress?.('slot1', 'Pause Save');
            this.uiManager.renderSaveSlots();
            sm.showMenu('loadMenu');
        });
        document.getElementById('pauseMainMenuButton')?.addEventListener('click', () => {
            sm.returnToMenu();
        });

        // Audio controls
        document.getElementById('muteButton')?.addEventListener('click', () => {
            g.toggleMute();
        });
        document.getElementById('masterVolume')?.addEventListener('input', (e) => {
            g.setMasterVolume(parseInt(e.target.value, 10));
        });
        document.getElementById('musicVolume')?.addEventListener('input', (e) => {
            g.setMusicVolume(parseInt(e.target.value, 10));
        });
        document.getElementById('sfxVolume')?.addEventListener('input', (e) => {
            g.setSfxVolume(parseInt(e.target.value, 10));
        });

        // Play button sound for any menu buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && g.playButtonSound) {
                g.playButtonSound();
            }
        });
    }

    /**
     * Poll input service for shortcuts each frame.
     */
    update() {
        const input = this.game.services?.input || this.game.input;
        if (!input) return;
        const matches = (actionKeys, fallbacks) => {
            const list = actionKeys && actionKeys.length ? actionKeys : fallbacks;
            return list?.some(k => input.consume?.(k) || input.consumeKeyPress?.(k));
        };
        const controls = this.controls;
        const sm = this.game.stateManager;

        const debugKeys = (controls.toggleDebug && controls.toggleDebug.length) ? controls.toggleDebug : ['/'];
        if (matches(debugKeys, ['/'])) {
            this.game.debug = !this.game.debug;
            return;
        }
        if (matches(controls.toggleTest, ['F2'])) {
            this.game.toggleTestMode();
            return;
        }
        if (matches(controls.toggleMute, ['m', 'M'])) {
            this.game.toggleMute();
            return;
        }
        if (matches(controls.toggleInventory, ['i', 'I'])) {
            this.uiManager.toggleInventoryOverlay();
            return;
        }
        if (matches(controls.pause, ['Escape', 'p', 'P'])) {
            if (sm.isPlaying()) {
                sm.pauseGame();
            } else if (sm.isPaused()) {
                sm.resumeGame();
            }
        }
    }
}
