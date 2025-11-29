/**
 * StatsManager - centralizes stat accumulation and badge hooks.
 */
class StatsManager {
    constructor(game) {
        this.game = game;
        const bus = game.serviceLocator?.eventBus?.() || game.services?.eventBus || null;
        if (bus) {
            bus.on('enemy:defeated', (enemy) => this.handleEnemyRemoved(enemy));
            bus.on('item:collected', (item) => this.handleItemCollected(item));
        }
    }

    handleEnemyRemoved(enemy) {
        const g = this.game;
        g.stats.enemiesDefeated++;
        g.badgeUI?.handleEnemyDefeated?.(enemy);
    }

    handleItemCollected(item) {
        const g = this.game;
        if (item?.type === 'coin') {
            g.stats.coinsCollected += item.value || 0;
        }
    }

    tick(deltaTime) {
        const g = this.game;
        g.stats.timeElapsed += deltaTime;
        if (g.player) {
            const distanceThisFrame = Math.abs(g.player.velocity.x) * (deltaTime / 1000);
            g.stats.distanceTraveled += distanceThisFrame;
        }
    }
}
