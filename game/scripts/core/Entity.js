/**
 * Entity - Base class for all game objects
 * Provides common properties and methods for sprites, enemies, items, etc.
 */
class Entity {
  constructor(x, y, width, height) {
    // Position and size
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    // Simple physics
    this.velocity = { x: 0, y: 0 };
    this.gravity = 800; // Simple gravity (pixels/second²)
    this.onGround = false;

    // Collision properties
    this.collisionOffset = { x: 0, y: 0 };
    this.collisionWidth = width;
    this.collisionHeight = height;
    this.solid = true;

    // Rendering properties
    this.sprite = null;
    this.spriteLoaded = false;
    this.visible = true;
    this.alpha = 1.0;
    this.rotation = 0;
    this.scale = { x: 1, y: 1 };
    this.flipX = false;
    this.flipY = false;

    // Sprite sheet tile configuration (32x64 tiles)
    this.useTileSheet = false;
    this.tileWidth = 32;
    this.tileHeight = 64;
    this.tileIndex = 0; // Current tile to display
    this.tileAnimationFrames = []; // Array of tile indices for animation
    this.tileAnimationSpeed = 200; // ms per frame
    this.tileAnimationTime = 0;
    this.tileAnimationIndex = 0;

    // Animation properties
    this.animations = {};
    this.currentAnimation = null;
    this.animationFrame = 0;
    this.animationTime = 0;
    this.animationSpeed = 100; // ms per frame

    // State properties
    this.active = true;
    this.health = 100;
    this.maxHealth = 100;
    this.invulnerable = false;
    this.invulnerabilityTime = 0;

    // Game references
    this.game = null;
  }

  /**
   * Load sprite image
   * @param {string} imagePath - Path to sprite image
   */
  loadSprite(imagePath) {
    this.sprite = new Image();
    this.spriteLoaded = false;
    this.sprite.onload = () => {
      this.spriteLoaded = true;
    };
    this.sprite.onerror = () => {
      this.spriteLoaded = false;
      this.sprite = null;
    };
    this.sprite.src = imagePath;
  }

  /**
   * Load tile-based sprite sheet (32x64 tiles)
   * @param {string} imagePath - Path to sprite sheet image
   * @param {number} tileWidth - Width of each tile (default: 32)
   * @param {number} tileHeight - Height of each tile (default: 64)
   * @param {Array} animationFrames - Array of tile indices to animate [0, 1] (optional)
   * @param {number} animationSpeed - ms per frame (default: 200)
   */
  loadTileSheet(
    imagePath,
    tileWidth = 32,
    tileHeight = 64,
    animationFrames = null,
    animationSpeed = 200
  ) {
    this.useTileSheet = true;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.tileAnimationSpeed = animationSpeed;

    // Set up animation frames (default to first 2 tiles if not specified)
    if (animationFrames && animationFrames.length > 0) {
      this.tileAnimationFrames = animationFrames;
    } else {
      this.tileAnimationFrames = [0, 1]; // Animate first 2 tiles by default
    }

    this.tileIndex = this.tileAnimationFrames[0];
    this.tileAnimationIndex = 0;
    this.tileAnimationTime = 0;

    // Load the sprite sheet
    this.loadSprite(imagePath);
  }

  /**
   * Add an animation sequence
   * @param {string} name - Animation name
   * @param {Array} frames - Array of frame objects {x, y, width, height}
   * @param {boolean} loop - Whether animation should loop
   */
  addAnimation(name, frames, loop = true) {
    this.animations[name] = {
      frames: frames,
      loop: loop,
      speed: this.animationSpeed,
    };
  }

  /**
   * Play an animation
   * @param {string} name - Animation name
   * @param {boolean} restart - Force restart if already playing
   */
  playAnimation(name, restart = false) {
    if (this.currentAnimation !== name || restart) {
      this.currentAnimation = name;
      this.animationFrame = 0;
      this.animationTime = 0;
    }
  }

  /**
   * Update entity (called each frame)
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    if (!this.active) return;

    // Update invulnerability
    if (this.invulnerable) {
      this.invulnerabilityTime -= deltaTime;
      if (this.invulnerabilityTime <= 0) {
        this.invulnerable = false;
      }
    }

    // Apply physics
    this.updatePhysics(deltaTime);

    // Update animations
    this.updateAnimation(deltaTime);

    // Custom update logic (override in subclasses)
    this.onUpdate(deltaTime);
  }

  /**
   * Update physics (gravity, movement, friction)
   * @param {number} deltaTime - Time since last frame
   */
  updatePhysics(deltaTime) {
    // Simple physics - gravity only
    const dt = deltaTime / 1000; // Convert to seconds

    // Apply gravity when not on ground
    if (!this.onGround) {
      this.velocity.y += this.gravity * dt;
    }

    // Position is updated in the entity's own update method
    // This allows for more control over movement
  }

