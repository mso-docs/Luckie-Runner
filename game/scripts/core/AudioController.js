/**
 * AudioController - bridges AudioService and DOM controls.
 */
class AudioController {
    constructor(game, audioService, config = {}) {
        this.game = game;
        this.audio = audioService;
        this.config = config.audio || {};
    }

    toggleMute() {
        if (!this.audio || !this.audio.toggleMute) return;
        const wasMuted = this.audio.isMuted?.() || false;
        this.audio.toggleMute();
        this.applyStateMusic(wasMuted);
        this.updateUI();
    }

    setMasterVolume(volume) {
        if (this.audio?.setMaster) {
            this.audio.setMaster(volume / 100);
            this.updateUI();
        }
    }

    setMusicVolume(volume) {
        if (this.audio?.setMusic) {
            this.audio.setMusic(volume / 100);
            this.updateUI();
        }
    }

    setSfxVolume(volume) {
        if (this.audio?.setSfx) {
            this.audio.setSfx(volume / 100);
            this.updateUI();
        }
    }

    updateUI() {
        const audio = this.audio;
        if (!audio) return;

        const muteButton = document.getElementById('muteButton');
        const masterVolumeSlider = document.getElementById('masterVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const masterVolumeValue = document.getElementById('masterVolumeValue');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');

        if (muteButton && audio.isMuted) {
            muteButton.textContent = audio.isMuted() ? '🔇 Unmute' : '🔊 Mute';
        }

        if (masterVolumeSlider && audio.getMasterVolume) {
            masterVolumeSlider.value = Math.round(audio.getMasterVolume() * 100);
        }
        if (musicVolumeSlider && audio.getMusicVolume) {
            musicVolumeSlider.value = Math.round(audio.getMusicVolume() * 100);
        }
        if (sfxVolumeSlider && audio.getSfxVolume) {
            sfxVolumeSlider.value = Math.round(audio.getSfxVolume() * 100);
        }

        if (masterVolumeValue && audio.getMasterVolume) {
            masterVolumeValue.textContent = Math.round(audio.getMasterVolume() * 100) + '%';
        }
        if (musicVolumeValue && audio.getMusicVolume) {
            musicVolumeValue.textContent = Math.round(audio.getMusicVolume() * 100) + '%';
        }
        if (sfxVolumeValue && audio.getSfxVolume) {
            sfxVolumeValue.textContent = Math.round(audio.getSfxVolume() * 100) + '%';
        }
    }

    applyConfigDefaults() {
        const a = this.config || {};
        const masterVolumeSlider = document.getElementById('masterVolume');
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        if (masterVolumeSlider && typeof a.master === 'number') {
            masterVolumeSlider.value = Math.round(a.master * 100);
        }
        if (musicVolumeSlider && typeof a.music === 'number') {
            musicVolumeSlider.value = Math.round(a.music * 100);
        }
        if (sfxVolumeSlider && typeof a.sfx === 'number') {
            sfxVolumeSlider.value = Math.round(a.sfx * 100);
        }
    }

    applyStateMusic(wasMuted) {
        const audio = this.audio;
        if (!audio) return;
        if (wasMuted && !audio.isMuted?.()) {
            const sm = this.game?.stateManager;
            if (sm?.isPlaying()) {
                audio.playMusic?.('level1', 0.8);
            } else if (sm?.isInMenu?.() || sm?.isState?.('gameOver')) {
                audio.playMusic?.('title', 0.8);
            }
        }
    }

    playMenuEnter() {
        this.audio?.playSound?.('menu_enter', 1);
    }

    playMenuExit() {
        this.audio?.playSound?.('menu_exit', 1);
    }

    playButton() {
        this.audio?.playSound?.('button', 1);
    }

    playPurchase() {
        this.audio?.playSound?.('purchase', 1);
    }
}
