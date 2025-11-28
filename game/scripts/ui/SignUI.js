/**
 * SignUI - manages sign dialogue and callouts.
 */
class SignUI {
    constructor(game) {
        this.game = game;
        this.signCallout = null;
        this.signDialogue = {
            container: null,
            bubble: null,
            hint: null,
            textEl: null,
            active: false,
            target: null,
            messages: [],
            defaultMessages: [],
            index: 0
        };
    }

    setupSignDialogueUI() {
        const container = document.createElement('div');
        container.id = 'signDialogueContainer';
        container.className = 'speech-bubble sign-speech-bubble';
        container.setAttribute('aria-hidden', 'true');
        container.style.position = 'absolute';
        container.style.pointerEvents = 'none';
        container.style.display = 'none';
        const bubble = document.createElement('div');
        bubble.className = 'dialog-bubble sign-dialogue-bubble';
        bubble.style.marginBottom = '6px';

        const textEl = document.createElement('p');
        textEl.className = 'sign-dialogue-text';
        textEl.style.margin = '0';
        textEl.textContent = '';

        const hint = document.createElement('div');
        hint.className = 'speech-bubble__hint';
        hint.textContent = 'Press Enter';

        bubble.appendChild(textEl);
        bubble.appendChild(hint);

        container.appendChild(bubble);
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.appendChild(container);
            this.signDialogue.container = container;
            this.signDialogue.bubble = bubble;
            this.signDialogue.textEl = textEl;
            this.signDialogue.hint = hint;
            this.signDialogue.defaultMessages = [
                '<<<~HOWDY!~>>> It is I, your #friendly# neighborhood signboard. I am here to provide you with %important% information as you embark on your adventure.',
                'You _may_ find me scattered throughout the land, offering guidance, tips, and <<maybe>> even a joke or two to ^lighten^ your journey.',
                'You also may find me in places where you %least% expect it, so keep your eyes #peeled#. Safe travels, ^adventurer^!',
                'Also, you may want to #throw# some rocks at those ^slimes^. Just saying.'
            ];
            this.signDialogue.messages = [...this.signDialogue.defaultMessages];
        }
    }

    ensureSignCallout() {
        if (this.signCallout) return;
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            const bubble = document.createElement('div');
            bubble.className = 'sign-callout hidden';
            bubble.textContent = 'Press Enter';
            bubble.setAttribute('aria-hidden', 'true');
            gameContainer.appendChild(bubble);
            this.signCallout = bubble;
        }
    }

    isPlayerNearSign(sign) {
        if (!sign || !this.game.player) return false;
        const player = this.game.player;
        const sx = sign.x;
        const sy = sign.y;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dx = Math.abs(px - sx);
        const dy = Math.abs(py - sy);
        const proximityX = 80;
        const proximityY = 80;
        return dx < proximityX && dy < proximityY;
    }

    findNearbySign() {
        if (!this.game.player || !Array.isArray(this.game.signBoards)) return null;
        return this.game.signBoards.find(sign => this.isPlayerNearSign(sign)) || null;
    }

    toggleSignDialogue() {
        if (this.signDialogue.active) {
            this.hideSignDialogue();
        } else {
            this.showSignDialogue();
        }
    }

    showSignDialogue() {
        const dlg = this.signDialogue;
        const nearbySign = this.findNearbySign();
        if (!dlg.container || !nearbySign) return;

        dlg.target = nearbySign;
        dlg.messages = (nearbySign.dialogueLines && nearbySign.dialogueLines.length)
            ? [...nearbySign.dialogueLines]
            : [...dlg.defaultMessages];
        dlg.index = 0;
        dlg.active = true;
        dlg.container.style.display = 'block';
        dlg.container.setAttribute('aria-hidden', 'false');
        this.updateSignDialoguePosition();
        this.showSignDialogueText();
    }

    hideSignDialogue() {
        const dlg = this.signDialogue;
        if (!dlg.container) return;
        dlg.active = false;
        dlg.container.style.display = 'none';
        dlg.container.setAttribute('aria-hidden', 'true');
        dlg.target = null;
    }

    showSignDialogueText() {
        const dlg = this.signDialogue;
        const textEl = this.signDialogue.textEl;
        if (!textEl || !dlg.messages || dlg.index >= dlg.messages.length) {
            this.hideSignDialogue();
            return;
        }
        const message = dlg.messages[dlg.index];
        textEl.innerHTML = this.game.applySpeechMarkup ? this.game.applySpeechMarkup(message) : message;
    }

    updateSignDialoguePosition() {
        const dlg = this.signDialogue;
        if (!dlg.container || !dlg.target) return;
        const camera = this.game.camera || { x: 0, y: 0 };
        const sign = dlg.target;
        const targetX = sign.x - camera.x + sign.width / 2;
        const bottomFromCanvas = this.game.canvas.height - (sign.y - camera.y) + sign.height + 10;
        dlg.container.style.left = `${targetX}px`;
        dlg.container.style.bottom = `${bottomFromCanvas}px`;
    }

    showSignCallout() {
        this.ensureSignCallout();
    }

    updateSignCallout() {
        this.ensureSignCallout();
        if (!this.signCallout) return;
        const nearbySign = this.findNearbySign();
        const shouldShow = !this.signDialogue.active && nearbySign;
        if (!shouldShow) {
            this.signCallout.classList.add('hidden');
            this.signCallout.setAttribute('aria-hidden', 'true');
            return;
        }

        const camera = this.game.camera || { x: 0, y: 0 };
        const sign = nearbySign;
        const screenX = sign.x - camera.x + sign.width / 2;
        const screenY = sign.y - camera.y;
        this.signCallout.style.left = `${screenX}px`;
        const bottomFromCanvas = this.game.canvas.height - screenY + sign.height + 6;
        this.signCallout.style.bottom = `${bottomFromCanvas}px`;
        this.signCallout.classList.remove('hidden');
        this.signCallout.setAttribute('aria-hidden', 'false');
    }

    advanceSignDialogue() {
        const dlg = this.signDialogue;
        if (!dlg.active) return;
        dlg.index++;
        if (dlg.index >= dlg.messages.length) {
            this.hideSignDialogue();
            return;
        }
        this.showSignDialogueText();
        this.updateSignDialoguePosition();
    }

    reset() {
        this.hideSignDialogue();
        if (this.signCallout && this.signCallout.parentNode) {
            this.signCallout.parentNode.removeChild(this.signCallout);
        }
        this.signCallout = null;
        this.signDialogue.target = null;
        this.signDialogue.messages = [];
        this.signDialogue.index = 0;
    }
}
