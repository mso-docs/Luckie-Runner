/**
 * DoorRenderer - Handles rendering exit door sprites in interior rooms.
 * Displays a door at the exit zone with idle (closed) and open states.
 */
class DoorRenderer {
    constructor(game) {
        this.game = game;
        this.doorSprite = null;
        this.frameWidth = 32;
        this.frameHeight = 64;
        this.currentFrame = 0; // 0 = closed, 1 = open
        this.isOpen = false;
        this.openTimer = 0;
        this.openDuration = 500; // ms to show open frame
        this.loadDoorSprite();
    }

    loadDoorSprite() {
        this.doorSprite = new Image();
        this.doorSprite.decoding = 'async';
        this.doorSprite.onerror = (err) => {
            console.error('[DoorRenderer] Failed to load door sprite:', err);
        };
        this.doorSprite.src = 'art/bg/buildings/interior/door.png';
    }

    /**
     * Update the door state based on player position and input.
     */
    update(deltaTime) {
        if (!this.game || !this.game.roomManager?.isActive()) {
            this.isOpen = false;
            this.currentFrame = 0;
            return;
        }

        const room = this.game.roomManager.room;
        const player = this.game.player;
        
        if (!room || !player) {
            this.isOpen = false;
            this.currentFrame = 0;
            return;
        }

        const exit = room.exit || {};
        const isNearExit = this.isPlayerNearExit(player, exit);

        // Check if player pressed Enter/E while near exit
        // Check the keyPresses set to detect fresh presses (not held keys)
        const inputMgr = this.game.inputManager || this.game.input;
        const keys = inputMgr?.keyPresses;
        const pressedInteract = keys && (
            keys.has('enter') || 
            keys.has('numpadenter') || 
            keys.has('e') || 
            keys.has('keye')
        );

        if (isNearExit && pressedInteract) {
            this.isOpen = true;
            this.openTimer = this.openDuration;
            this.currentFrame = 1;
        }

        // Auto-close door after duration
        if (this.isOpen && this.openTimer > 0) {
            this.openTimer -= deltaTime;
            if (this.openTimer <= 0) {
                this.isOpen = false;
                this.currentFrame = 0;
            }
        }
    }

    /**
     * Check if player is within the exit radius.
     */
    isPlayerNearExit(player, exit) {
        if (!player || !exit) return false;

        const px = player.x + (player.width ? player.width / 2 : 0);
        const py = player.y + (player.height || 0);
        const ex = exit.x ?? 0;
        const ey = exit.y ?? 0;
        const radius = exit.radius ?? 64;

        const dx = px - ex;
        const dy = py - ey;
        const distSq = dx * dx + dy * dy;

        return distSq <= radius * radius;
    }

    /**
     * Render the door sprite at the exit position.
     */
    render(ctx, camera) {
        // DEBUG: Log everything
        console.log('[DoorRenderer.render] Called');
        console.log('  game:', !!this.game);
        console.log('  activeWorld:', this.game?.activeWorld);
        console.log('  roomManager:', !!this.game?.roomManager);
        console.log('  roomManager.active:', this.game?.roomManager?.active);
        console.log('  roomManager.room:', this.game?.roomManager?.room);
        console.log('  doorSprite:', !!this.doorSprite, 'complete:', this.doorSprite?.complete);
        
        // Quick early exits without logging spam
        if (!this.game) return;
        
        // Check if we're in a room (matches SceneRenderer logic)
        const isRoom = this.game.activeWorld?.kind === 'room';
        if (!isRoom) {
            console.log('  [DoorRenderer] Not in room, activeWorld.kind =', this.game.activeWorld?.kind);
            return;
        }
        
        // Get room from roomManager
        if (!this.game.roomManager) return;
        const room = this.game.roomManager.room;
        if (!room || !room.exit) {
            console.log('  [DoorRenderer] No room or exit:', { room: !!room, exit: room?.exit });
            return;
        }

        if (!this.doorSprite || !this.doorSprite.complete) {
            // Sprite still loading
            console.log('  [DoorRenderer] Sprite not ready');
            return;
        }
        
        console.log('  [DoorRenderer] RENDERING DOOR at exit:', room.exit);

        const exit = room.exit;
        const camX = camera?.x || 0;
        const camY = camera?.y || 0;

        // Calculate door position (centered on exit point)
        const doorX = exit.x - this.frameWidth / 2;
        const doorY = exit.y - this.frameHeight; // Position above exit point

        // Calculate source rectangle for sprite frame
        const srcX = this.currentFrame * this.frameWidth;
        const srcY = 0;



        // Draw the door
        ctx.drawImage(
            this.doorSprite,
            srcX, srcY, this.frameWidth, this.frameHeight,
            doorX - camX, doorY - camY, this.frameWidth, this.frameHeight
        );

        // Debug: Draw exit radius and door position
        if (this.game.debugMode) {
            ctx.save();
            
            // Draw exit radius
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(exit.x - camX, exit.y - camY, exit.radius || 64, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw door bounding box
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(doorX - camX, doorY - camY, this.frameWidth, this.frameHeight);
            
            // Draw exit point
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(exit.x - camX, exit.y - camY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    /**
     * Reset door state (useful when entering a new room).
     */
    reset() {
        this.isOpen = false;
        this.currentFrame = 0;
        this.openTimer = 0;
    }
}

// Expose for browser global
if (typeof window !== 'undefined') {
    window.DoorRenderer = DoorRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DoorRenderer;
}
