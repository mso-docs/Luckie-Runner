/**
 * Chest - Interactable treasure chest with simple inventory UI hooks
 */
class Chest extends Entity {
    constructor(x, y) {
        super(x, y, 64, 64);

        this.loadSprite('art/items/chest.png');
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.currentFrame = 0;
        this.interactRadius = 90;
        this.isOpen = false;
        this.glowTime = 0;
        this.calloutEl = null;

        // Lightweight loot table for the prototype chest
        this.contents = [
            {
                id: 'coins',
                name: '25 Coins',
                description: 'Shiny pocket money for the cafe run.',
                take: (player) => player?.collectCoin && player.collectCoin(25)
            },
            {
                id: 'rocks',
                name: '8 Rocks',
                description: 'Ammo for Luckie’s trusty throw.',
                take: (player) => player?.addRocks && player.addRocks(8)
            },
            {
                id: 'potion',
                name: 'Small Potion (+25 HP)',
                description: 'A little pick-me-up before the next jump.',
                take: (player) => {
                    if (!player) return;
                    player.health = Math.min(player.maxHealth, player.health + 25);
                    if (player.updateHealthUI) player.updateHealthUI();
                }
            }
        ];
    }

    /**
     * Clean up DOM artifacts when the chest is removed
     */
    destroy() {
        if (this.calloutEl && this.calloutEl.parentNode) {
            this.calloutEl.parentNode.removeChild(this.calloutEl);
        }
    }

    /**
     * Open the chest and trigger visuals/audio
     */
    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.currentFrame = 1;
        this.glowTime = 0;

        if (this.game && this.game.audioManager) {
            this.game.audioManager.playSound('chest', 1);
        }
    }

    /**
     * Check if player is close enough to interact
     * @param {Player} player
     * @returns {boolean}
     */
    isPlayerNearby(player) {
        if (!player) return false;
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        return Math.hypot(dx, dy) <= this.interactRadius;
    }

    /**
     * Take a specific item from the chest
     * @param {string} id
     * @param {Player} player
     * @returns {boolean}
     */
    takeItem(id, player) {
        const item = this.contents.find(entry => entry.id === id && !entry.taken);
        if (!item) return false;
        if (typeof item.take === 'function') {
            item.take(player);
        }
        item.taken = true;
        return true;
    }

    /**
     * Take all remaining items
     * @param {Player} player
     * @returns {boolean} true if anything was taken
     */
    takeAll(player) {
        const available = this.getAvailableItems();
        available.forEach(entry => this.takeItem(entry.id, player));
        return available.length > 0;
    }

    /**
     * List untaken items
     * @returns {Array}
     */
    getAvailableItems() {
        return this.contents.filter(entry => !entry.taken);
    }

    /**
     * Update glow + callout positioning
     */
    onUpdate(deltaTime) {
        if (this.isOpen) {
            this.glowTime += deltaTime;
        }
        this.updateCallout();
    }

    /**
     * Create callout element if needed
     */
    ensureCallout() {
        if (this.calloutEl || !this.game) return;
        const container = document.getElementById('gameContainer');
        if (!container) return;

        const bubble = document.createElement('div');
        bubble.className = 'chest-callout hidden';
        bubble.textContent = 'Press E to open me!';
        bubble.setAttribute('aria-hidden', 'true');
        container.appendChild(bubble);
        this.calloutEl = bubble;
    }

    /**
     * Update callout visibility + screen position
     */
    updateCallout() {
        this.ensureCallout();
        if (!this.calloutEl || !this.game) return;

        const shouldShow = !this.isOpen &&
            !this.game?.chestUI?.isOpen &&
            this.isPlayerNearby(this.game.player);

        if (!shouldShow) {
            this.calloutEl.classList.add('hidden');
            this.calloutEl.setAttribute('aria-hidden', 'true');
            return;
        }

        const camera = this.game.camera || { x: 0, y: 0 };
        const screenX = this.x - camera.x + this.width / 2;
        const screenY = this.y - camera.y;
        const bottomFromCanvas = this.game.canvas.height - screenY + 8;

        this.calloutEl.style.left = `${screenX}px`;
        this.calloutEl.style.bottom = `${bottomFromCanvas}px`;
        this.calloutEl.classList.remove('hidden');
        this.calloutEl.setAttribute('aria-hidden', 'false');
    }

    /**
     * Render with a gold glow when open
     */
    render(ctx, camera) {
        if (!this.visible) return;

        const hasLoot = this.getAvailableItems().length > 0;
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        if (
            screenX + this.width < 0 ||
            screenX > ctx.canvas.width ||
            screenY + this.height < 0 ||
            screenY > ctx.canvas.height
        ) {
            return;
        }

        // Grounded shadow
        this.renderShadow(ctx, screenX, camera);

        ctx.save();
        ctx.globalAlpha = this.alpha;
        if (this.isOpen && hasLoot) {
            ctx.shadowColor = 'rgba(255, 215, 0, 0.85)';
            ctx.shadowBlur = 24;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        ctx.scale(this.scale.x, this.scale.y);

        if (this.sprite && this.spriteLoaded) {
            const frameW = Math.min(this.frameWidth, this.sprite.width);
            const sourceX = Math.min(
                this.sprite.width - frameW,
                this.currentFrame * frameW
            );
            ctx.drawImage(
                this.sprite,
                sourceX,
                0,
                frameW,
                this.frameHeight,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
        }
        ctx.restore();

        if (this.isOpen && hasLoot) {
            const pulse = 0.6 + Math.sin(this.glowTime * 0.01) * 0.15;
            const cx = this.x - camera.x + this.width / 2;
            const cy = this.y - camera.y + this.height / 2 + 6;
            const radius = 70;
            const gradient = ctx.createRadialGradient(cx, cy, 8, cx, cy, radius);
            gradient.addColorStop(0, `rgba(255, 223, 128, ${0.45 * pulse})`);
            gradient.addColorStop(1, 'rgba(255, 223, 128, 0)');

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
