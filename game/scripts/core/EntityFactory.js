/**
 * EntityFactory - central place to construct entities/items with game wiring.
 */
class EntityFactory {
    constructor(game, config = {}) {
        this.game = game;
        this.registry = {};
        this.bootstrapDefaults();
        this.registerTypesFromConfig(config.entities);
    }

    platform(x, y, width, height, type) {
        const p = new Platform(x, y, width, height, type);
        return p;
    }

    slime(x, y) {
        const slime = new Slime(x, y);
        slime.game = this.game;
        return slime;
    }

    healthPotion(x, y, healAmount) {
        const potion = new HealthPotion(x, y, healAmount);
        potion.game = this.game;
        return potion;
    }

    coffee(x, y) {
        const coffee = new CoffeeItem(x, y);
        coffee.game = this.game;
        return coffee;
    }

    chest(x, y, displayName = null, contents = null) {
        const chest = new Chest(x, y);
        chest.game = this.game;
        if (displayName) chest.displayName = displayName;
        if (contents) chest.contents = contents;
        return chest;
    }

    smallPalm(x, y) {
        const palm = new SmallPalm(x, y);
        palm.game = this.game;
        return palm;
    }

    shopGhost(x, y, dialogueId = null) {
        const ghost = new ShopGhost(x, y);
        ghost.game = this.game;
        if (dialogueId) ghost.dialogueId = dialogueId;
        return ghost;
    }

    princess(x, y, dialogueId = null) {
        const princess = new PrincessNPC(x, y);
        princess.game = this.game;
        if (dialogueId) princess.dialogueId = dialogueId;
        return princess;
    }

    balloonFan(x, y, dialogueId = null) {
        const fan = new BalloonNPC(x, y);
        fan.game = this.game;
        fan.baseY = y;
        if (dialogueId) fan.dialogueId = dialogueId;
        return fan;
    }

    sign(x, y, spriteSrc, dialogueLines = null) {
        const sign = new Sign(x, y, spriteSrc);
        if (dialogueLines) sign.dialogueLines = dialogueLines.slice();
        return sign;
    }

    flag(x, y) {
        const flag = Flag.create(x, y);
        if (flag) flag.game = this.game;
        return flag;
    }

    townNpc(def = {}) {
        const NPCtor = (typeof TownPatrolNPC !== 'undefined') ? TownPatrolNPC : null;
        if (!NPCtor) return null;
        const npc = new NPCtor(this.game, def);
        return npc;
    }

    /**
     * Register a new entity type builder.
     */
    registerType(type, builder) {
        if (type && typeof builder === 'function') {
            this.registry[type] = builder;
        }
    }

    /**
     * Seed built-in entity builders.
     */
    bootstrapDefaults() {
        this.registerType('platform', (def) => this.platform(def.x, def.y, def.width, def.height, def.subtype || def.kind));
        this.registerType('slime', (def) => this.slime(def.x, def.y));
        this.registerType('health_potion', (def) => this.healthPotion(def.x, def.y, def.healAmount));
        this.registerType('coffee', (def) => this.coffee(def.x, def.y));
        this.registerType('chest', (def) => this.chest(def.x, def.y, def.displayName, def.contents));
        this.registerType('small_palm', (def) => this.smallPalm(def.x, def.y));
        this.registerType('shopGhost', (def) => this.shopGhost(def.x, def.y));
        this.registerType('princess', (def) => this.princess(def.x, def.y, def.dialogueLines || null));
        this.registerType('balloonFan', (def) => this.balloonFan(def.x, def.y, def.dialogueLines || null));
        this.registerType('sign', (def) => this.sign(def.x, def.y, def.spriteSrc, def.dialogueLines || null));
        this.registerType('flag', (def) => this.flag(def.x, def.y));
        this.registerType('townNpc', (def) => this.townNpc(def));
    }

    /**
     * Bulk register from config object: { typeName: builderFn }
     */
    registerTypesFromConfig(map) {
        if (!map || typeof map !== 'object') return;
        Object.entries(map).forEach(([key, fn]) => {
            if (typeof fn === 'function') {
                this.registerType(key, fn.bind(null, this.game));
            }
        });
    }

    /**
     * Generic creation by type key
     */
    create(def) {
        if (!def || !def.type) return null;
        if (this.registry[def.type]) {
            return this.registry[def.type](def, this.game);
        }
        return null;
    }
}
