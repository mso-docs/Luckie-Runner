class PauseScene {
    attach(ctx) {
        this.ctx = ctx;
    }

    enter() {
        this.ctx.setRunning?.(false);
        this.ctx.stopLoop?.();
        this.ctx.stateManager.showMenu?.('pauseMenu');
        const audio = this.ctx?.audio || this.ctx?.services?.audio;
        if (audio) {
            const current = audio.getMusicVolume ? audio.getMusicVolume() : 1;
            if (audio.setMusic) {
                audio.setMusic(current * 0.3);
            } else if (audio.setMusicVolume) {
                audio.setMusicVolume(current * 0.3);
            }
        }
    }

    exit() {
        this.ctx.stateManager.hideAllMenus?.();
        const audio = this.ctx?.audio || this.ctx?.services?.audio;
        if (audio) {
            const current = audio.getMusicVolume ? audio.getMusicVolume() : 1;
            const restored = current / 0.3;
            if (audio.setMusic) {
                audio.setMusic(restored);
            } else if (audio.setMusicVolume) {
                audio.setMusicVolume(restored);
            }
        }
    }

    update() {
        // paused, no updates
    }

    render() {
        // paused, canvas frozen
    }
}
