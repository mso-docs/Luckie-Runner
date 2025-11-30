class BattleScene {
    attach(ctx) {
        this.ctx = ctx;
    }

    enter() {
        if (!this.ctx) return;
        const audio = this.ctx?.audio || this.ctx?.services?.audio;
        this.ctx.setRunning?.(true);
        this.ctx.stateManager?.setState?.(this.ctx.stateManager?.states?.BATTLE || 'battle');
        // Pause/duck previous music
        if (audio?.stopAllMusic) {
            audio.stopAllMusic();
        }
        // Begin queued battle
        this.ctx.battleManager?.start();
    }

    exit() {
        // Battle completion handled by Game.finishBattle
    }

    update() {
        // Battle loop is driven from Game.onTick for now.
    }

    render() {
        // Rendering happens via BattleManager.render within Game.onTick.
    }
}
