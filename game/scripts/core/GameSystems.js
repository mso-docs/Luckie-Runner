/**
 * GameSystems - orchestrates per-frame gameplay updates.
 * Keeps Game as a thin coordinator.
 */
class GameSystems {
    constructor(game) {
        this.game = game;
        this.bus = game.serviceLocator?.eventBus?.() || game.services?.eventBus || null;
    }

    /**
     * Main per-frame update pipeline.
     */
    update(deltaTime) {
        const g = this.game;
        const entities = g.getActiveEntities();

        // Input and UI gate
        const input = g.services?.input || g.input;
        input?.update?.();
        g.uiManager?.handleFrameInput();
        if (g.uiManager?.isOverlayBlocking()) return;

        // NPCs
        (entities.npcs || []).forEach(npc => {
            if (!npc) return;
            this.applyNpcKnockback(npc, deltaTime);
            npc.update?.(deltaTime);
        });

        // Player
        if (g.player) {
            g.player.update(deltaTime);
            this.updateCamera();
            g.collisionSystem?.checkPlayerCollisions();
            if (g.activeWorld?.kind !== 'room') {
                g.townManager?.update?.(deltaTime);
            }
        }

        // Small palms
        if (Array.isArray(g.smallPalms)) {
            g.smallPalms.forEach(palm => palm.update(deltaTime));
        }

        // UI-dependent world elements (chests/signs)
        g.uiManager?.updateFrame(deltaTime);

        // Background layers
        (entities.backgroundLayers || []).forEach(layer => {
            if (layer instanceof Background || layer instanceof ProceduralBackground) {
                layer.update(g.camera.x, deltaTime);
            }
        });

        // Procedural palm trees
        const render = g.getRenderService();
        g.palmTreeManager.update(g.camera.x, render.width());

        const isRoom = g.activeWorld?.kind === 'room';

        // Enemies
        g.enemies = (entities.enemies || []).filter(enemy => {
            if (!enemy || !enemy.active) {
                this.handleEnemyRemoved(enemy);
                return false;
            }
            enemy.update(deltaTime);
            g.collisionSystem?.updateEnemyPhysics(enemy);
            return true;
        });
        entities.enemies = g.enemies;

        // Items
        g.items = (entities.items || []).filter(item => {
            if (!item || !item.active) return false;
            item.update(deltaTime);
            if (!isRoom) {
                g.collisionSystem?.updateItemPhysics(item, deltaTime);
                g.collisionSystem?.handleItemCollection(item);
            }
            return item.active !== false;
        });
        entities.items = g.items;

        // Projectiles
        g.projectiles = (entities.projectiles || []).filter(projectile => {
            if (!projectile || !projectile.active) return false;
            projectile.update(deltaTime);
            if (!isRoom) {
                g.collisionSystem?.updateProjectilePhysics(projectile);
            }
            return true;
        });
        entities.projectiles = g.projectiles;

        // Hazards
        g.hazards = (entities.hazards || []).filter(hazard => {
            if (!hazard || !hazard.active) return false;
            hazard.update(deltaTime);
            return true;
        });
        entities.hazards = g.hazards;
        g.collisionSystem?.updateHazardCollisions();

        // Flag
        if (g.flag) {
            g.flag.update(deltaTime);
            g.collisionSystem?.checkFlagCollision(g.flag);
        }

        // Stats + HUD
        this.updateGameStats(deltaTime);
        g.updateInventoryOverlay();

        // Game over checks
        this.checkGameOver();
    }

    applyNpcKnockback(npc, deltaTime) {
        const dt = deltaTime / 1000;
        const isPatroller = Array.isArray(npc.patrol) && npc.patrol.length > 1;

        if (npc.knockbackRecoverMs && npc.knockbackRecoverMs > 0) {
            npc.knockbackRecoverMs = Math.max(0, npc.knockbackRecoverMs - deltaTime);
        }

        if (npc.knockbackVelocityX) {
            npc.x += npc.knockbackVelocityX * dt;
            npc.knockbackVelocityX *= 0.7;
            if (Math.abs(npc.knockbackVelocityX) < 1) {
                npc.knockbackVelocityX = 0;
            }
        }

        // Return-to-home drift only for non-patrolling NPCs
        if (!isPatroller && typeof npc.homeX === 'number' && !npc.knockbackVelocityX) {
            const diff = npc.homeX - npc.x;
            if (Math.abs(diff) > 0.5) {
                npc.x += diff * Math.min(1, dt * 3);
            }
        }
    }

    updateCamera() {
        const g = this.game;
        if (!g.player || !g.camera) return;
        const render = g.getRenderService();

        g.camera.setViewport(render.width(), render.height());
        g.camera.setBounds(g.level?.width, g.level?.height);
        g.camera.followPlayer(g.player, { testMode: g.testMode });
    }

    updateGameStats(deltaTime) {
        const g = this.game;
        g.statsManager?.tick(deltaTime);
    }

    checkGameOver() {
        const g = this.game;
        if (g.player && g.player.health <= 0) {
            g.stateManager.gameOver();
        }
    }

    handleEnemyRemoved(enemy) {
        if (this.bus) {
            this.bus.emit('enemy:defeated', enemy);
        } else {
            this.game.statsManager?.handleEnemyRemoved(enemy);
        }
    }
}
