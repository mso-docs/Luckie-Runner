/**
 * ResetService - centralizes restoring audio/UI/world to defaults.
 */
class ResetService {
    constructor(game) {
        this.game = game;
    }

    /**
     * Reset everything: audio, UI overlays, and rebuild the world.
     * @param {Object} options
     * @param {boolean} options.resetAudio
     * @param {boolean} options.resetUI
     * @param {boolean} options.resetWorld
     * @param {boolean} options.applyConfigVolumes - apply GameConfig defaults to audio
     */
    resetAll(options = {}) {
        const opts = {
            resetAudio: true,
            resetUI: true,
            resetWorld: true,
            applyConfigVolumes: true,
            ...options
        };

        if (opts.resetAudio) {
            this.resetAudio(opts.applyConfigVolumes);
        }
        if (opts.resetUI) {
            this.resetUIOverlays();
        }
        if (opts.resetWorld && typeof this.game.resetGame === 'function') {
            this.game.resetGame();
        }
    }

    /**
     * Stop music/SFX and reapply config volumes.
     */
    resetAudio(applyConfigVolumes = true) {
        const audio = this.game?.services?.audio || this.game?.audioManager || null;
        if (!audio) return;

        if (audio.stopAllMusic) {
            audio.stopAllMusic();
        }

        if (applyConfigVolumes && this.game?.config?.audio) {
            const cfg = this.game.config.audio;
            if (audio.setMaster && typeof cfg.master === 'number') {
                audio.setMaster(cfg.master);
            }
            if (audio.setMusic && typeof cfg.music === 'number') {
                audio.setMusic(cfg.music);
            }
            if (audio.setSfx && typeof cfg.sfx === 'number') {
                audio.setSfx(cfg.sfx);
            }
            if (typeof cfg.muted === 'boolean' && audio.toggleMute) {
                const currentlyMuted = audio.isMuted ? audio.isMuted() : false;
                if (cfg.muted !== currentlyMuted) {
                    audio.toggleMute(cfg.muted);
                }
            }
        }

        if (typeof this.game.updateAudioUI === 'function') {
            this.game.updateAudioUI();
        }
    }

    /**
     * Hide overlays and reset dialogue/sign UI state.
     */
    resetUIOverlays() {
        const g = this.game;
        if (!g) return;

        g.hideSpeechBubble?.(true);
        g.hideInventoryOverlay?.(true);
        g.hideChestOverlay?.(true);
        g.hideShopOverlay?.(true);
        g.signUI?.reset?.();
        g.dialogueManager?.reset?.();

        const buffPanel = document.getElementById('buffPanel');
        const coffeeTimer = document.getElementById('coffeeTimer');
        if (buffPanel) buffPanel.classList.add('hidden');
        if (coffeeTimer) coffeeTimer.textContent = '--:--';
    }
}
