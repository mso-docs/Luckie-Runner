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
        this.animationComplete = false; // Tracks if door animation finished
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
        if (!this.game) {
            this.isOpen = false;
            this.currentFrame = 0;
            return;
        }

        const isRoom = this.game.activeWorld?.kind === 'room';
        if (!isRoom) {
            this.isOpen = false;
            this.currentFrame = 0;
            return;
        }

        const player = this.game.player;
        if (!player) {
            this.isOpen = false;
            this.currentFrame = 0;
            return;
        }

        // Get exit data from multiple possible sources
        let exit = null;
        if (this.game.roomManager?.room?.exit) {
            exit = this.game.roomManager.room.exit;
        } else if (typeof window !== 'undefined' && window.RoomDescriptors) {
            const roomId = this.game.activeWorld.id || this.game.currentRoomId;
            const roomDesc = window.RoomDescriptors[roomId];
            if (roomDesc?.exit) {
                exit = roomDesc.exit;
            }
        } else if (this.game.level?.exit) {
            exit = this.game.level.exit;
        }

        if (!exit) {
            this.isOpen = false;
            this.currentFrame = 0;
            return;
        }
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

        if (isNearExit && pressedInteract && !this.isOpen) {
            this.isOpen = true;
            this.openTimer = this.openDuration;
            this.currentFrame = 1;
            this.animationComplete = false;
        }

        // Count down the door animation timer
        if (this.isOpen && this.openTimer > 0) {
            this.openTimer -= deltaTime;
            if (this.openTimer <= 0) {
                this.animationComplete = true; // Signal that animation is done
                // Keep door open (don't auto-close)
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
        if (!this.game) return;
        
        // Check if we're in a room
        const isRoom = this.game.activeWorld?.kind === 'room';
        if (!isRoom) return;

        if (!this.doorSprite || !this.doorSprite.complete) return;
        
        // Get exit data from multiple possible sources
        let exit = null;
        
        // Try roomManager first (if using RoomManager)
        if (this.game.roomManager?.room?.exit) {
            exit = this.game.roomManager.room.exit;
        }
        // Try global RoomDescriptors (legacy)
        else if (typeof window !== 'undefined' && window.RoomDescriptors) {
            const roomId = this.game.activeWorld.id || this.game.currentRoomId;
            const roomDesc = window.RoomDescriptors[roomId];
            if (roomDesc?.exit) {
                exit = roomDesc.exit;
            }
        }
        // Try level object (some rooms store exit here)
        else if (this.game.level?.exit) {
            exit = this.game.level.exit;
        }
        
        if (!exit) return;

        const camX = camera?.x || 0;
        const camY = camera?.y || 0;

        // Calculate door position (centered horizontally on exit point, bottom at exit y)
        const doorX = exit.x - this.frameWidth / 2;
        const doorY = exit.y - this.frameHeight; // Bottom of door at exit y

        // Calculate source rectangle for sprite frame
        const srcX = this.currentFrame * this.frameWidth;
        const srcY = 0;

        // Scale up the door
        const scale = 2; // Make door 2x larger
        const scaledWidth = this.frameWidth * scale;
        const scaledHeight = this.frameHeight * scale;
        
        // Adjust position to keep door centered and bottom-aligned
        const scaledDoorX = exit.x - scaledWidth / 2;
        const scaledDoorY = exit.y - scaledHeight;

        // Draw the door
        ctx.drawImage(
            this.doorSprite,
            srcX, srcY, this.frameWidth, this.frameHeight,
            scaledDoorX - camX, scaledDoorY - camY, scaledWidth, scaledHeight
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
        this.animationComplete = false;
    }
    
    /**
     * Check if the door animation has completed (door is fully open)
     */
    canExit() {
        return this.animationComplete;
    }
}

// Expose for browser global
if (typeof window !== 'undefined') {
    window.DoorRenderer = DoorRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DoorRenderer;
}
