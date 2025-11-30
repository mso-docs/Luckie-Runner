/**
 * CutscenePlayer - runs scripted cutscene steps (dialogue, waits, audio cues).
 */
class CutscenePlayer {
    constructor(game) {
        this.game = game;
        this.current = null;
        this.currentIndex = 0;
        this.timer = 0;
        this.activeLine = '';
        this.isRunning = false;
        this.queuedScript = null;
    }

    queue(script = null) {
        this.queuedScript = script;
    }

    start(script = null) {
        this.current = script || this.queuedScript;
        this.queuedScript = null;
        if (!this.current) return;

        this.currentIndex = 0;
        this.timer = 0;
        this.activeLine = '';
        this.isRunning = true;
    }

    finish() {
        this.isRunning = false;
        if (typeof this.onComplete === 'function') {
            this.onComplete();
        }
    }

    nextStep() {
        if (!this.current) return;
        this.currentIndex += 1;
        this.timer = 0;
        this.activeLine = '';
        if (this.currentIndex >= (this.current.steps?.length || 0)) {
            this.finish();
        }
    }

    update(dt = 0, input = null) {
        if (!this.isRunning || !this.current) return;
        const steps = this.current.steps || [];
        const step = steps[this.currentIndex];
        if (!step) {
            this.finish();
            return;
        }

        // Global skip
        const skippable = step.skippable ?? this.current.skippable ?? true;
        if (skippable && input?.consumeKeyPress?.('escape')) {
            this.finish();
            return;
        }

        switch (step.action) {
            case 'playMusic': {
                const audio = this.game?.getAudio?.();
                if (audio && step.id) {
                    audio.playMusic?.(step.id, step.volume ?? 0.8);
                }
                this.nextStep();
                break;
            }
            case 'dialogue': {
                this.activeLine = this.activeLine || (Array.isArray(step.lines) ? step.lines.join(' ') : (step.lines || ''));
                if (input?.consumeInteractPress?.() || input?.consumeKeyPress?.('space')) {
                    this.nextStep();
                }
                break;
            }
            case 'panCamera': {
                // Placeholder timing-based completion; camera hook can be added later.
                this.timer += dt;
                if (this.timer >= (step.duration ?? 1000)) {
                    this.nextStep();
                }
                break;
            }
            case 'wait': {
                this.timer += dt;
                if (this.timer >= (step.duration ?? 1000)) {
                    this.nextStep();
                }
                break;
            }
            case 'finish': {
                this.finish();
                break;
            }
            default: {
                // Unknown action; advance to avoid stalls.
                this.nextStep();
            }
        }
    }

    render(renderCtx) {
        if (!this.isRunning || !renderCtx) return;
        const { ctx, canvas } = renderCtx;
        if (!ctx || !canvas) return;

        // Letterbox bars
        const barHeight = Math.max(20, canvas.height * 0.08);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, barHeight);
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        // Text
        const step = this.current?.steps?.[this.currentIndex];
        if (step && (step.action === 'dialogue' || this.activeLine)) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px monospace';
            ctx.textBaseline = 'top';
            const text = this.activeLine || (Array.isArray(step.lines) ? step.lines.join(' ') : (step.lines || ''));
            ctx.fillText(text, 24, canvas.height - barHeight + 8);
            ctx.fillStyle = '#ffd369';
            ctx.font = '14px monospace';
            ctx.fillText('Press Enter/Space to advance, Esc to skip', 24, canvas.height - barHeight + 28);
        }
    }
}
