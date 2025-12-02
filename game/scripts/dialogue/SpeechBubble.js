/**
 * SpeechBubble - handles main dialogue bubble DOM interactions.
 */
class SpeechBubble {
    constructor(doc = document) {
        this.doc = doc;
        this.container = null;
        this.text = null;
        this.hint = null;
    }

    init() {
        this.container = this.doc.getElementById('speechBubble');
        this.text = this.doc.getElementById('speechText');
        this.hint = this.container ? this.container.querySelector('.speech-bubble__hint') : null;
        this.hide(true);
    }

    show(html) {
        if (!this.container || !this.text) return;
        this.text.innerHTML = html || '';
        this.container.classList.remove('hidden');
        this.container.classList.add('show');
        this.container.setAttribute('aria-hidden', 'false');
        this.container.style.display = 'block';
        if (this.hint) this.hint.classList.remove('hidden');
    }

    hide(immediate = false) {
        if (!this.container) return;
        this.container.classList.add('hidden');
        this.container.classList.remove('show');
        this.container.setAttribute('aria-hidden', 'true');
        if (immediate) {
            this.container.style.display = 'none';
        }
        if (this.hint) this.hint.classList.add('hidden');
    }

    setPosition(anchor, camera, canvas, tailOffsetPx = 40) {
        if (!this.container || !canvas) return;
        const cam = camera || { x: 0, y: 0 };
        let targetX = canvas.width / 2;
        let headY = canvas.height / 2;
        let anchorWidth = 0;
        let facingDir = 1;

        if (anchor) {
            const center = anchor.getCenter ? anchor.getCenter() : { x: anchor.x + (anchor.width || 0) / 2, y: anchor.y + (anchor.height || 0) / 2 };
            targetX = center.x - cam.x;
            headY = anchor.y - cam.y;
            anchorWidth = anchor.width || 0;
            facingDir = anchor.facing || 1;
        }

        // Temporarily disable transitions for instant positioning
        const originalTransition = this.container.style.transition;
        this.container.style.transition = 'none';
        
        // Get actual rendered dimensions
        const bubbleWidth = this.container.offsetWidth > 0 ? this.container.offsetWidth : Math.min(460, canvas.width * 0.78);
        const bubbleHeight = this.container.offsetHeight > 0 ? this.container.offsetHeight : 120;
        
        // Clamp horizontal position (bubble uses left as center via transform: translate(-50%, 0))
        const padding = 60;
        const halfWidth = bubbleWidth / 2;
        const minX = halfWidth + padding;
        const maxX = canvas.width - halfWidth - padding;
        const clampedX = Math.max(minX, Math.min(maxX, targetX));

        this.container.style.left = `${clampedX}px`;
        
        const aboveHeadOffset = 20;
        let bottomFromCanvas = canvas.height - headY + aboveHeadOffset;
        
        // Clamp vertical position to keep bubble within viewport
        const minBottom = padding + 20;
        const maxBottom = canvas.height - bubbleHeight - padding;
        const clampedBottom = Math.max(minBottom, Math.min(maxBottom, bottomFromCanvas));
        
        this.container.style.bottom = `${clampedBottom}px`;
        
        // Restore transitions after a frame
        requestAnimationFrame(() => {
            if (this.container) {
                this.container.style.transition = originalTransition;
            }
        });
        const mouthOffset = anchorWidth ? (anchorWidth * 0.22 * facingDir) + tailOffsetPx : tailOffsetPx + 10;
        this.container.style.setProperty('--tail-offset', `${mouthOffset}px`);
    }

    get refs() {
        return {
            container: this.container,
            text: this.text,
            hint: this.hint
        };
    }
}
