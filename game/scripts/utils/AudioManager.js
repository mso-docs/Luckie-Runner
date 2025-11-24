/**
 * AudioManager - Handles music and sound effects for the game
 * Provides methods for loading, playing, and managing audio
 */
class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.masterVolume = 1.0;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.6;
        this.muted = false;
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
    }

    /**
     * Play a sound effect
     * @param {string} name - Sound identifier
     * @param {number} volume - Volume override (0-1)
     */
    playSound(name, volume = 1.0) {
        if (this.muted || !this.sounds[name]) return;

        const sound = this.sounds[name];
        sound.volume = this.masterVolume * this.sfxVolume * volume;
        
        // Clone audio for overlapping sounds
        const playSound = sound.cloneNode();
        playSound.volume = sound.volume;
        playSound.play().catch(e => console.warn('Could not play sound:', e));
    }

    /**
     * Play background music
     * @param {string} name - Music identifier
     * @param {number} volume - Volume override (0-1)
     */
    playMusic(name, volume = 1.0) {
        if (this.muted || !this.music[name]) return;

        // Stop current music
        this.stopAllMusic();

        const music = this.music[name];
        music.volume = this.masterVolume * this.musicVolume * volume;
        music.play().catch(e => console.warn('Could not play music:', e));
    }

    /**
     * Stop all music
     */
    stopAllMusic() {
        Object.values(this.music).forEach(music => {
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
    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopAllMusic();
        }
    }

    /**
     * Update volumes for all currently playing audio
     */
    updateAllVolumes() {
        Object.values(this.music).forEach(music => {
            music.volume = this.masterVolume * this.musicVolume;
        });
    }

    /**
     * Initialize common game sounds
     */
    initializeGameSounds() {
        // Sound effects (will be loaded when audio files are available)
        /*
        this.loadSound('jump', 'sfx/jump.mp3');
        this.loadSound('coin', 'sfx/coin.mp3');
        this.loadSound('hurt', 'sfx/hurt.mp3');
        this.loadSound('attack', 'sfx/attack.mp3');
        this.loadSound('enemy_death', 'sfx/enemy_death.mp3');
        this.loadSound('item_pickup', 'sfx/item_pickup.mp3');
        
        // Background music
        this.loadMusic('game', 'music/game_music.mp3');
        this.loadMusic('menu', 'music/menu_music.mp3');
        */
    }
}