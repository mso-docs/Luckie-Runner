/**
 * DialogueManager - central lookup and simple delivery for dialogues by id.
 * Controls the main speech bubble (non-sign).
 */
class DialogueManager {
    constructor(game, dialogueMap = {}, bubble = null) {
        this.game = game;
        this.dialogues = dialogueMap || {};
        this.bubble = bubble;
        this.state = {
            messages: [],
            index: 0,
            active: false,
            anchor: null,
            onClose: null
        };
    }

    getLines(id) {
        if (!id) return [];
        const lines = this.dialogues[id];
        if (!lines) return [];
        return Array.isArray(lines) ? lines.slice() : [];
    }

    startById(id, anchor = null, onClose = null) {
        const msgs = this.getLines(id);
        if (!msgs.length) return false;
        return this.startDialog(msgs, anchor, onClose);
    }

    startDialog(messages = [], anchor = null, onClose = null) {
        if (!messages.length) return false;
        this.state.messages = messages.slice();
        this.state.index = 0;
        this.state.active = true;
        this.state.anchor = anchor || this.game.player || null;
        this.state.onClose = onClose;
        this.showCurrent();
        return true;
    }

    advance() {
        if (!this.state.active) return false;
        if (this.state.index < this.state.messages.length - 1) {
            this.state.index++;
            this.showCurrent();
            return true;
        }
        this.close();
        return false;
    }

    showCurrent() {
        const msg = this.state.messages[this.state.index];
        this.renderBubble(msg);
        this.updatePosition();
    }

    renderBubble(message) {
        const html = this.formatSpeechText(message);

        if (this.bubble) {
            this.bubble.show(html);
            return;
        }

        const bubble = this.game.speechBubble?.container;
        const text = this.game.speechBubble?.text;
        const hint = this.game.speechBubble?.hint;
        if (!bubble || !text) return;
        text.innerHTML = html;
        bubble.classList.remove('hidden');
        bubble.classList.add('show');
        bubble.setAttribute('aria-hidden', 'false');
        if (hint) hint.classList.remove('hidden');
        bubble.style.display = 'block';
    }

    updatePosition() {
        const render = this.game?.services?.render;
        const canvas = render?.canvas || this.game?.canvas;
        if (this.bubble) {
            this.bubble.setPosition(this.state.anchor || this.game.player, this.game.camera, canvas);
            return;
        }

        const bubble = this.game.speechBubble?.container;
        if (!bubble || !canvas) return;
        const anchor = this.state.anchor || this.game.player;
        const camera = this.game.camera || { x: 0, y: 0 };
        let targetX = canvas.width / 2;
        let headY = canvas.height / 2;
        let anchorWidth = 0;
        let facingDir = 1;
        if (anchor) {
            const center = anchor.getCenter ? anchor.getCenter() : { x: anchor.x + (anchor.width || 0) / 2, y: anchor.y + (anchor.height || 0) / 2 };
            targetX = center.x - camera.x;
            headY = anchor.y - camera.y;
            anchorWidth = anchor.width || 0;
            facingDir = anchor.facing || 1;
        }
        bubble.style.left = `${targetX}px`;
        const aboveHeadOffset = 20;
        const bottomFromCanvas = canvas.height - headY + aboveHeadOffset;
        bubble.style.bottom = `${bottomFromCanvas}px`;
        const mouthOffset = anchorWidth ? (anchorWidth * 0.22 * facingDir) + 40 : 50;
        bubble.style.setProperty('--tail-offset', `${mouthOffset}px`);
    }

    close() {
        if (this.bubble) {
            this.bubble.hide(true);
        } else {
            const bubble = this.game.speechBubble?.container;
            const hint = this.game.speechBubble?.hint;
            if (bubble) {
                bubble.style.display = 'none';
                bubble.classList.add('hidden');
                bubble.classList.remove('show');
                bubble.setAttribute('aria-hidden', 'true');
            }
            if (hint) hint.classList.add('hidden');
        }

        const onClose = this.state.onClose;
        this.state = {
            messages: [],
            index: 0,
            active: false,
            anchor: null,
            onClose: null
        };
        if (typeof onClose === 'function') onClose();
    }

    isActive() {
        return this.state.active;
    }

    reset() {
        this.close();
    }

    /**
     * Lightweight styling parser for speech text.
     */
    formatSpeechText(text) {
        if (typeof text !== 'string') return '';

        const escape = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        let safe = escape(text);
        const apply = (pattern, cls) => {
            safe = safe.replace(pattern, (_, inner) => `<span class="${cls}">${inner}</span>`);
        };

        apply(/&lt;&lt;&lt;(.+?)&gt;&gt;&gt;/g, 'speech-gigantic');
        apply(/&lt;&lt;(.+?)&gt;&gt;/g, 'speech-bigger');
        apply(/&lt;(.+?)&gt;/g, 'speech-big');
        apply(/_(.+?)_/g, 'speech-tiny');

        apply(/\*(.+?)\*/g, 'speech-bold');
        apply(/%(.+?)%/g, 'speech-shake');
        apply(/~(.+?)~/g, 'speech-rainbow');
        apply(/\^(.+?)\^/g, 'speech-glow');
        apply(/!(.+?)!/g, 'speech-bounce');
        apply(/`(.+?)`/g, 'speech-mono');
        safe = safe.replace(/#(.+?)#/g, (_, inner) => this.wrapWaveText(inner));

        return safe;
    }

    wrapWaveText(inner) {
        const letters = Array.from(inner);
        return letters.map((ch, i) => {
            const delay = (i * 0.06).toFixed(2);
            return `<span class="speech-wave-letter" style="animation-delay:${delay}s">${ch}</span>`;
        }).join('');
    }
}
