class PlayScene {
    attach(ctx) {
        this.ctx = ctx;
    }

    enter() {
        const audio = this.ctx?.audio || this.ctx?.services?.audio;
        this.ctx.resetAll?.({ resetAudio: true, resetUI: true, resetWorld: true });
        this.ctx.initializeGameSystems?.();
        this.ctx.setRunning?.(true);
        this.ctx.stateManager?.setState?.('playing');
        this.ctx.startLoop?.();
        if (audio) {
            audio.playMusic?.('level1', 0.8);
        }
    }

    exit() {
        this.ctx.setRunning?.(false);
        this.ctx.stopLoop?.();
    }

    update(dt) {
        this.ctx.onTick?.(dt, { gameTime: (this.ctx.getGameTime?.() || 0) + dt });
    }

    render() {
        this.ctx.render?.();
    }
}
