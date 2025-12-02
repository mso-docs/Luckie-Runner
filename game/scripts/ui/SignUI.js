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

    showSignDialogue(target = null) {
        const dlg = this.signDialogue;
        const nearbySign = target || this.findNearbySign();
        if (!dlg.container || !nearbySign) return;

        dlg.target = nearbySign;
        dlg.messages = this.getMessagesForSign(nearbySign);
        dlg.index = 0;
        dlg.active = true;
        dlg.container.style.display = 'block';
        dlg.container.setAttribute('aria-hidden', 'false');
        dlg.container.classList.remove('hidden');
        dlg.container.classList.add('show');
        if (dlg.hint) dlg.hint.style.display = 'block';
        this.updateSignDialoguePosition();
        this.showSignDialogueText();
    }

    hideSignDialogue() {
        const dlg = this.signDialogue;
        if (!dlg.container) return;
        dlg.active = false;
        dlg.container.style.display = 'none';
        dlg.container.setAttribute('aria-hidden', 'true');
        dlg.container.classList.add('hidden');
        dlg.container.classList.remove('show');
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
        if (this.game.formatSpeechText) {
            textEl.innerHTML = this.game.formatSpeechText(message);
        } else if (this.game.applySpeechMarkup) {
            textEl.innerHTML = this.game.applySpeechMarkup(message);
        } else {
            textEl.innerHTML = message;
        }
    }

    updateSignDialoguePosition() {
        const dlg = this.signDialogue;
        if (!dlg.container || !dlg.target) return;
        
        // Check if player has walked too far from the sign
        const player = this.game.player;
        const sign = dlg.target;
        if (player && sign) {
            const playerCenterX = player.x + (player.width || 0) / 2;
            const playerCenterY = player.y + (player.height || 0) / 2;
            const signCenterX = sign.x + (sign.width || 0) / 2;
            const signCenterY = sign.y + (sign.height || 0) / 2;
            const dx = playerCenterX - signCenterX;
            const dy = playerCenterY - signCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 100) { // 100px max distance
                this.hideSignDialogue();
                return;
            }
        }
        
        const camera = this.game.camera || { x: 0, y: 0 };
        const canvas = this.game.canvas;
        if (!canvas) return;
        
        let targetX = sign.x - camera.x + sign.width / 2;
        let bottomFromCanvas = canvas.height - (sign.y - camera.y) + sign.height + 10;
        
        // Temporarily disable transitions for instant positioning
        const originalTransition = dlg.container.style.transition;
        dlg.container.style.transition = 'none';
        
        // Get actual rendered dimensions
        const bubbleWidth = dlg.container.offsetWidth > 0 ? dlg.container.offsetWidth : Math.min(460, canvas.width * 0.78);
        const bubbleHeight = dlg.container.offsetHeight > 0 ? dlg.container.offsetHeight : 120;
        
        // Clamp horizontal position (bubble uses left as center via transform: translate(-50%, 0))
        const padding = 60;
        const halfWidth = bubbleWidth / 2;
        const minX = halfWidth + padding;
        const maxX = canvas.width - halfWidth - padding;
        const clampedX = Math.max(minX, Math.min(maxX, targetX));
        
        // Clamp vertical position
        const minBottom = padding + 20;
        const maxBottom = canvas.height - bubbleHeight - padding;
        const clampedBottom = Math.max(minBottom, Math.min(maxBottom, bottomFromCanvas));
        
        dlg.container.style.left = `${clampedX}px`;
        dlg.container.style.bottom = `${clampedBottom}px`;
        dlg.container.setAttribute('aria-hidden', 'false');
        dlg.container.classList.remove('hidden');
        
        // Restore transitions after a frame
        requestAnimationFrame(() => {
            if (dlg.container) {
                dlg.container.style.transition = originalTransition;
            }
        });
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

    getMessagesForSign(sign) {
        // Priority: dialogueId -> dialogueLines -> defaults
        if (sign && sign.dialogueId && this.game.dialogueManager) {
            const fromId = this.game.dialogueManager.getLines(sign.dialogueId);
            if (fromId && fromId.length) return fromId;
        }
        if (sign && Array.isArray(sign.dialogueLines) && sign.dialogueLines.length) {
            return [...sign.dialogueLines];
        }
        if (this.signDialogue.defaultMessages.length) {
            return [...this.signDialogue.defaultMessages];
        }
        if (this.game.dialogueManager) {
            const fallback = this.game.dialogueManager.getLines('default_sign');
            if (fallback.length) return fallback;
        }
        return [];
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
        if (this.signDialogue.container) {
            this.signDialogue.container.classList.add('hidden');
            this.signDialogue.container.setAttribute('aria-hidden', 'true');
        }
    }
}
