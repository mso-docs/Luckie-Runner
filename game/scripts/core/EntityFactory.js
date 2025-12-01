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
        const ghost = new GenericNPC({
            id: 'shop_ghost',
            name: 'Shop Ghost',
            x, y,
            width: 47,
            height: 64,
            sprite: 'art/sprites/shop-ghost.png',
            useTileSheet: true,
            frames: 2,
            animationFrames: [0],
            animationSpeed: 999999,
            dialogueId: dialogueId || 'npc.shop_ghost',
            canTalk: true,
            bobbing: true,
            bobbingAmount: 6,
            bobbingSpeed: 0.0025,
            canToggleFrame: true,
            spriteDefaultFacesLeft: false
        });
        ghost.game = this.game;
        return ghost;
    }

    princess(x, y, dialogueId = null) {
        const princess = new GenericNPC({
            id: 'princess',
            name: 'Princess',
            x, y,
            width: 49,
            height: 64,
            sprite: 'art/sprites/princess-sprite.png',
            useTileSheet: true,
            frames: 2,
            animationFrames: [0],
            animationSpeed: 999999,
            dialogueId: dialogueId || 'princess.default',
            talkFrames: [0, 1],
            idleFrames: [0],
            spriteDefaultFacesLeft: false
        });
        princess.game = this.game;
        return princess;
    }

    balloonFan(x, y, dialogueId = null) {
        const fan = new GenericNPC({
            id: 'balloon_fan',
            name: 'Balloon Fan',
            x, y,
            width: 55,
            height: 63,
            sprite: 'art/sprites/balloon.png',
            useTileSheet: false,
            dialogueId: dialogueId || 'balloon.default',
            bobbing: true,
            bobbingAmount: 7,
            bobbingSpeed: 0.0025,
            shadowScale: { x: 0.55, y: 0.4 },
            spriteDefaultFacesLeft: true
        });
        fan.game = this.game;
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
        const NPCtor = (typeof TownPatrolNPC !== 'undefined')
            ? TownPatrolNPC
            : (typeof window !== 'undefined' ? window.TownPatrolNPC : null);
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
        this.registerType('decor_platform', (def) => {
            const ctor = (typeof DecorPlatform !== 'undefined')
                ? DecorPlatform
                : (typeof window !== 'undefined' ? window.DecorPlatform : null);
            if (!ctor) return null;
            const plat = new ctor(def.x ?? 0, def.y ?? 0, def || {});
            plat.game = this.game;
            return plat;
        });
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
