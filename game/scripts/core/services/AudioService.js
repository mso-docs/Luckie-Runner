/**
 * AudioService - adapter over AudioManager for DI.
 */
class AudioService {
    constructor(manager) {
        this.manager = manager;
    }

    playSound(id, vol = 1) {
        return this.manager?.playSound?.(id, vol);
    }

    playMusic(id, vol = 1) {
        return this.manager?.playMusic?.(id, vol);
    }

    stopAllMusic() {
        return this.manager?.stopAllMusic?.();
    }

    setMaster(vol) {
        return this.manager?.setMasterVolume?.(vol);
    }

    setMusic(vol) {
        return this.manager?.setMusicVolume?.(vol);
    }

    setSfx(vol) {
        return this.manager?.setSfxVolume?.(vol);
    }

    isMuted() {
        return this.manager?.isMuted?.() || false;
    }

    toggleMute(forceState = null) {
        return this.manager?.toggleMute?.(forceState);
    }

    getMasterVolume() {
        return this.manager?.getMasterVolume?.() ?? this.manager?.masterVolume ?? 0;
    }

    getMusicVolume() {
        return this.manager?.getMusicVolume?.() ?? this.manager?.musicVolume ?? 0;
    }

    getSfxVolume() {
        return this.manager?.getSfxVolume?.() ?? this.manager?.sfxVolume ?? 0;
    }

    get managerRef() {
        return this.manager;
    }
}
