class PauseScene {
    attach(game) {
        this.game = game;
    }

    enter() {
        this.game.running = false;
        this.game.stopLoop?.();
        this.game.stateManager.showMenu?.('pauseMenu');
        const audio = this.game?.services?.audio || this.game?.audioManager;
        if (audio) {
            const current = (audio.getMusicVolume ? audio.getMusicVolume() : this.game?.audioManager?.musicVolume) ?? 1;
            if (audio.setMusic) {
                audio.setMusic(current * 0.3);
            } else if (audio.setMusicVolume) {
                audio.setMusicVolume(current * 0.3);
            }
        }
    }

    exit() {
        this.game.stateManager.hideAllMenus?.();
        const audio = this.game?.services?.audio || this.game?.audioManager;
        if (audio) {
            const current = (audio.getMusicVolume ? audio.getMusicVolume() : this.game?.audioManager?.musicVolume) ?? 1;
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
