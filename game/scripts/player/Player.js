/**
 * Player - Main character class for Luckie Puppy
 * Simple, reliable platformer movement
 */
class Player extends Entity {
    constructor(x, y) {
        // Tile-based sprite: 45x66 tiles
        super(x, y, 45, 66);
        
        // SMOOTH PHYSICS
        this.moveSpeed = 600; // pixels/second - max speed cap
        this.acceleration = 2000; // pixels/second² - gradual ramp up
        this.deceleration = 8000; // pixels/second² - ground stopping (85% faster: 1200 * 6.67 ≈ 8000)
        this.airDeceleration = 100; // pixels/second² - air resistance (very low)
        this.jumpStrength = -700; // pixels/second - negative = up (increased to compensate for higher gravity)
        this.gravity = 1000; // pixels/second² - falling acceleration (increased by 25%)
        
        // Simple state
        this.facing = 1; // 1 = right, -1 = left
        this.canJump = false; // Can only jump when on ground
        
        // Health and status
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.coins = 0;
        this.score = 0;
        
        // Rock throwing
        this.maxRocks = 10;
        this.rocks = 10;
        this.attackCooldown = 0;
        this.attackCooldownTime = 500; // 500ms cooldown
        
        // Load tile-based sprite sheet (45x66 tiles)
        // Animates first 2 tiles by default at 200ms per frame
        this.loadTileSheet('art/sprites/luckie-sprite.png', 45, 66, [0, 1], 200);

        // Hit flash stars (shared style with enemy impact)
        this.hitFlashTime = 0;
        this.hitFlashDuration = 600; // ms
        this.hitFlashAngle = -Math.PI / 2;
        this.hitFlashParticles = [];
        this.hitFlashDamage = 0;
    }

    /**
     * Set tile animation frames dynamically
     * @param {Array} frames - Array of tile indices [0, 1, 2, etc]
     * @param {number} speed - Animation speed in ms per frame
     */
    setTileAnimation(frames, speed = 200) {
        this.tileAnimationFrames = frames;
        this.tileAnimationSpeed = speed;
        this.tileAnimationIndex = 0;
        this.tileAnimationTime = 0;
        this.tileIndex = frames[0];
    }

    /**
     * Smooth movement with momentum
     * @param {number} deltaTime - Time since last frame in ms
     */
    onUpdate(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds
        const input = this.game.input;
        
        // HORIZONTAL MOVEMENT - Smooth acceleration/deceleration
        const movingLeft = input.isMovingLeft();
        const movingRight = input.isMovingRight();
        
        if (movingLeft && !movingRight) {
            // Accelerate left
            this.velocity.x -= this.acceleration * dt;
            if (this.velocity.x < -this.moveSpeed) {
                this.velocity.x = -this.moveSpeed;
            }
            this.facing = -1;
        } else if (movingRight && !movingLeft) {
            // Accelerate right
            this.velocity.x += this.acceleration * dt;
            if (this.velocity.x > this.moveSpeed) {
                this.velocity.x = this.moveSpeed;
            }
            this.facing = 1;
        } else {
            // No input - decelerate based on ground/air
            const decel = this.onGround ? this.deceleration : this.airDeceleration;
            
            if (this.velocity.x > 0) {
                this.velocity.x -= decel * dt;
                if (this.velocity.x < 0) this.velocity.x = 0;
            } else if (this.velocity.x < 0) {
                this.velocity.x += decel * dt;
                if (this.velocity.x > 0) this.velocity.x = 0;
            }
        }
        
        // JUMPING - Only when on ground
        if (input.isJumping() && this.onGround) {
            this.velocity.y = this.jumpStrength;
            this.onGround = false;
        }
        
        // ROCK THROWING - mouse click to toss toward cursor
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        if (input.isMouseClicked() && this.rocks > 0 && this.attackCooldown <= 0) {
            this.throwRock(input.getMousePosition());
        }
        
        // GRAVITY - Always pull down when not on ground
        if (!this.onGround) {
            this.velocity.y += this.gravity * dt;
        } else {
            // Stop falling when on ground
            if (this.velocity.y > 0) {
                this.velocity.y = 0;
            }
        }
        
        // Update position
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        
        // Update animations
        this.updateSimpleAnimation();
        
        // Decay hit flash timer
        if (this.hitFlashTime > 0) {
            this.hitFlashTime -= deltaTime;
        }

        // Update camera
        this.updateCamera();
    }

