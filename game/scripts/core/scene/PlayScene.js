class PlayScene {
    attach(ctx) {
        this.ctx = ctx;
    }

    enter() {
        const audio = this.ctx?.audio || this.ctx?.services?.audio;
        const hasWorld = !!(this.ctx?.game?.player || this.ctx?.player);
        if (hasWorld) {
            // Resume without rebuilding the world (pause/battle/cutscene return).
            this.ctx.setRunning?.(true);
            this.ctx.stateManager?.setState?.(this.ctx.stateManager?.states?.PLAYING || 'playing');
            this.ctx.startLoop?.();
            if (audio && this.ctx.game?.currentLevelMusicId) {
                audio.playMusic?.(this.ctx.game.currentLevelMusicId, this.ctx.game.currentLevelMusicVolume ?? 0.8);
            }
            return;
        }
        this.ctx.resetAll?.({ resetAudio: true, resetUI: true, resetWorld: true });
        this.ctx.initializeGameSystems?.();
        this.ctx.setRunning?.(true);
        this.ctx.stateManager?.setState?.('playing');
        this.ctx.startLoop?.();
        if (audio) {
            this.ctx.currentLevelMusicId = 'level1';
            this.ctx.currentLevelMusicVolume = 0.8;
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
