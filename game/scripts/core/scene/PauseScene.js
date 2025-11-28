class PauseScene {
    attach(game) {
        this.game = game;
    }

    enter() {
        this.game.running = false;
        this.game.stopLoop?.();
        this.game.stateManager.showMenu?.('pauseMenu');
        if (this.game.audioManager) {
            this.game.audioManager.setMusicVolume(this.game.audioManager.getMusicVolume() * 0.3);
        }
    }

    exit() {
        this.game.stateManager.hideAllMenus?.();
        if (this.game.audioManager) {
            this.game.audioManager.setMusicVolume(this.game.audioManager.getMusicVolume() / 0.3);
        }
    }

    update() {
        // paused, no updates
    }

    render() {
        // paused, canvas frozen
    }
}