    /**
     * Simple animation - switch between idle and running tiles based on movement
     */
    updateSimpleAnimation() {
        // Check if player is moving
        const isMoving = Math.abs(this.velocity.x) > 10; // Small threshold to ignore tiny movements
        
        // Flip sprite when facing left (sprite faces right by default)
        this.flipX = this.facing === -1; // true when facing left, false when facing right
        
        if (isMoving) {
            // Running - use tile 1
            this.setTileAnimation([1], 0);
        } else {
            // Idle - use tile 0
            this.setTileAnimation([0], 0);
        }
    }

    /**
     * Throw a rock projectile
     * @param {Object} mousePos - Mouse position (unused in new system)
     */
    throwRock(mousePos) {
        const playerCenter = this.getCenter();
        const worldMouse = {
            x: this.game.camera.x + mousePos.x,
            y: this.game.camera.y + mousePos.y
        };
        
        // Aim toward the cursor; dampen Y a bit for a flatter arc
        const dirX = worldMouse.x - playerCenter.x;
        const dirY = worldMouse.y - playerCenter.y;
        const len = Math.hypot(dirX, dirY) || 1;
        const normalized = { x: dirX / len, y: dirY / len };
        
        // Speed tuned to travel about 4x player length, with a gentle arc
        const throwSpeed = this.moveSpeed * 1.2; // px/sec
        const velocity = {
            x: normalized.x * throwSpeed,
            y: normalized.y * throwSpeed * 0.6
        };
        
        const rock = new Rock(playerCenter.x - 4, playerCenter.y - 4, velocity);
        rock.setOwner(this, 'player');
        rock.game = this.game;
        
        // Range about 4x the player's body length
        rock.maxDistance = this.width * 4;
        
        // Add to game projectiles
        this.game.projectiles.push(rock);
        
        // Use rock and set cooldown
        this.rocks = Math.max(0, this.rocks - 1);
        this.attackCooldown = this.attackCooldownTime;
        
        // Update UI to show rock count
        this.updateUI();
        
        // Play attack sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('rock', 0.6);
        }
    }



    /**
     * Update camera to follow player smoothly
     */
    updateCamera() {
        if (!this.game.camera) return;
        
        const targetX = this.x - this.game.canvas.width / 2 + this.width / 2;
        const targetY = this.y - this.game.canvas.height / 2 + this.height / 2;
        
        // Smooth camera following with better responsiveness
        const lerpSpeed = 0.12;
        this.game.camera.x += (targetX - this.game.camera.x) * lerpSpeed;
        this.game.camera.y += (targetY - this.game.camera.y) * lerpSpeed;
    }

    /**
     * Override damage handling for player-specific effects
     * @param {number} amount - Damage amount
     * @param {Entity} source - Damage source
     */
    onTakeDamage(amount, source) {
        // Play hurt sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('hurt', 0.8);
        }

        // Star burst hit flash
        this.spawnHitFlash(source, amount);
        
        // Make invulnerable for a short time (1s i-frames)
        this.makeInvulnerable(1000);
        
        // Add noticeable knockback (push away and a small hop)
        const knockDir = source && source.x < this.x ? 1 : -1;
        this.velocity.x = knockDir * 250; // px/sec impulse
        this.velocity.y = Math.min(this.velocity.y, -220); // upward nudge
        this.onGround = false;
        
        // Update UI
        this.updateHealthUI();
    }

    /**
     * Spawn a floating damage number above the player
     */
    // Deprecated: damage number now replaced by star burst

    /**
     * Build a hit flash effect with stars and rays (player variant)
     * @param {Entity|null} source - What hit the player
     * @param {number} amount - Damage amount
     */
    spawnHitFlash(source, amount = 0) {
        this.hitFlashTime = this.hitFlashDuration;
        this.hitFlashDamage = amount;

        // Determine incoming angle (from source toward player)
        const playerCenter = this.getCenter();
        let angle = -Math.PI / 2;
        if (source && typeof source.x === 'number') {
            const srcCenter = source.getCenter ? source.getCenter() : { x: source.x, y: source.y };
            angle = Math.atan2(playerCenter.y - srcCenter.y, playerCenter.x - srcCenter.x);
        }
        this.hitFlashAngle = angle;

        const rays = [];
        const stars = [];
        const mainColors = ['#ffd166', '#ffe066', '#ffb703'];
        const pastel = ['#c8f2ff', '#dff6ff', '#f7e2ff', '#e8ffe7', '#fff0e0'];

        // Rays showing impact direction
        for (let i = 0; i < 8; i++) {
            const spread = (Math.PI / 3) * (Math.random() * 0.5 + 0.5);
            const offset = (i / 7 - 0.5) * spread;
            rays.push({
                angle: angle + offset,
                length: 28 + Math.random() * 14,
                width: 2 + Math.random() * 1.5,
                color: mainColors[i % mainColors.length]
            });
        }

        // One big yellow star with damage text
        stars.push({
            size: 12,
            angle: angle,
            distance: 36,
            color: '#ffd12f',
            stroke: '#e2a400',
            isBig: true,
            baseRotation: angle + Math.PI / 2,
            rotation: (Math.random() - 0.5) * 0.35
        });

        // Three small pastel stars with spacing
        const smallOffsets = [-0.5, 0.5, Math.PI * 0.85];
        for (let i = 0; i < 3; i++) {
            const dist = 46 + i * 8;
            stars.push({
                size: 6 + Math.random() * 1.5,
                angle: angle + smallOffsets[i],
                distance: dist,
                color: pastel[i % pastel.length],
                stroke: 'rgba(0,0,0,0.08)',
                isBig: false,
                baseRotation: angle + smallOffsets[i],
                rotation: (Math.random() - 0.5) * 0.5
            });
        }

        this.hitFlashParticles = { rays, stars };
    }

    /**
     * Render player with star hit flash overlay when hurt
     */
    render(ctx, camera = { x: 0, y: 0 }) {
        super.render(ctx, camera);

        if (this.hitFlashTime > 0) {
            const intensity = this.hitFlashTime / this.hitFlashDuration;
            const dir = {
                x: Math.cos(this.hitFlashAngle),
                y: Math.sin(this.hitFlashAngle)
            };
            const originX = this.x - camera.x + this.width / 2 - dir.x * (this.width * 0.2);
            const originY = this.y - camera.y + this.height * 0.2 - dir.y * (this.height * 0.2);
            const life = 1 - intensity;
            const wiggle = Math.sin(life * Math.PI * 4) * 6 * (0.6 + 0.4 * intensity);
            const perp = { x: -dir.y, y: dir.x };

            ctx.save();
            ctx.globalAlpha = Math.min(1, intensity);

            const { rays, stars } = this.hitFlashParticles || { rays: [], stars: [] };
            const bigStar = stars.find(s => s.isBig);
            const damageStarSize = bigStar ? bigStar.size * 5 : 30;

            // Impact rays
            rays.forEach(ray => {
                const len = ray.length * (0.6 + 0.4 * intensity);
                ctx.strokeStyle = ray.color;
                ctx.lineWidth = ray.width;
                ctx.beginPath();
                ctx.moveTo(originX, originY);
                ctx.lineTo(
                    originX + Math.cos(ray.angle) * len,
                    originY + Math.sin(ray.angle) * len
                );
                ctx.stroke();
            });

            // Pastel stars (behind)
            stars.filter(s => !s.isBig).forEach(star => {
                const dist = star.distance * (0.7 + 0.3 * intensity);
                let sx = originX + Math.cos(star.angle) * dist;
                let sy = originY + Math.sin(star.angle) * dist - this.height * 2.0;
                sx += perp.x * wiggle;
                sy += perp.y * wiggle;
                const size = damageStarSize / 3;
                const rot = (star.baseRotation || 0) + (star.rotation || 0) + Math.sin(life * Math.PI * 4) * 0.4;
                this.drawStar(ctx, sx, sy, size, star.color, star.stroke, rot);
            });

            // Big star on top with damage text
            if (bigStar) {
                const dist = bigStar.distance * (0.7 + 0.3 * intensity);
                let sx = originX + Math.cos(bigStar.angle) * dist;
                let sy = originY + Math.sin(bigStar.angle) * dist - this.height * 2.0;
                sx += perp.x * wiggle;
                sy += perp.y * wiggle;
                const rot = (bigStar.baseRotation || 0) + (bigStar.rotation || 0) + Math.sin(life * Math.PI * 4) * 0.35;
                this.drawStar(ctx, sx, sy, damageStarSize, bigStar.color, bigStar.stroke, rot);

                if (this.hitFlashDamage > 0) {
                    ctx.save();
                    ctx.font = 'bold 26px Arial';
                    ctx.fillStyle = '#ff8c00';
                    ctx.lineWidth = 6;
                    ctx.strokeStyle = '#000000';
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.shadowBlur = 10;
                    ctx.shadowOffsetX = 4;
                    ctx.shadowOffsetY = 4;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeText(String(this.hitFlashDamage), sx, sy);
                    ctx.fillText(String(this.hitFlashDamage), sx, sy);
                    ctx.restore();
                }
            }

            ctx.restore();
        }
    }

    /**
     * Draw a simple 5-point star (reused for hit flash)
     */
    drawStar(ctx, x, y, size, fill, stroke = null, rotation = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = Math.PI / 5 * i - Math.PI / 2;
            const radius = i % 2 === 0 ? size : size * 0.45;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Override death handling for player
     * @param {Entity} source - Death source
     */
    onDeath(source) {
        // Trigger game over
        if (this.game) {
            this.game.stateManager.gameOver();
        }
    }

    /**
     * Collect a coin
     * @param {number} value - Coin value
     */
    collectCoin(value = 1) {
        this.coins += value;
        const oldScore = this.score;
        this.score += value * 10;
        
        // Check for high score milestones (every 1000 points)
        const oldMilestone = Math.floor(oldScore / 1000);
        const newMilestone = Math.floor(this.score / 1000);
        
        if (newMilestone > oldMilestone && this.game.audioManager) {
            this.game.audioManager.playSound('high_score', 0.9);
        } else if (this.game.audioManager) {
            this.game.audioManager.playSound('coin', 0.7);
        }
        
        this.updateUI();
    }

    /**
     * Add rocks to inventory
     * @param {number} amount - Number of rocks to add
     */
    addRocks(amount) {
        this.rocks = Math.min(this.maxRocks, this.rocks + amount);
        
        // Play special pickup sound for rocks
        if (this.game.audioManager) {
            this.game.audioManager.playSound('special', 0.7);
        }
        
        this.updateUI();
    }

    /**
     * Update UI elements
     */
    updateUI() {
        const hudCoinsElement = document.getElementById('hudCoins');
        const hudRocksElement = document.getElementById('hudRocks');
        
        if (hudCoinsElement) hudCoinsElement.textContent = this.coins;
        if (hudRocksElement) hudRocksElement.textContent = this.rocks;
    }

    /**
     * Update health UI
     */
    updateHealthUI() {
        const healthFill = document.getElementById('healthFill');
        if (healthFill) {
            const healthPercent = Math.max(0, (this.health / this.maxHealth) * 100);
            healthFill.style.width = healthPercent + '%';
            
            let color = '#3fd97b'; // default green
            if (healthPercent <= 25) {
                color = '#ff5b5b'; // red for low health
            } else if (healthPercent <= 50) {
                color = '#ffd447'; // yellow for mid health
            }
            healthFill.style.backgroundColor = color;
        }
    }

    /**
     * Reset player to starting state
     */
    reset() {
        this.health = this.maxHealth;
        this.coins = 0;
        this.score = 0;
        this.rocks = this.maxRocks;
        this.attackCooldown = 0;
        this.velocity = { x: 0, y: 0 };
        this.facing = 1;
        this.invulnerable = false;
        this.tileAnimationIndex = 0;
        this.tileAnimationTime = 0;
        this.hitFlashTime = 0;
        this.hitFlashDamage = 0;
        this.updateUI();
        this.updateHealthUI();
    }
}
