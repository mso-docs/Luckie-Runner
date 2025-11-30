/**
 * BattleManager - minimal battle flow controller.
 * Handles battle definitions, state machine, and rendering hooks for the battle scene.
 */
class BattleManager {
    constructor(game) {
        this.game = game;
        this.activeBattle = null;
        this.state = 'idle'; // idle | intro | playerTurn | enemyTurn | resolved
        this.elapsed = 0;
        this.turnTimer = 0;
        this.returnInfo = null;
        this.queuedDefinition = null;
    }

    /**
     * Queue a battle definition to start on next scene enter.
     */
    queue(def = {}) {
        this.queuedDefinition = def;
    }

    /**
     * Begin the queued battle or a provided definition.
     */
    start(definition = null) {
        const def = definition || this.queuedDefinition || { id: 'unknown', enemyParty: [] };
        this.activeBattle = {
            ...def,
            playerParty: def.playerParty || [{ type: 'player', hp: this.game?.player?.health ?? 100 }],
            enemyParty: def.enemyParty || [{ type: 'Unknown', hp: 1 }],
            music: def.music || { id: 'battle', volume: 0.8 }
        };
        this.state = 'intro';
        this.elapsed = 0;
        this.turnTimer = 0;
        this.queuedDefinition = null;
    }

    /**
     * Finish the current battle and notify listeners.
     */
    resolve(outcome = 'win') {
        if (!this.activeBattle) return;
        this.state = 'resolved';
        this.activeBattle.outcome = outcome;
        if (typeof this.onComplete === 'function') {
            this.onComplete(this.activeBattle);
        }
    }

    /**
     * Tick battle state; minimal placeholder turn loop.
     */
    update(dt = 0, input = null) {
        if (!this.activeBattle) return;
        this.elapsed += dt;
        this.turnTimer += dt;

        // Simple input hooks to resolve quickly
        if (input?.consumeInteractPress?.()) {
            this.resolve('win');
            return;
        }
        if (input?.consumeKeyPress?.('escape')) {
            this.resolve('escape');
            return;
        }

        if (this.state === 'intro' && this.elapsed > 500) {
            this.state = 'playerTurn';
            this.turnTimer = 0;
        } else if (this.state === 'playerTurn' && this.turnTimer > 2000) {
            this.state = 'enemyTurn';
            this.turnTimer = 0;
        } else if (this.state === 'enemyTurn' && this.turnTimer > 1500) {
            this.state = 'playerTurn';
            this.turnTimer = 0;
        }
    }

    /**
     * Minimal battle rendering (background + text HUD).
     */
    render(renderCtx) {
        if (!this.activeBattle || !renderCtx) return;
        const { ctx, canvas } = renderCtx;
        if (!ctx || !canvas) return;

        // Clear and draw background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f0f1c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Simple horizon line
        ctx.fillStyle = '#1e2b4f';
        ctx.fillRect(0, canvas.height * 0.65, canvas.width, canvas.height * 0.35);

        ctx.fillStyle = '#7bd7ff';
        ctx.font = '18px monospace';
        ctx.textBaseline = 'top';
        ctx.fillText(`Battle: ${this.activeBattle.id || 'Unknown'}`, 20, 20);
        ctx.fillText(`State: ${this.state}`, 20, 44);
        ctx.fillText('Press Enter to win, Esc to escape', 20, 68);

        // Parties
        ctx.fillStyle = '#f2f2f2';
        ctx.fillText('Party:', 20, 110);
        this.activeBattle.playerParty.forEach((p, idx) => {
            ctx.fillText(`- ${p.type || 'Player'} (HP ${p.hp ?? '?'})`, 36, 132 + idx * 20);
        });

        ctx.fillText('Enemies:', canvas.width - 200, 110);
        this.activeBattle.enemyParty.forEach((e, idx) => {
            ctx.fillText(`- ${e.type || 'Enemy'} (HP ${e.hp ?? '?'})`, canvas.width - 184, 132 + idx * 20);
        });

        // Turn indicator bar
        const barWidth = Math.min(canvas.width - 40, Math.max(80, (this.turnTimer / 2000) * (canvas.width - 40)));
        ctx.fillStyle = '#ffb347';
        ctx.fillRect(20, canvas.height - 40, barWidth, 12);
    }
}
