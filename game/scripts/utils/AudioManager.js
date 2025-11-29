/**
 * AudioManager - Handles music and sound effects for the game
 * Provides methods for loading, playing, and managing audio
 */
class AudioManager {
    constructor(config = null) {
        this.sounds = {};
        this.music = {};
        this.musicMix = {};
        this.masterVolume = config?.audio?.master ?? 1.0;
        this.sfxVolume = config?.audio?.sfx ?? 0.8;
        this.musicVolume = config?.audio?.music ?? 0.6;
        this.muted = config?.audio?.muted ?? false;
        this.currentMusicId = null;
    }

    /**
     * Load a sound effect
     * @param {string} name - Identifier for the sound
     * @param {string} src - Path to audio file
     */
    loadSound(name, src) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        this.sounds[name] = audio;
    }

    /**
     * Load background music
     * @param {string} name - Identifier for the music
     * @param {string} src - Path to audio file
     */
    loadMusic(name, src) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.loop = true;
        this.music[name] = audio;
        this.musicMix[name] = 1;
    }

    /**
     * Play a sound effect
     * @param {string} name - Sound identifier
     * @param {number} volume - Volume override (0-1)
     */
    playSound(name, volume = 1.0) {
        if (this.muted || !this.sounds[name]) {
            // For now, just log the sound that would be played
            // Playing sound
            return;
        }

        const sound = this.sounds[name];
        sound.volume = this.masterVolume * this.sfxVolume * volume;
        
        // Clone audio for overlapping sounds
        const playSound = sound.cloneNode();
        playSound.volume = sound.volume;
        playSound.play().catch(e => {/* Sound play failed - silently ignore */});
    }

    /**
     * Play background music
     * @param {string} name - Music identifier
     * @param {number} volume - Volume override (0-1)
     * @returns {Promise} Promise that resolves when music starts or rejects if blocked
     */
    playMusic(name, volume = 1.0, options = {}) {
        if (this.muted || !this.music[name]) {
            // Music not played
            return Promise.resolve();
        }

        const allowParallel = options.allowParallel || false;
        const restartIfPlaying = options.restartIfPlaying !== undefined ? options.restartIfPlaying : true;

        // Stop current music unless explicitly mixing
        if (!allowParallel) {
            this.stopAllMusic(name);
            this.currentMusicId = name;
        }

        const music = this.music[name];
        this.musicMix[name] = Math.max(0, Math.min(1, volume));
        this.updateTrackVolume(name);

        if (!restartIfPlaying && !music.paused) {
            return Promise.resolve();
        }
        
        // Attempting to play music
        return music.play().catch(e => {
            // Could not play music - rethrowing
            throw e;
        });
    }

    /**
     * Stop all music
     */
    stopAllMusic(exceptName = null) {
        Object.entries(this.music).forEach(([name, music]) => {
            if (exceptName && name === exceptName) return;
            music.pause();
            music.currentTime = 0;
        });
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Set SFX volume
     * @param {number} volume - Volume level (0-1)
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Set music volume
     * @param {number} volume - Volume level (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Toggle mute state
     */
    toggleMute(forceState = null) {
        this.muted = forceState === null ? !this.muted : !!forceState;
        if (this.muted) {
            this.stopAllMusic();
        } else {
            // Store reference to game for context-aware music restart
            this.restartContextualMusic();
        }
    }

    /**
     * Restart music based on current game context
     */
    restartContextualMusic() {
        // This will be called by the game when unmuting
        // The game will determine which music to play based on current state
    }

    /**
     * Update volumes for all currently playing audio
     */
    updateAllVolumes() {
        Object.keys(this.music).forEach(name => this.updateTrackVolume(name));
    }

    /**
     * Update a single track's volume using its mix value.
     */
    updateTrackVolume(name) {
        const music = this.music[name];
        if (!music) return;
        const mix = this.musicMix[name] ?? 1;
        music.volume = this.masterVolume * this.musicVolume * mix;
    }

    /**
     * Set a track-specific volume mix (0-1).
     */
    setTrackVolume(name, volume) {
        this.musicMix[name] = Math.max(0, Math.min(1, volume));
        this.updateTrackVolume(name);
    }

    /**
     * Get the mix volume for a specific track.
     */
    getTrackVolume(name) {
        return this.musicMix[name] ?? 0;
    }

    /**
     * Initialize common game sounds
     */
    initializeGameSounds() {
        // Sound effects - load all available sound files
        this.loadSound('coin', 'sfx/coin.mp3');
        this.loadSound('game_over', 'sfx/game-over.mp3');
        this.loadSound('health', 'sfx/health.mp3');
        this.loadSound('less', 'sfx/less.mp3');
        this.loadSound('great', 'sfx/great.mp3');
        this.loadSound('hurt', 'sfx/hurt.mp3');
        this.loadSound('jump', 'sfx/jump.mp3');
        this.loadSound('level', 'sfx/level.mp3');
        this.loadSound('coffee', 'sfx/coffee.mp3');
        this.loadSound('slime_patrol', 'sfx/slime-patrol.mp3');
        this.loadSound('rock', 'sfx/rock.mp3');
        this.loadSound('coconut', 'sfx/coconut.mp3');
        this.loadSound('slime_defeat', 'sfx/slime-defeat.mp3');
        this.loadSound('slimy', 'sfx/slimy.mp3');
        this.loadSound('special', 'sfx/special.mp3');
        this.loadSound('high_score', 'sfx/high-score.mp3');
        this.loadSound('chest', 'sfx/chest.mp3');
        this.loadSound('button', 'sfx/button.mp3');
        this.loadSound('menu_enter', 'sfx/menu-enter.mp3');
        this.loadSound('menu_exit', 'sfx/menu-exit.mp3');
        this.loadSound('purchase', 'sfx/purchase.mp3');
        this.loadSound('badge', 'sfx/badge.mp3');
        
        // Additional sound aliases for backwards compatibility
        this.loadSound('attack', 'sfx/rock.mp3'); // Rock throwing sound
        this.loadSound('enemy_death', 'sfx/slime-defeat.mp3'); // Enemy defeat sound
        this.loadSound('item_pickup', 'sfx/special.mp3'); // Item pickup sound
        this.loadSound('victory', 'sfx/level.mp3'); // Level complete sound
        this.loadSound('hit', 'sfx/slimy.mp3'); // Hit enemy sound
        this.loadSound('health_pickup', 'sfx/health.mp3'); // Health potion sound
        
        // Background music (add a cache-bust so replaced files take effect)
        const titleSrc = 'music/titlescreen.mp3?v=1';
        this.loadMusic('title', titleSrc);
        this.loadMusic('level1', 'music/overworld.mp3'); // main level theme
    }

    /**
     * Get current master volume
     * @returns {number} Current master volume (0-1)
     */
    getMasterVolume() {
        return this.masterVolume;
    }

    /**
     * Get current SFX volume
     * @returns {number} Current SFX volume (0-1)
     */
    getSfxVolume() {
        return this.sfxVolume;
    }

    /**
     * Get current music volume
     * @returns {number} Current music volume (0-1)
     */
    getMusicVolume() {
        return this.musicVolume;
    }

    /**
     * Get mute state
     * @returns {boolean} True if muted
     */
    isMuted() {
        return this.muted;
    }

    /**
     * Check if a music track is currently playing
     * @param {string} name - Music identifier
     * @returns {boolean}
     */
    isMusicPlaying(name) {
        const track = this.music[name];
        if (!track) return false;
        return !track.paused && track.currentTime > 0 && !track.ended;
    }
}
