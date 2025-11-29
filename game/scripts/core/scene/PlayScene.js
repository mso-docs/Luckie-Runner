class PlayScene {
    attach(game) {
        this.game = game;
    }

    enter() {
        const audio = this.game?.services?.audio || this.game?.audioManager;
        this.game.resetAll?.({ resetAudio: true, resetUI: true, resetWorld: true });
        this.game.initializeGameSystems?.();
        this.game.running = true;
        this.game.stateManager?.setState?.('playing');
        this.game.startLoop?.();
        if (audio) {
            audio.playMusic?.('level1', 0.8);
        }
    }

    exit() {
        this.game.running = false;
        this.game.stopLoop?.();
    }

    update(dt) {
        this.game.onTick?.(dt, { gameTime: (this.game.gameTime || 0) + dt });
    }

    render() {
        this.game.render?.();
    }
}
