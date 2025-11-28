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
        
        this.maxAirJumps = 0; // extra jumps granted by buffs (e.g., climbing shoes)
        this.remainingAirJumps = 0; // replenished when grounded
        this.jumpHeld = false; // used to detect fresh jump presses for mid-air jumps
        this.spaceJumpHeld = false; // tracks spacebar state for double-jump activation

        this.baseMoveSpeed = this.moveSpeed;
        this.baseAcceleration = this.acceleration;
        this.baseDeceleration = this.deceleration;
        this.baseAirDeceleration = this.airDeceleration;

        // Temporary speed buff (coffee)
        this.coffeeBuff = { active: false, remaining: 0, multiplier: 1 };
        this.climbingBuff = { active: false, remaining: 0, extraJumps: 0 };
        this.buffHud = {
            panel: document.getElementById('buffPanel'),
            coffeeTimer: document.getElementById('coffeeTimer'),
            coffeeRow: document.getElementById('coffeeBuffRow'),
            climbTimer: document.getElementById('climbTimer'),
            climbRow: document.getElementById('climbBuffRow')
        };

        // Simple state
        this.facing = 1; // 1 = right, -1 = left
        this.canJump = false; // Can only jump when on ground
        
        // Health and status
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.coins = 0;
        this.score = 0;
        this.healthPotions = 0;
        this.coffeeDrinks = 0;
        this.level = 1;
        this.combatModifiers = { slimeAttack: 0, slimeDefense: 0 };
        
        // Rock throwing
        this.maxRocks = 10;
        this.throwables = new ThrowableManager(this);
        this.throwables.registerType('rock', {
            maxAmmo: this.maxRocks,
            ammo: this.maxRocks,
            initialAmmo: this.maxRocks,
            icon: 'art/items/rock-item.png',
            displayName: 'Rocks',
            createProjectile: (player, worldTarget) => {
                const playerCenter = player.getCenter();
                const dirX = worldTarget.x - playerCenter.x;
                const dirY = worldTarget.y - playerCenter.y;
                const len = Math.hypot(dirX, dirY) || 1;
                const normalized = { x: dirX / len, y: dirY / len };
                
                const throwSpeed = player.moveSpeed * 1.2; // px/sec
                const velocity = {
                    x: normalized.x * throwSpeed,
                    y: normalized.y * throwSpeed * 0.6
                };
                
                const rock = new Rock(playerCenter.x - 4, playerCenter.y - 4, velocity);
                rock.setOwner(player, 'player');
                rock.game = player.game;
                rock.maxDistance = player.width * 4;
                return rock;
            }
        });
        this.throwables.registerType('coconut', {
            maxAmmo: 10,
            ammo: 10,
            initialAmmo: 10,
            icon: 'art/items/coconut.png',
            displayName: 'Coconuts',
            description: 'Heavy rolling coconut that bounces and slows to a stop.',
            createProjectile: (player, worldTarget) => {
                const playerCenter = player.getCenter();
                const dirX = worldTarget.x - playerCenter.x;
                const dirY = worldTarget.y - playerCenter.y;
                const len = Math.hypot(dirX, dirY) || 1;
                const normalized = { x: dirX / len, y: dirY / len };
                
                const throwSpeed = player.moveSpeed * 1.0; // slightly slower than rocks
                const velocity = {
                    x: normalized.x * throwSpeed,
                    y: normalized.y * throwSpeed * 0.4
                };
                
                const coco = new Coconut(playerCenter.x - 6, playerCenter.y - 6, velocity);
                coco.setOwner(player, 'player');
                coco.game = player.game;
                return coco;
            }
        });
        this.throwables.setActive('rock');
        this.attackCooldown = 0;
        this.attackCooldownTime = 500; // 500ms cooldown

        // Hit reaction tilt/knockback
        this.knockbackTiltTime = 0;
        this.knockbackTiltDuration = 1000; // matches i-frame window
        this.knockbackTiltDir = 1;
        
        // Load tile-based sprite sheet (45x66 tiles)
        // Animates first 2 tiles by default at 200ms per frame
        this.loadTileSheet('art/sprites/luckie-sprite.png', 45, 66, [0, 1], 200);

        // Hit flash stars (shared style with enemy impact)
        this.hitFlashTime = 0;
        this.hitFlashDuration = 600; // ms
        this.hitFlashAngle = -Math.PI / 2;
        this.hitFlashParticles = [];
        this.hitFlashDamage = 0;
        this.hitRayDuration = 500; // ms for quick pow lines
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

        // Update timed buffs
        this.updateCoffeeBuff(deltaTime);
        this.updateClimbingBuff(deltaTime);
        
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
        if (this.onGround) {
            // Refresh air jumps whenever grounded
            this.remainingAirJumps = this.maxAirJumps;
        }

        const jumpPressed = input.isJumping();
        const spacePressed = input.isSpaceJumping ? input.isSpaceJumping() : false;
        const jumpJustPressed = jumpPressed && !this.jumpHeld;
        const spaceJustPressed = spacePressed && !this.spaceJumpHeld;

        if (jumpPressed && this.onGround) {
            this.velocity.y = this.jumpStrength;
            this.onGround = false;
        } else if (spaceJustPressed && !this.onGround && this.remainingAirJumps > 0) {
            // Mid-air jump granted by climbing shoes (spacebar only)
            this.velocity.y = this.jumpStrength;
            this.remainingAirJumps -= 1;
        }
        this.jumpHeld = jumpPressed;
        this.spaceJumpHeld = spacePressed;
        
        // ROCK THROWING - mouse click to toss toward cursor
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        if (input.isMouseClicked() && this.throwables?.canThrow() && this.attackCooldown <= 0) {
            this.throwActive(input.getMousePosition());
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
        
        // Decay knockback tilt during i-frames
        if (this.knockbackTiltTime > 0) {
            this.knockbackTiltTime -= deltaTime;
            const t = Math.max(0, this.knockbackTiltTime) / this.knockbackTiltDuration;
            this.rotation = -this.knockbackTiltDir * 0.35 * t;
        } else if (this.rotation !== 0) {
            this.rotation = 0;
        }

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
     * Throw active throwable
     * @param {Object} mousePos
     */
    throwActive(mousePos) {
        const playerCenter = this.getCenter();
        const worldMouse = {
            x: this.game.camera.x + mousePos.x,
            y: this.game.camera.y + mousePos.y
        };
        
        const projectile = this.throwables?.createActiveProjectile(worldMouse);
        if (!projectile) return;

        // Add to game projectiles
        this.game.projectiles.push(projectile);

        // Play throw sound if available
        if (projectile.throwSound && this.game.audioManager) {
            this.game.audioManager.playSound(projectile.throwSound, 0.7);
        }
        
        // Use ammo and set cooldown
        this.throwables.consumeActive(1);
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
     * Apply badge-based mitigation before processing damage
     * @param {number} amount
     * @param {Entity|null} source
     */
    takeDamage(amount, source = null) {
        let adjusted = amount;
        const fromSlime = source && source.type === 'slime';
        if (fromSlime && this.combatModifiers) {
            const reduction = this.combatModifiers.slimeDefense || 0;
            adjusted = Math.max(0, amount - reduction);
        }

        if (adjusted <= 0) {
            return false;
        }

        return super.takeDamage(adjusted, source);
    }

    /**
     * Adjust outgoing damage with badge bonuses
     * @param {number} baseDamage
     * @param {Entity|null} target
     * @returns {number}
     */
    modifyOutgoingDamage(baseDamage, target = null) {
        let damage = baseDamage;
        const isSlimeTarget = target && target.type === 'slime';
        if (isSlimeTarget && this.combatModifiers) {
            damage += this.combatModifiers.slimeAttack || 0;
        }
        return Math.max(0, damage);
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
        this.velocity.x = knockDir * 450; // stronger horizontal knockback
        this.velocity.y = Math.min(this.velocity.y, -280); // higher hop
        this.onGround = false;

        // Tilt back during invulnerability to feel the knockback fall
        this.knockbackTiltDir = knockDir;
        this.knockbackTiltTime = this.knockbackTiltDuration;
        this.rotation = -knockDir * 0.35;
        
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

        // Five rays in an upper semicircle for visibility
        const rayCount = 5;
        const start = -Math.PI;  // left/up
        const end = 0;           // right/up
        for (let i = 0; i < rayCount; i++) {
            const t = rayCount === 1 ? 0.5 : i / (rayCount - 1);
            const rayAngle = start + (end - start) * t;
            rays.push({
                angle: rayAngle,
                length: 30 + Math.random() * 12, // larger, more pronounced rays
                width: 2 + Math.random() * 1.5
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
            const side = dir.x >= 0 ? 1 : -1;
            const starOriginX = this.x - camera.x + this.width / 2 + side * (this.width * 0.6);
            const starOriginY = this.y - camera.y - this.height * 0.6; // above the ground but near body
            const rayOriginX = this.x - camera.x + this.width / 2 + side * 10; // a bit wider origin for spread
            const rayOriginY = starOriginY;
            const life = 1 - intensity;
            const wiggle = Math.sin(life * Math.PI * 4) * 6 * (0.6 + 0.4 * intensity);
            const perp = { x: -dir.y, y: dir.x };
            const rayElapsed = this.hitFlashDuration - this.hitFlashTime;
            const rayIntensity = Math.max(0, 1 - rayElapsed / this.hitRayDuration);

            ctx.save();
            ctx.globalAlpha = Math.min(1, intensity);

            const { rays, stars } = this.hitFlashParticles || { rays: [], stars: [] };
            const bigStar = stars.find(s => s.isBig);
            const damageStarSize = bigStar ? bigStar.size * 5 : 30;

            // Impact rays
            if (rayElapsed < this.hitRayDuration) {
                ctx.save();
                ctx.globalAlpha = rayIntensity * 0.7; // slightly transparent rays
                rays.forEach(ray => {
                    const len = ray.length * (0.6 + 0.4 * rayIntensity);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = ray.width;
                    const startX = rayOriginX + Math.cos(ray.angle) * 10;
                    const startY = Math.min(rayOriginY + Math.sin(ray.angle) * 10, rayOriginY); // clamp to upper half
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(
                        startX + Math.cos(ray.angle) * len,
                        startY + Math.sin(ray.angle) * len
                    );
                    ctx.stroke();
                });
                ctx.restore();
            }

            // Pastel stars (behind)
            stars.filter(s => !s.isBig).forEach(star => {
                const dist = star.distance * (0.7 + 0.3 * intensity);
                let sx = starOriginX + Math.cos(star.angle) * dist;
                let sy = starOriginY + Math.sin(star.angle) * dist - this.height * 2.0;
                sx += perp.x * wiggle;
                sy += perp.y * wiggle;
                const size = damageStarSize / 3;
                const rot = (star.baseRotation || 0) + (star.rotation || 0) + Math.sin(life * Math.PI * 4) * 0.4;
                this.drawStar(ctx, sx, sy, size, star.color, star.stroke, rot);
            });

            // Big star on top with damage text
            if (bigStar) {
                const dist = bigStar.distance * (0.7 + 0.3 * intensity);
                let sx = starOriginX + Math.cos(bigStar.angle) * dist;
                let sy = starOriginY + Math.sin(bigStar.angle) * dist - this.height * 2.0;
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
        const newCount = this.throwables?.addAmmo('rock', amount);
        
        if (this.game.audioManager) {
            this.game.audioManager.playSound('special', 0.7);
        }
        this.updateUI();
        return newCount;
    }

    setActiveThrowable(key) {
        if (this.throwables) {
            this.throwables.setActive(key);
            this.updateUI();
        }
    }

    /**
     * Add coffee drinks to inventory (stored for use)
     * @param {number} amount
     */
    addCoffee(amount = 1) {
        this.coffeeDrinks = Math.max(0, this.coffeeDrinks + amount);
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playSound('special', 0.7);
        }
        this.updateUI();
    }

    /**
     * Add health potions to inventory (stored for later use)
     * @param {number} amount
     */
    addHealthPotion(amount = 1) {
        this.healthPotions = Math.max(0, this.healthPotions + amount);
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playSound('health', 0.7);
        }
        this.updateUI();
    }

    /**
     * Consume a health potion from inventory (heals and decrements count)
     * @param {number} healAmount
     * @returns {boolean} success
     */
    consumeHealthPotion(healAmount = 25) {
        if (this.healthPotions <= 0) return false;
        this.healthPotions = Math.max(0, this.healthPotions - 1);
        this.heal(healAmount);
        this.updateUI();
        return true;
    }

    /**
     * Update UI elements
     */
    updateUI() {
        const hudCoinsElement = document.getElementById('hudCoins');
        const hudRocksElement = document.getElementById('hudRocks');
        const activeThrowIcon = this.throwables?.getActiveIcon?.();
        
        if (hudCoinsElement) hudCoinsElement.textContent = this.coins;
        if (hudRocksElement) hudRocksElement.textContent = this.throwables?.getAmmo('rock') ?? 0;
        if (hudRocksElement && activeThrowIcon) {
            hudRocksElement.style.backgroundImage = `url(${activeThrowIcon})`;
            hudRocksElement.style.backgroundRepeat = 'no-repeat';
            hudRocksElement.style.backgroundPosition = 'left center';
            hudRocksElement.style.paddingLeft = '24px';
        }
        if (this.game && typeof this.game.updateInventoryOverlay === 'function') {
            this.game.updateInventoryOverlay();
        }
        // Update shop coin display if open
        if (this.game && typeof this.game.updateShopDisplay === 'function') {
            this.game.updateShopDisplay();
        }
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
        const hpFraction = document.getElementById('hudHPFraction');
        if (hpFraction) {
            const current = Math.max(0, Math.floor(this.health));
            const clamped = Math.min(current, 100);
            hpFraction.textContent = `${clamped}/100`;
        }
        if (this.game && typeof this.game.updateInventoryOverlay === 'function') {
            this.game.updateInventoryOverlay();
        }
    }

    /**
     * Apply a coffee speed buff
     * @param {number} multiplier - Speed multiplier
     * @param {number} durationMs - Duration in milliseconds
     */
    applyCoffeeBuff(multiplier = 2, durationMs = 120000) {
        this.coffeeBuff = {
            active: true,
            remaining: durationMs,
            multiplier: multiplier
        };
        this.updateMovementStatsFromBuff();
        this.updateBuffHUD();
    }

    /**
     * Apply climbing shoes buff for double jumps
     * @param {number} durationMs
     * @param {number} extraJumps - number of additional jumps (1 = double jump)
     */
    applyClimbingBuff(durationMs = 120000, extraJumps = 1) {
        this.climbingBuff = {
            active: true,
            remaining: durationMs,
            extraJumps: extraJumps
        };
        this.maxAirJumps = extraJumps;
        this.remainingAirJumps = this.maxAirJumps;
        if (this.game?.audioManager) {
            this.game.audioManager.playSound('coffee', 0.8);
        }
        this.updateBuffHUD();
    }

    /**
     * Tick coffee buff timer and clear when done
     * @param {number} deltaTime
     */
    updateCoffeeBuff(deltaTime) {
        if (!this.coffeeBuff.active) return;

        this.coffeeBuff.remaining = Math.max(0, this.coffeeBuff.remaining - deltaTime);
        if (this.coffeeBuff.remaining <= 0) {
            this.coffeeBuff = { active: false, remaining: 0, multiplier: 1 };
            this.updateMovementStatsFromBuff();
        }
        this.updateBuffHUD();
    }

    /**
     * Tick climbing shoes buff timer and clear when done
     * @param {number} deltaTime
     */
    updateClimbingBuff(deltaTime) {
        if (!this.climbingBuff.active) {
            this.maxAirJumps = 0;
            this.remainingAirJumps = Math.min(this.remainingAirJumps, this.maxAirJumps);
            return;
        }

        this.climbingBuff.remaining = Math.max(0, this.climbingBuff.remaining - deltaTime);
        if (this.climbingBuff.remaining <= 0) {
            this.climbingBuff = { active: false, remaining: 0, extraJumps: 0 };
            this.maxAirJumps = 0;
            this.remainingAirJumps = 0;
        } else {
            this.maxAirJumps = this.climbingBuff.extraJumps;
            this.remainingAirJumps = Math.min(this.remainingAirJumps, this.maxAirJumps);
        }
        this.updateBuffHUD();
    }

    /**
     * Recompute movement stats based on buff state
     */
    updateMovementStatsFromBuff() {
        const mult = this.coffeeBuff.active ? this.coffeeBuff.multiplier : 1;
        this.moveSpeed = this.baseMoveSpeed * mult;
        this.acceleration = this.baseAcceleration * mult;
        this.deceleration = this.baseDeceleration * mult;
        this.airDeceleration = this.baseAirDeceleration * mult;
    }

    /**
     * Update the HUD timers for active buffs
     * @param {boolean} forceHide - hide regardless of state
     */
    updateBuffHUD(forceHide = false) {
        const panel = this.buffHud?.panel || document.getElementById('buffPanel');
        const coffeeTimer = this.buffHud?.coffeeTimer || document.getElementById('coffeeTimer');
        const coffeeRow = this.buffHud?.coffeeRow || document.getElementById('coffeeBuffRow');
        const climbTimer = this.buffHud?.climbTimer || document.getElementById('climbTimer');
        const climbRow = this.buffHud?.climbRow || document.getElementById('climbBuffRow');

        if (!panel) return;

        const coffeeActive = this.coffeeBuff.active && !forceHide;
        const climbActive = this.climbingBuff.active && !forceHide;

        if (coffeeRow && coffeeTimer) {
            coffeeRow.classList.toggle('hidden', !coffeeActive);
            coffeeTimer.textContent = coffeeActive ? this.formatBuffTime(this.coffeeBuff.remaining) : '--:--';
        }

        if (climbRow && climbTimer) {
            climbRow.classList.toggle('hidden', !climbActive);
            climbTimer.textContent = climbActive ? this.formatBuffTime(this.climbingBuff.remaining) : '--:--';
        }

        const anyActive = coffeeActive || climbActive;
        panel.classList.toggle('hidden', !anyActive);
    }

    /**
     * Format remaining buff time as M:SS
     * @param {number} remainingMs
     * @returns {string}
     */
    formatBuffTime(remainingMs = 0) {
        const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Reset player to starting state
     */
    reset() {
        this.health = this.maxHealth;
        this.coins = 0;
        this.score = 0;
        if (this.throwables) {
            this.throwables.reset();
            this.throwables.setActive('rock');
        }
        this.healthPotions = 0;
        this.attackCooldown = 0;
        this.velocity = { x: 0, y: 0 };
        this.facing = 1;
        this.invulnerable = false;
        this.tileAnimationIndex = 0;
        this.tileAnimationTime = 0;
        this.hitFlashTime = 0;
        this.hitFlashDamage = 0;
        this.hitRayDuration = 500;
        this.knockbackTiltTime = 0;
        this.rotation = 0;
        this.jumpHeld = false;
        this.maxAirJumps = 0;
        this.remainingAirJumps = 0;
        this.coffeeBuff = { active: false, remaining: 0, multiplier: 1 };
        this.climbingBuff = { active: false, remaining: 0, extraJumps: 0 };
        this.spaceJumpHeld = false;
        if (this.combatModifiers) {
            this.combatModifiers.slimeAttack = 0;
            this.combatModifiers.slimeDefense = 0;
        }
        this.updateMovementStatsFromBuff();
        this.updateBuffHUD(true);
        this.updateUI();
        this.updateHealthUI();
    }

    /**
     * Slimmer, shorter shadow for player
     */
    getShadowScale() {
        return { x: 0.6, y: 0.5 }; // reduce width ~40% overall, height 50%
    }
}
