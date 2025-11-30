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
        (entities.npcs || []).forEach(npc => npc?.update?.(deltaTime));

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

        // Enemies
        g.enemies = (entities.enemies || []).filter(enemy => {
            if (enemy.active) {
                enemy.update(deltaTime);
                g.collisionSystem?.updateEnemyPhysics(enemy);
                return true;
            }
            this.handleEnemyRemoved(enemy);
            return false;
        });
        entities.enemies = g.enemies;

        // Items
        g.items = (entities.items || []).filter(item => {
            if (item.active) {
                item.update(deltaTime);
                g.collisionSystem?.updateItemPhysics(item, deltaTime);
                g.collisionSystem?.handleItemCollection(item);
                return item.active !== false;
            }
            return false;
        });
        entities.items = g.items;

        // Projectiles
        g.projectiles = (entities.projectiles || []).filter(projectile => {
            if (projectile.active) {
                projectile.update(deltaTime);
                g.collisionSystem?.updateProjectilePhysics(projectile);
                return true;
            }
            return false;
        });
        entities.projectiles = g.projectiles;

        // Hazards
        g.hazards = (entities.hazards || []).filter(hazard => {
            if (hazard.active) {
                hazard.update(deltaTime);
                return true;
            }
            return false;
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
