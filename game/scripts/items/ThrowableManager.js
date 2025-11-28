/**
 * ThrowableManager - Manages ammo counts and projectile factories for throwables.
 */
class ThrowableManager {
    constructor(player) {
        this.player = player;
        this.types = new Map();
        this.activeType = null;
    }

    registerType(key, definition) {
        if (!definition) return;
        const def = { ammo: 0, maxAmmo: Infinity, ...definition };
        this.types.set(key, def);
        if (!this.activeType) this.activeType = key;
    }

    setActive(key) {
        if (this.types.has(key)) {
            this.activeType = key;
        }
    }

    getActiveType() {
        return this.activeType;
    }

    getActiveIcon() {
        const t = this.types.get(this.activeType);
        return t?.icon || null;
    }

    getType(key = this.activeType) {
        return this.types.get(key);
    }

    getAmmo(key = this.activeType) {
        const t = this.types.get(key);
        return t ? (t.ammo || 0) : 0;
    }

    listTypesSortedByIcon() {
        const arr = Array.from(this.types.entries()).map(([key, def]) => ({
            key,
            ...def
        }));
        return arr.sort((a, b) => (a.icon || '').localeCompare(b.icon || ''));
    }

    addAmmo(key, amount) {
        const t = this.types.get(key);
        if (!t) return 0;
        t.ammo = Math.min(t.maxAmmo, (t.ammo || 0) + amount);
        return t.ammo;
    }

    consumeActive(amount = 1) {
        const t = this.types.get(this.activeType);
        if (!t || (t.ammo || 0) < amount) return false;
        t.ammo = Math.max(0, t.ammo - amount);
        return true;
    }

    canThrow() {
        return this.getAmmo() > 0;
    }

    /**
     * Create an active projectile using the registered factory.
     * @param {Object} worldTarget - world-space target (e.g., mouse position)
     */
    createActiveProjectile(worldTarget) {
        const t = this.types.get(this.activeType);
        if (!t || typeof t.createProjectile !== 'function') return null;
        return t.createProjectile(this.player, worldTarget);
    }

    reset() {
        this.types.forEach((t, key) => {
            // Preserve initial ammo when provided; otherwise refill to max
            if (typeof t.initialAmmo === 'number') {
                t.ammo = Math.min(t.maxAmmo, t.initialAmmo);
            } else {
                t.ammo = t.maxAmmo === Infinity ? 0 : t.maxAmmo;
            }
        });
    }
}