  /**
   * Update animation frames
   * @param {number} deltaTime - Time since last frame
   */
  updateAnimation(deltaTime) {
    // Handle tile-based animation
    if (this.useTileSheet && this.tileAnimationFrames.length > 1) {
      this.tileAnimationTime += deltaTime;

      if (this.tileAnimationTime >= this.tileAnimationSpeed) {
        this.tileAnimationTime = 0;
        this.tileAnimationIndex++;

        if (this.tileAnimationIndex >= this.tileAnimationFrames.length) {
          this.tileAnimationIndex = 0;
        }

        this.tileIndex = this.tileAnimationFrames[this.tileAnimationIndex];
      }
      return;
    }

    // Handle traditional animation system
    if (!this.currentAnimation || !this.animations[this.currentAnimation])
      return;

    const animation = this.animations[this.currentAnimation];
    this.animationTime += deltaTime;

    if (this.animationTime >= animation.speed) {
      this.animationTime = 0;
      this.animationFrame++;

      if (this.animationFrame >= animation.frames.length) {
        if (animation.loop) {
          this.animationFrame = 0;
        } else {
          this.animationFrame = animation.frames.length - 1;
          this.onAnimationComplete(this.currentAnimation);
        }
      }
    }
  }

  /**
   * Render entity on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} camera - Camera object for screen position
   */
  render(ctx, camera = { x: 0, y: 0 }) {
    if (!this.visible) return;

    // Calculate screen position
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    // Don't render if off screen
    if (
      screenX + this.width < 0 ||
      screenX > ctx.canvas.width ||
      screenY + this.height < 0 ||
      screenY > ctx.canvas.height
    ) {
      return;
    }

    // Draw a soft ground shadow projected onto the platform/floor beneath
    const groundY = this.getGroundY();
    const screenGroundY = groundY - camera.y;
    this.renderShadow(ctx, screenX, screenGroundY);

    ctx.save();

    // Apply transformations
    ctx.globalAlpha = this.alpha;
    ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
    ctx.scale(this.scale.x, this.scale.y);

    // Draw sprite or animation frame if available
    if (this.sprite && this.spriteLoaded) {
      if (this.useTileSheet) {
        // Tile-based rendering - calculate tile position in sprite sheet
        const tilesPerRow = Math.floor(this.sprite.width / this.tileWidth);
        const tileRow = Math.floor(this.tileIndex / tilesPerRow);
        const tileCol = this.tileIndex % tilesPerRow;
        const sourceX = tileCol * this.tileWidth;
        const sourceY = tileRow * this.tileHeight;

        ctx.drawImage(
          this.sprite,
          sourceX,
          sourceY,
          this.tileWidth,
          this.tileHeight,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
      } else if (
        this.currentAnimation &&
        this.animations[this.currentAnimation]
      ) {
        const animation = this.animations[this.currentAnimation];
        const frame = animation.frames[this.animationFrame];

        ctx.drawImage(
          this.sprite,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
      } else {
        // Draw entire sprite
        ctx.drawImage(
          this.sprite,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
      }
    } else if (this.fallbackColor) {
      // Draw fallback color rectangle for entities without sprites
      ctx.fillStyle = this.fallbackColor;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();
  }

  /**
   * Render a small soft shadow beneath the entity
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenX
   * @param {number} screenGroundY - Ground/platform Y in screen space
   */
  renderShadow(ctx, screenX, screenGroundY) {
    const radiusX = (Math.max(this.width, this.height) * 0.55); // slightly longer footprint
    const radiusY = radiusX * 0.28; // thinner profile
    const centerX = screenX + this.width / 2;
    // Position so the top of the ellipse touches the ground/platform
    const centerY = screenGroundY + radiusY;

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Find the nearest ground/platform Y directly beneath the entity center.
   * Falls back to the entity's current base if none is found.
   * @returns {number} world-space Y for shadow contact
   */
  getGroundY() {
    const defaultGround = this.y + this.height;
    if (!this.game || !Array.isArray(this.game.platforms)) return defaultGround;

    const centerX = this.x + this.width / 2;
    let bestY = null;

    for (const platform of this.game.platforms) {
      if (!platform || platform.solid === false) continue;
      if (centerX < platform.x || centerX > platform.x + platform.width) continue;
      if (platform.y < defaultGround) continue; // only consider beneath/at entity base

      if (bestY === null || platform.y < bestY) {
        bestY = platform.y;
      }
    }

    return bestY !== null ? bestY : defaultGround;
  }

  /**
   * Take damage
   * @param {number} amount - Damage amount
   * @param {Entity} source - Source of damage (optional)
   */
  takeDamage(amount, source = null) {
    if (this.invulnerable) return false;

    const newHealth = this.health - amount;
    const lethal = newHealth <= 0;

    this.health = Math.max(0, newHealth);
    this.onTakeDamage(amount, source);

    if (lethal) {
      this.onDeath(source);
    }
    return true;
  }

  /**
   * Heal entity
   * @param {number} amount - Heal amount
   */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.onHeal(amount);
  }

  /**
   * Make entity invulnerable for specified time
   * @param {number} duration - Invulnerability duration in ms
   */
  makeInvulnerable(duration) {
    this.invulnerable = true;
    this.invulnerabilityTime = duration;
  }

  /**
   * Get center position
   * @returns {Object} Center position {x, y}
   */
  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }

  /**
   * Set center position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setCenter(x, y) {
    this.x = x - this.width / 2;
    this.y = y - this.height / 2;
  }

  // Virtual methods (override in subclasses)
  onUpdate(deltaTime) {}
  onTakeDamage(amount, source) {}
  onDeath(source) {
    this.active = false;
  }
  onHeal(amount) {}
  onAnimationComplete(animationName) {}
}
