/**
 * CollisionSystem - handles collision checks and simple physics helpers.
 */
class CollisionSystem {
    constructor(game) {
        this.game = game;
        this.config = game.config || GameConfig || {};
    }

    checkPlayerCollisions() {
        const g = this.game;
        const player = g.player;
        if (!player) return;

        player.onGround = false;
        if (Array.isArray(g.smallPalms)) {
            g.smallPalms.forEach(p => p.playerOnTopCurrent = false);
        }

        g.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(player),
                platform
            )) {
                this.resolvePlayerPlatformCollision(platform);
            }
        });

        if (Array.isArray(g.smallPalms)) {
            g.smallPalms.forEach(palm => {
                const palmBounds = CollisionDetection.getCollisionBounds(palm);
                const playerBounds = CollisionDetection.getCollisionBounds(player);
                const landed = g.topOnlyLanding(palmBounds);
                if (landed.onTop) {
                    palm.setPlayerOnTop(true, landed.landed);
                }
            });
            g.smallPalms.forEach(p => p.finalizeContactFrame());
        }

        this.handleNpcCollisions();

        if (!g.testMode) {
            g.enemies.forEach(enemy => {
                if (CollisionDetection.entityCollision(player, enemy)) {
                    player.takeDamage(enemy.attackDamage * 0.5, enemy);
                }
            });

            g.hazards.forEach(hazard => {
                if (hazard.checkPlayerCollision) {
                    hazard.checkPlayerCollision();
                }
            });
        }

        const fallBuffer = this.config.testRoom?.fallDeathBuffer ?? 200;
        const teleportBuffer = this.config.testRoom?.teleportBuffer ?? 500;
        if (!g.testMode && player.y > g.level.height + fallBuffer) {
            player.takeDamage(player.health, null);
        } else if (g.testMode && player.y > g.level.height + teleportBuffer) {
            player.x = g.level.spawnX;
            player.y = g.level.spawnY;
            player.velocity.x = 0;
            player.velocity.y = 0;
        }
    }

    resolvePlayerPlatformCollision(platform) {
        const playerBounds = CollisionDetection.getCollisionBounds(this.game.player);
        const result = { onTop: false, landed: false };

        const overlapX = Math.min(
            playerBounds.x + playerBounds.width - platform.x,
            platform.x + platform.width - playerBounds.x
        );
        const overlapY = Math.min(
            playerBounds.y + playerBounds.height - platform.y,
            platform.y + platform.height - playerBounds.y
        );

        if (overlapX < overlapY) {
            if (playerBounds.x < platform.x) {
                this.game.player.x = platform.x - this.game.player.width;
                this.game.player.velocity.x = Math.min(0, this.game.player.velocity.x);
            } else {
                this.game.player.x = platform.x + platform.width;
                this.game.player.velocity.x = Math.max(0, this.game.player.velocity.x);
            }
        } else {
            if (playerBounds.y < platform.y) {
                const wasFalling = this.game.player.velocity.y > 0;
                this.game.player.y = platform.y - this.game.player.height;
                this.game.player.velocity.y = Math.min(0, this.game.player.velocity.y);
                this.game.player.onGround = true;
                result.onTop = true;
                result.landed = wasFalling;
            } else {
                this.game.player.y = platform.y + platform.height;
                this.game.player.velocity.y = Math.max(0, this.game.player.velocity.y);
            }
        }

        return result;
    }

    handleNpcCollisions() {
        const g = this.game;
        if (!g.player || !Array.isArray(g.npcs)) return;
        g.npcs.forEach(npc => {
            if (!npc || npc.solid === false) return;
            const npcBounds = CollisionDetection.getCollisionBounds(npc);
            const landed = g.topOnlyLanding(npcBounds);
            if (!landed.onTop) {
                return;
            }
        });
    }

    resolvePlayerEntityCollision(entity) {
        const playerBounds = CollisionDetection.getCollisionBounds(this.game.player);
        const entityBounds = CollisionDetection.getCollisionBounds(entity);
        const offsetX = this.game.player.collisionOffset?.x || 0;
        const offsetY = this.game.player.collisionOffset?.y || 0;

        const overlapX = Math.min(
            playerBounds.x + playerBounds.width - entityBounds.x,
            entityBounds.x + entityBounds.width - playerBounds.x
        );
        const overlapY = Math.min(
            playerBounds.y + playerBounds.height - entityBounds.y,
            entityBounds.y + entityBounds.height - playerBounds.y
        );

        if (overlapX < overlapY) {
            if (playerBounds.x < entityBounds.x) {
                this.game.player.x = entityBounds.x - playerBounds.width - offsetX;
                this.game.player.velocity.x = Math.min(0, this.game.player.velocity.x);
            } else {
                this.game.player.x = entityBounds.x + entityBounds.width - offsetX;
                this.game.player.velocity.x = Math.max(0, this.game.player.velocity.x);
            }
        } else {
            if (playerBounds.y < entityBounds.y) {
                this.game.player.y = entityBounds.y - playerBounds.height - offsetY;
                this.game.player.velocity.y = Math.min(0, this.game.player.velocity.y);
                this.game.player.onGround = true;
            } else {
                this.game.player.y = entityBounds.y + entityBounds.height - offsetY;
                this.game.player.velocity.y = Math.max(0, this.game.player.velocity.y);
            }
        }
    }

    updateEnemyPhysics(enemy) {
        const g = this.game;
        enemy.onGround = false;
        g.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(enemy),
                platform
            )) {
                this.resolveEnemyPlatformCollision(enemy, platform);
            }
        });
    }

    resolveEnemyPlatformCollision(enemy, platform) {
        const enemyBounds = CollisionDetection.getCollisionBounds(enemy);
        if (enemyBounds.y + enemyBounds.height > platform.y &&
            enemyBounds.y < platform.y &&
            enemyBounds.x < platform.x + platform.width &&
            enemyBounds.x + enemyBounds.width > platform.x) {

            enemy.y = platform.y - enemy.height;
            enemy.velocity.y = Math.min(0, enemy.velocity.y);
            enemy.onGround = true;
        }
    }

    updateItemPhysics(item, deltaTime) {
        const g = this.game;
        const dt = deltaTime / 1000;

        if (!item.onGround) {
            item.velocity.y += item.gravity * dt;
        }

        item.x += item.velocity.x * dt;
        item.y += item.velocity.y * dt;

        g.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(item),
                platform
            )) {
                if (item.y + item.height > platform.y && item.velocity.y >= 0) {
                    item.y = platform.y - item.height;
                    item.velocity.y = 0;
                    item.onGround = true;
                    item.originalY = item.y;
                }
            }
        });

        item.velocity.x *= 0.95;
    }

    updateProjectilePhysics(projectile) {
        const g = this.game;
        g.platforms.forEach(platform => {
            if (CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(projectile),
                platform
            )) {
                projectile.hitObstacle(platform);
            }
        });

        // Hazards vs projectiles (if hazards expose hit/hurt)
        g.hazards.forEach(hazard => {
            if (typeof hazard.checkProjectileCollision === 'function') {
                hazard.checkProjectileCollision(projectile);
            }
        });
    }

    updateHazardCollisions() {
        const g = this.game;
        if (g.testMode) return;
        if (!g.player) return;
        g.hazards.forEach(hazard => {
            if (hazard.checkPlayerCollision) {
                hazard.checkPlayerCollision(g.player);
                return;
            }
            const hazardBounds = hazard.bounds || CollisionDetection.getCollisionBounds(hazard);
            if (hazardBounds && CollisionDetection.rectangleCollision(
                CollisionDetection.getCollisionBounds(g.player),
                hazardBounds
            )) {
                if (typeof hazard.onPlayerHit === 'function') {
                    hazard.onPlayerHit(g.player);
                }
            }
        });
    }
}
