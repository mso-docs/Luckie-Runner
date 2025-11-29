/**
 * ProgressManager - handles save/load snapshots and pending application.
 */
class ProgressManager {
    constructor(game, saveService) {
        this.game = game;
        this.saveService = saveService;
        this.pendingSnapshot = null;
        this.pendingLevelId = null;
    }

    save(slotId = 'slot1', name = 'Auto Save') {
        const snap = this.buildSnapshot(name);
        return this.saveService?.saveSlot?.(slotId, snap);
    }

    load(slotId) {
        const snap = this.saveService?.getSlot?.(slotId);
        if (!snap) return false;
        this.pendingSnapshot = snap;
        this.pendingLevelId = snap.levelId || 'testRoom';
        this.game.stateManager.startGame();
        return true;
    }

    consumePendingLevelId(fallback = 'testRoom') {
        if (this.pendingLevelId) {
            const id = this.pendingLevelId;
            this.pendingLevelId = null;
            return id;
        }
        return fallback;
    }

    applyPendingSnapshot() {
        if (!this.pendingSnapshot) return;
        this.applySnapshot(this.pendingSnapshot);
        this.pendingSnapshot = null;
    }

    buildSnapshot(name = 'Auto Save') {
        const g = this.game;
        const player = g.player || {};
        const badgeCount = Array.isArray(g.badgeUI?.getEarnedBadges?.())
            ? g.badgeUI.getEarnedBadges().length
            : 0;

        const levelState = {
            enemies: (g.enemies || []).map(e => ({
                type: e.type || 'enemy',
                x: e.x,
                y: e.y,
                health: e.health,
                active: e.active !== false,
                spawnIndex: e.spawnIndex ?? null
            })),
            items: (g.items || []).map(it => ({
                type: it.type || 'item',
                x: it.x,
                y: it.y,
                active: it.active !== false,
                spawnIndex: it.spawnIndex ?? null
            }))
        };

        return {
            id: Date.now().toString(),
            name,
            levelId: g.currentLevelId || 'testRoom',
            updatedAt: Date.now(),
            timeElapsed: g.stats?.timeElapsed || 0,
            player: {
                x: player.x || 0,
                y: player.y || 0,
                health: player.health || player.maxHealth || 100,
                coins: player.coins || 0,
                score: player.score || 0
            },
            stats: { ...(g.stats || {}) },
            collectibles: {
                coins: g.stats?.coinsCollected || 0,
                badges: badgeCount
            },
            levelState
        };
    }

    /**
     * Apply a saved snapshot to the current world/player.
     * Requires that the level/player are already built.
     */
    applySnapshot(snap) {
        const g = this.game;
        if (!snap) return;
        if (snap.levelId && snap.levelId !== g.currentLevelId) {
            g.currentLevelId = snap.levelId;
        }
        if (snap.stats) {
            g.stats = { ...snap.stats };
        }
        if (typeof snap.timeElapsed === 'number') {
            g.stats.timeElapsed = snap.timeElapsed;
        }
        if (snap.player && g.player) {
            g.player.x = snap.player.x ?? g.player.x;
            g.player.y = snap.player.y ?? g.player.y;
            if (typeof snap.player.health === 'number') {
                g.player.health = snap.player.health;
            }
            if (typeof snap.player.coins === 'number') {
                g.player.coins = snap.player.coins;
            }
            if (typeof snap.player.score === 'number') {
                g.player.score = snap.player.score;
            }
            g.player.updateHealthUI?.();
            g.player.updateUI?.();
        }
        if (g.badgeUI?.reset) {
            g.badgeUI.reset(false);
        }

        // Apply level state (enemies/items) with loose matching to avoid resets
        if (snap.levelState) {
            const applyEntities = (savedArr, liveArr) => {
                if (!Array.isArray(savedArr) || !Array.isArray(liveArr)) return;
                const used = new Set();
                const findMatch = (saved) => {
                    const idx = typeof saved.spawnIndex === 'number' ? saved.spawnIndex : null;
                    if (idx !== null && liveArr[idx] && !used.has(idx) && (!saved.type || liveArr[idx].type === saved.type)) {
                        return idx;
                    }
                    for (let i = 0; i < liveArr.length; i++) {
                        if (used.has(i)) continue;
                        if (!saved.type || liveArr[i].type === saved.type) {
                            return i;
                        }
                    }
                    return null;
                };

                savedArr.forEach(saved => {
                    const matchIdx = findMatch(saved);
                    if (matchIdx === null) return;
                    const entity = liveArr[matchIdx];
                    used.add(matchIdx);
                    if (typeof saved.x === 'number') entity.x = saved.x;
                    if (typeof saved.y === 'number') entity.y = saved.y;
                    if (typeof saved.health === 'number' && entity.health !== undefined) {
                        entity.health = saved.health;
                    }
                    entity.active = saved.active !== false;
                });

                for (let i = 0; i < liveArr.length; i++) {
                    if (!used.has(i)) {
                        liveArr[i].active = false;
                    }
                }
            };

            applyEntities(snap.levelState.enemies, g.enemies);
            applyEntities(snap.levelState.items, g.items);
        }
    }
}
