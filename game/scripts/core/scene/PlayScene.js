class PlayScene {
    attach(game) {
        this.game = game;
    }

    enter() {
        this.game.resetGame?.();
        this.game.initializeGameSystems?.();
        this.game.running = true;
        this.game.startLoop?.();
        const audio = this.game?.services?.audio || this.game?.audioManager;
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
