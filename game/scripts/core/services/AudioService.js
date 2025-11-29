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

    get managerRef() {
        return this.manager;
    }
}
