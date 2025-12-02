/**
 * TownManager - handles town region detection and entry UI.
 * Designed for modular towns with banners/buildings/foreground/interiors.
 */
class TownManager {
    constructor(game, config = {}) {
        this.game = game;
        this.assetKits = this.buildAssetKitMap(config.assetKits);
        const configDefaults = this.clonePlain(config.defaults || {});
        const baseRequirements = {
            houseCount: { min: 2, max: 3 },
            lampCount: 1,
            groundTile: true,
            backdrop: true,
            itemPlan: {
                count: 2,
                spacing: 320,
                pool: [
                    { type: 'coffee' },
                    { type: 'health_potion', healAmount: 25 }
                ]
            }
        };
        baseRequirements.houseCount = { ...baseRequirements.houseCount, ...(configDefaults.houseCount || {}) };
        baseRequirements.itemPlan = { ...baseRequirements.itemPlan, ...(configDefaults.itemPlan || {}) };
        if (typeof configDefaults.streetLampCount === 'number') {
            baseRequirements.lampCount = configDefaults.streetLampCount;
        } else if (typeof configDefaults.lampCount === 'number') {
            baseRequirements.lampCount = configDefaults.lampCount;
        }
        if (configDefaults.groundTile === false) baseRequirements.groundTile = false;
        if (configDefaults.backdrop === false) baseRequirements.backdrop = false;
        this.defaultRequirements = baseRequirements;
        this.towns = this.prepareTowns(config);
        this.preloadDistance = config.preloadDistance ?? null;
        this.currentTownId = null;
        this.lastBannerAt = 0;
        this.activeTownMusicId = null;
        this.musicTransition = null;
        this.fadeDuration = 1200;
        this.baseMusicVolume = game.currentLevelMusicVolume ?? 0.8;
        this.activeContent = { buildings: [], setpieces: [], items: [] };
        this.doorAutoCloseMs = 2200;
        this.townNpcs = [];
        this.activeTownItems = [];
        this.activeTownColliders = [];
        this.activeRoomMusicId = null;
        this.loadedTownId = null;
        this.preloadedTownId = null;
        this.pendingTownToLoad = null;
        this.initialWarmDone = false;
        this.activeInterior = null;
        this.interiorReturn = null;
        this.interiorConfigMap = this.buildInteriorMap();
        this.autoEnterDoorsInDebug = true; // allow debug auto-enter when standing in door radius
        this.roomManager = this.resolveRoomManager(game);

        this.spriteCache = {};
        this.spriteDecodePromises = {};
        this.spritePreloadReady = false; // set true after decode promises resolve
        this.spritePreloadPromise = null;
        this.townCache = {};

        this.preloadTownSprites();
        this.preloadTownMusic();
        this.warmFirstTownContent();
        this.registerLegacyInteriorsAsRooms();
    }

    prepareTowns(config = {}) {
        const source = Array.isArray(config?.towns) ? config.towns : [];
        return source.map(town => this.normalizeTownDefinition(this.clonePlain(town)));
    }

    buildAssetKitMap(assetKits = {}) {
        const defaultKit = {
            id: 'default',
            groundTile: {
                id: 'default_ground',
                name: 'Town Ground',
                role: 'groundTile',
                x: 0,
                y: 0,
                width: null,
                height: 40,
                frameWidth: 1024,
                frameHeight: 1024,
                tileX: true,
                layer: 'ground',
                scale: 0.04,
                autoAlignToGround: true,
                sprite: 'art/bg/tiles/beach-cobble.png'
            },
            backdropSlices: [
                {
                    id: 'default_backdrop_start',
                    name: 'Backdrop Start',
                    role: 'backdrop',
                    slot: 'start',
                    frameWidth: 1022,
                    frameHeight: 988,
                    layer: 'midground',
                    scale: 0.1,
                    autoAlignToGround: true,
                    sprite: 'art/bg/town backdrop/frond-start.png'
                },
                {
                    id: 'default_backdrop_mid',
                    name: 'Backdrop Mid',
                    role: 'backdrop',
                    slot: 'mid',
                    tileX: true,
                    tileWidth: 128,
                    frameWidth: 1022,
                    frameHeight: 988,
                    layer: 'midground',
                    scale: 0.1,
                    autoAlignToGround: true,
                    sprite: 'art/bg/town backdrop/fronds.png'
                },
                {
                    id: 'default_backdrop_end',
                    name: 'Backdrop End',
                    role: 'backdrop',
                    slot: 'end',
                    frameWidth: 1022,
                    frameHeight: 988,
                    layer: 'midground',
                    scale: 0.1,
                    autoAlignToGround: true,
                    sprite: 'art/bg/town backdrop/frond-end.png'
                }
            ],
            streetLamp: {
                id: 'default_lamp',
                name: 'Street Lamp',
                role: 'streetLamp',
                width: 64,
                height: 180,
                layer: 'foreground',
                autoAlignToGround: true,
                sprite: 'art/bg/exterior-decor/street-lamp.png'
            },
            house: {
                id: 'default_house',
                name: 'House',
                exterior: {
                    width: 689,
                    height: 768,
                    frames: 2,
                    frameWidth: 689,
                    frameHeight: 768,
                    frameDirection: 'horizontal',
                    scale: 0.4,
                    autoAlignToGround: true,
                    sprite: 'art/bg/buildings/exterior/house.png'
                },
                door: {
                    width: 180,
                    height: 210,
                    spriteOffsetX: 118,
                    spriteOffsetY: 498,
                    interactRadius: 160
                },
                interior: {
                    id: 'default_house_interior',
                    spawn: { x: 200, y: 520 },
                    exit: { x: 200, y: 560, radius: 80 },
                    room: {
                        width: 1024,
                        height: 720,
                        spawn: { x: 200, y: 520 },
                        exit: { x: 200, y: 560, radius: 80 },
                        backgroundImage: {
                            src: 'art/bg/buildings/interior/house-inside.png',
                            width: 1024,
                            height: 720
                        },
                        platforms: [
                            { x: 0, y: 640, width: 1024, height: 80, type: 'ground' },
                            { x: 0, y: 0, width: 32, height: 720, type: 'ground' },
                            { x: 1024 - 32, y: 0, width: 32, height: 720, type: 'ground' },
                            { x: 0, y: 0, width: 1024, height: 32, type: 'ground' }
                        ],
                        enemies: [],
                        items: [],
                        npcs: [],
                        theme: 'interior'
                    }
                }
            }
        };
        return { default: defaultKit, ...(assetKits || {}) };
    }

    getAssetKit(key = null) {
        const kitKey = key || 'default';
        const kit = this.assetKits?.[kitKey] || this.assetKits?.default;
        return this.clonePlain(kit);
    }

    mergeAssetOverrides(baseKit = {}, overrides = {}) {
        if (!overrides || typeof overrides !== 'object') return baseKit;
        const merged = { ...(baseKit || {}) };
        if (overrides.groundTile) {
            merged.groundTile = { ...(baseKit?.groundTile || {}), ...overrides.groundTile };
        }
        if (overrides.streetLamp) {
            merged.streetLamp = { ...(baseKit?.streetLamp || {}), ...overrides.streetLamp };
        }
        if (overrides.house) {
            merged.house = { ...(baseKit?.house || {}), ...overrides.house };
            if (overrides.house?.interior) {
                merged.house.interior = { ...(baseKit?.house?.interior || {}), ...overrides.house.interior };
            }
        }
        if (Array.isArray(overrides.backdropSlices)) {
            merged.backdropSlices = overrides.backdropSlices.map(slice => this.clonePlain(slice));
        } else if (Array.isArray(overrides.backdrop)) {
            merged.backdropSlices = overrides.backdrop.map(slice => this.clonePlain(slice));
        }
        return merged;
    }

    normalizeTownDefinition(town = {}) {
        const normalized = this.clonePlain(town) || {};
        normalized.buildings = Array.isArray(normalized.buildings) ? normalized.buildings.map(b => this.clonePlain(b)) : [];
        normalized.setpieces = Array.isArray(normalized.setpieces) ? normalized.setpieces.map(s => this.clonePlain(s)) : [];
        normalized.npcs = Array.isArray(normalized.npcs) ? normalized.npcs.map(n => this.clonePlain(n)) : [];
        normalized.items = Array.isArray(normalized.items) ? normalized.items.map(i => this.clonePlain(i)) : [];

        const requirements = this.mergeRequirements(normalized);
        const kitOverrides = this.clonePlain(normalized.assets || normalized.assetOverrides || {});
        const kit = this.mergeAssetOverrides(this.getAssetKit(normalized.assetKit), kitOverrides);

        this.ensureGroundTile(normalized, kit, requirements);
        this.ensureBackdrop(normalized, kit);
        this.ensureStreetLamps(normalized, kit, requirements);
        this.ensureHouses(normalized, kit, requirements);
        this.ensureTownItems(normalized, requirements);
        this.applySetpieceDefaults(normalized.setpieces);

        return normalized;
    }

    applySetpieceDefaults(setpieces = []) {
        setpieces.forEach(sp => {
            if (!sp) return;
            // Keep horizontal continuity (ground/backdrop) stable between towns, but let height scale with player
            if (sp.role === 'groundTile' || sp.role === 'backdrop') {
                sp.preserveAbsoluteSize = true;
            }
        });
    }

    mergeRequirements(town = {}) {
        const merged = this.clonePlain(this.defaultRequirements);
        const overrides = town.requirements || {};
        if (overrides.houseCount) {
            merged.houseCount = { ...merged.houseCount, ...overrides.houseCount };
        }
        if (town.houseCount) {
            merged.houseCount = { ...merged.houseCount, ...town.houseCount };
        }
        if (typeof overrides.lampCount === 'number') {
            merged.lampCount = overrides.lampCount;
        }
        if (typeof town.streetLampCount === 'number') {
            merged.lampCount = town.streetLampCount;
        }
        if (overrides.groundTile === false || town.groundTile === false) {
            merged.groundTile = false;
        }
        if (overrides.backdrop === false || town.backdrop === false) {
            merged.backdrop = false;
        }
        merged.itemPlan = {
            ...merged.itemPlan,
            ...(overrides.itemPlan || {}),
            ...(town.itemPlan || {})
        };
        return merged;
    }

    getRegionSpan(town = {}) {
        const start = town?.region?.startX ?? 0;
        const end = town?.region?.endX ?? (start + 1200);
        const width = Math.max(0, end - start) || 1200;
        return { start, end, width };
    }

    ensureGroundTile(town, kit, requirements) {
        if (requirements.groundTile === false) return;
        const setpieces = town.setpieces || [];
        const hasGround = this.hasSetpieceRole(setpieces, 'groundTile', sp => sp.layer === 'ground' && sp.tileX);
        if (hasGround) return;
        const span = this.getRegionSpan(town);
        const template = this.clonePlain(kit?.groundTile || this.getAssetKit('default')?.groundTile);
        if (!template) return;
        const ground = { ...template, role: template.role || 'groundTile' };
        ground.x = ground.x ?? span.start;
        ground.width = ground.width ?? span.width;
        ground.name = ground.name || 'Town Ground';
        setpieces.push(ground);
        town.setpieces = setpieces;
    }

    ensureBackdrop(town, kit) {
        const setpieces = town.setpieces || [];
        const hasBackdrop = this.hasSetpieceRole(setpieces, 'backdrop', sp => sp.layer === 'backdrop' || sp.layer === 'midground');
        if (hasBackdrop) return;
        const span = this.getRegionSpan(town);
        const slices = Array.isArray(kit?.backdropSlices) ? kit.backdropSlices.map(slice => this.clonePlain(slice)) : [];
        if (!slices.length) return;

        const startSlice = slices.find(s => (s.slot || 'mid') === 'start');
        const endSlice = slices.find(s => (s.slot || 'mid') === 'end');
        const startWidth = this.getSliceDisplayWidth(startSlice);
        const endWidth = this.getSliceDisplayWidth(endSlice);

        slices.forEach(slice => {
            const piece = { ...slice, role: slice.role || 'backdrop' };
            const slot = slice.slot || 'mid';
            if (slot === 'start') {
                piece.x = piece.x ?? span.start;
                piece.width = piece.width ?? startWidth;
            } else if (slot === 'end') {
                const estimatedWidth = this.getSliceDisplayWidth(piece);
                piece.width = piece.width ?? endWidth;
                piece.x = piece.x ?? (span.end - (piece.width || estimatedWidth));
            } else {
                const available = Math.max(0, span.width - startWidth - endWidth);
                piece.x = piece.x ?? (span.start + startWidth);
                const desired = piece.width ?? (available || span.width);
                // Cover the gap without overshooting the end slice; mark as absolute so we don't re-scale later
                piece.width = available > 0 ? available : desired;
                piece.preserveAbsoluteSize = true;
                piece.tileX = piece.tileX ?? true;
            }
            setpieces.push(piece);
        });
        town.setpieces = setpieces;
    }

    getSliceDisplayWidth(slice = null) {
        if (!slice) return 0;
        const scale = slice.scale ?? 1;
        if (typeof slice.width === 'number') {
            return slice.width * scale;
        }
        if (typeof slice.frameWidth === 'number') {
            return slice.frameWidth * scale;
        }
        return 0;
    }

    ensureStreetLamps(town, kit, requirements) {
        const setpieces = town.setpieces || [];
        const existing = setpieces.filter(sp => sp && (sp.role === 'streetLamp'));
        const target = Math.max(requirements.lampCount || 0, 0);
        const needed = Math.max(0, target - existing.length);
        if (needed <= 0) return;
        const span = this.getRegionSpan(town);
        const template = this.clonePlain(kit?.streetLamp || this.getAssetKit('default')?.streetLamp);
        if (!template) return;
        const slots = this.resolveLampSlots(town, needed, span, template);
        slots.forEach((slotX, idx) => {
            const lamp = { ...template, role: template.role || 'streetLamp' };
            lamp.id = lamp.id || `${town.id || 'town'}_lamp_${existing.length + idx + 1}`;
            lamp.x = slotX;
            setpieces.push(lamp);
        });
        town.setpieces = setpieces;
    }

    resolveLampSlots(town, count, span, template) {
        const configured = Array.isArray(town.lampSlots) ? town.lampSlots.slice(0, count) : [];
        if (configured.length >= count) return configured;
        const slots = [...configured];
        const gap = span.width / (count + 1);
        for (let i = slots.length; i < count; i++) {
            slots.push(span.start + gap * (i + 1));
        }
        return slots;
    }

    ensureHouses(town, kit, requirements) {
        const buildings = Array.isArray(town.buildings) ? town.buildings : [];
        const existingCount = buildings.length;
        const min = requirements.houseCount?.min ?? 0;
        const max = requirements.houseCount?.max ?? null;
        const target = Math.max(existingCount, min);
        const allowed = max ? Math.min(target, max) : target;
        const needed = Math.max(0, allowed - existingCount);
        if (needed <= 0) return;

        const span = this.getRegionSpan(town);
        const template = this.clonePlain(kit?.house || this.getAssetKit('default')?.house);
        if (!template) return;
        const slots = this.resolveHouseSlots(town, needed, span, template);
        for (let i = 0; i < needed; i++) {
            const slotX = slots[i];
            const building = this.buildHouseFromTemplate(template, slotX, existingCount + i, town);
            if (building) buildings.push(building);
        }
        town.buildings = buildings;
    }

    resolveHouseSlots(town, needed, span, template) {
        const slots = [];
        const existingXs = (town.buildings || [])
            .map(b => (b?.exterior?.x ?? b?.x))
            .filter(x => typeof x === 'number');
        const configured = Array.isArray(town.houseSlots) ? town.houseSlots : [];
        configured.forEach(x => {
            if (slots.length < needed && !existingXs.includes(x)) {
                slots.push(x);
            }
        });
        const remaining = needed - slots.length;
        if (remaining <= 0) return slots;
        const gap = span.width / (needed + 1);
        for (let i = 0; i < remaining; i++) {
            const candidate = span.start + gap * (i + 1);
            const adjusted = existingXs.includes(candidate)
                ? candidate + ((template?.exterior?.width || 120) * (template?.exterior?.scale || 0.4))
                : candidate;
            slots.push(adjusted);
        }
        return slots;
    }

    buildHouseFromTemplate(template, slotX, idx, town) {
        const house = this.clonePlain(template);
        if (!house.exterior) house.exterior = {};
        house.exterior.x = house.exterior.x ?? slotX;
        const templateId = template?.id;
        const houseId = (house.id && house.id !== templateId) ? house.id : `${town.id || 'house'}_${idx + 1}`;
        house.id = houseId;
        house.name = house.name || 'House';
        const templateInteriorId = template?.interior?.id;
        const interiorBaseId = house.interior?.id;
        const interiorId = (interiorBaseId && interiorBaseId !== templateInteriorId)
            ? interiorBaseId
            : `${houseId}_interior`;
        house.interior = this.ensureHouseInterior(house.interior || template.interior || {}, interiorId);
        return house;
    }

    ensureHouseInterior(interior = {}, id = null) {
        const resolved = this.clonePlain(interior) || {};
        if (id) {
            resolved.id = resolved.id || id;
            if (resolved.room) {
                resolved.room.id = resolved.room.id || id;
            }
        }
        return resolved;
    }

    ensureTownItems(town, requirements) {
        town.items = Array.isArray(town.items) ? town.items : [];
        const plan = { ...requirements.itemPlan, ...(town.itemPlan || {}) };
        const target = Math.max(plan?.count || 0, 0);
        if (!target) return;
        const pool = (Array.isArray(plan.pool) && plan.pool.length) ? plan.pool : this.defaultRequirements.itemPlan.pool;
        const missing = Math.max(0, target - town.items.length);
        if (missing <= 0) return;
        const span = this.getRegionSpan(town);
        const slots = this.resolveItemSlots(town, missing, plan, span);
        for (let i = 0; i < missing; i++) {
            const template = this.clonePlain(pool[i % pool.length]);
            if (!template) continue;
            const itemDef = { ...template, type: template.type || 'coffee' };
            itemDef.x = itemDef.x ?? slots[i] ?? (span.start + (plan.spacing || 280) * (i + 1));
            itemDef.y = itemDef.y ?? null;
            town.items.push(itemDef);
        }
    }

    resolveItemSlots(town, count, plan, span) {
        const configured = Array.isArray(town.itemSlots) ? town.itemSlots.slice(0, count) : [];
        if (configured.length >= count) return configured;
        const slots = [...configured];
        const spacing = plan?.spacing || 280;
        for (let i = slots.length; i < count; i++) {
            slots.push(span.start + spacing * (i + 1));
        }
        return slots;
    }

    hasSetpieceRole(setpieces = [], role = '', fallbackPredicate = null) {
        return setpieces.some(sp => {
            if (!sp) return false;
            if (sp.role === role) return true;
            if (typeof fallbackPredicate === 'function') return fallbackPredicate(sp);
            return false;
        });
    }

    /**
        * Check player position and trigger town entry when crossing a region.
        */
    update(deltaTime = 0) {
        const g = this.game;
        const p = g.player;
        if (!p || !g.level) return;

        this.ensureUpcomingTownPrepared();

        const town = this.getTownForPosition(g.currentLevelId, p.x);
        const townId = town?.id || null;
        if (townId && townId !== this.currentTownId) {
            this.handleTownEntry(town);
        } else if (!townId) {
            this.handleTownExit();
        }

        // If a town load was deferred until sprites decoded, load now
        if (this.pendingTownToLoad && this.spritePreloadReady) {
            this.loadTownContent(this.pendingTownToLoad);
            this.pendingTownToLoad = null;
        }

        this.updateMusicTransition(deltaTime);
        this.updateBuildingDoors(deltaTime);
        this.updateSetpieceAnimation(deltaTime);
        this.updateTownNpcs(deltaTime);
        this.ensureTownNpcsPresent();
    }

    /**
     * Instantiate building/foreground/interior metadata.
     */
    loadTownContent(town) {
        this.resetTownContent();
        if (!town) return;
        this.loadedTownId = town?.id || null;
        this.preloadedTownId = this.loadedTownId;
        const blueprint = this.getTownBlueprint(town);
        const buildings = blueprint.buildings.map(b => this.clonePlain(b));
        const setpieces = blueprint.setpieces.map(s => this.clonePlain(s));
        const npcs = blueprint.npcDefs.map(def => this.createNpc(def));
        const items = blueprint.items.map(i => this.clonePlain(i));
        this.activeContent = { buildings, setpieces, items };
        this.townNpcs = npcs;

        // Build renderable sprites so SceneRenderer can draw town content
        const decor = [];
        const addRenderable = (def) => {
            const renderable = this.buildDecorRenderable(def);
            if (renderable) decor.push(renderable);
        };

        buildings.forEach(b => addRenderable({
            x: b.exterior?.x ?? 0,
            y: b.exterior?.y ?? 0,
            width: b.displayWidth ?? b.exterior?.displayWidth ?? b.exterior?.width ?? b.width ?? b.frameWidth,
            height: b.displayHeight ?? b.exterior?.displayHeight ?? b.exterior?.height ?? b.height ?? b.frameHeight,
            sprite: b.sprite || b.exterior?.sprite,
            frames: b.frames,
            frameHeight: b.frameHeight,
            frameWidth: b.frameWidth,
            frameDirection: b.frameDirection,
            frameIndexRef: b,
            layer: b.exterior?.layer || 'foreground',
            doorRef: b
        }));

        setpieces.forEach(sp => addRenderable(sp));

        // Layer ordering: ground -> background -> foreground -> default
        // Lower numbers are drawn first (farthest); higher numbers are on top (closest)
        const layerOrder = { background: 0, backdrop: 0.5, midground: 1, ground: 2, foreground: 3, overlay: 4 };
        decor.sort((a, b) => (layerOrder[a.layer] ?? 3) - (layerOrder[b.layer] ?? 3));

        this.game.townDecor = decor;
        this.spawnTownItems(items, town);
        this.spawnTownColliders([...buildings, ...setpieces]);
        this.spawnTownNpcs();
    }

    /**
     * Preload first town content as soon as sprites finish decoding to avoid first-entry pop-in.
     */
    warmFirstTownContent(force = false) {
        if (!Array.isArray(this.towns) || !this.towns.length) return;
        const currentLevel = this.game?.currentLevelId;
        const firstTown = this.towns.find(t => !t.levelId || t.levelId === currentLevel) || this.towns[0];
        if (!firstTown) return;
        if (!force && this.initialWarmDone && this.loadedTownId === firstTown.id) return;
        const load = () => {
            this.loadTownContent(firstTown);
            this.initialWarmDone = true;
        };
        if (this.spritePreloadPromise) {
            this.spritePreloadPromise.then(load).catch(load);
        } else {
            load();
        }
    }

    resetTownContent() {
        this.removeTownItems();
        this.removeTownColliders();
        this.activeContent = { buildings: [], setpieces: [], items: [] };
        this.game.townDecor = [];
        this.removeTownNpcs();
        this.loadedTownId = null;
    }

    getTownBlueprint(town) {
        const id = town?.id || '__unknown';
        // Always rebuild so config tweaks (door offsets, interiors) take effect immediately
        this.townCache[id] = this.buildTownBlueprint(town);
        return this.townCache[id];
    }

    buildTownBlueprint(town) {
        const buildings = Array.isArray(town?.buildings) ? town.buildings.map(def => this.createBuilding(def)) : [];
        const setpieces = Array.isArray(town?.setpieces) ? town.setpieces.map(def => this.createSetpiece(def)) : [];
        const npcDefs = Array.isArray(town?.npcs) ? town.npcs.map(def => this.clonePlain(def)) : [];
        const items = Array.isArray(town?.items) ? town.items.map(def => this.clonePlain(def)) : [];
        // Prime renderables offscreen to reduce pop-in
        const renderables = [...buildings.map(b => this.buildDecorRenderable({
            x: b.exterior?.x ?? 0,
            y: b.exterior?.y ?? 0,
            width: b.displayWidth ?? b.exterior?.displayWidth ?? b.exterior?.width ?? b.width ?? b.frameWidth,
            height: b.displayHeight ?? b.exterior?.displayHeight ?? b.exterior?.height ?? b.height ?? b.frameHeight,
            sprite: b.sprite || b.exterior?.sprite,
            frames: b.frames,
            frameHeight: b.frameHeight,
            frameWidth: b.frameWidth,
            frameDirection: b.frameDirection,
            frameIndexRef: b,
            layer: b.exterior?.layer || 'foreground',
            doorRef: b
        })), ...setpieces.map(sp => this.buildDecorRenderable(sp))].filter(Boolean);
        renderables.forEach(r => this.primeRenderable(r));
        return { buildings, setpieces, npcDefs, items };
    }

    createBuilding(def = {}) {
        const frames = def.exterior?.frames ?? 2;
        const frameDirection = def.exterior?.frameDirection || 'vertical'; // 'vertical' or 'horizontal'
        const scale = def.exterior?.scale ?? 1;

        const autoAlignToGround = def.exterior?.autoAlignToGround ?? true;
        let exteriorY = def.exterior?.y ?? 0;
        const exteriorHeight = ((def.exterior?.height ?? def.exterior?.frameHeight ?? 0) * scale) || 0;
        if (autoAlignToGround && exteriorHeight) {
            const groundY = this.getGroundY();
            if (groundY !== null && groundY !== undefined) {
                exteriorY = groundY - exteriorHeight;
            }
        }

        const exterior = { ...(def.exterior || {}), y: exteriorY };
        const frameHeight = def.exterior?.frameHeight ?? (() => {
            if (frameDirection === 'horizontal') return def.exterior?.height || 0;
            const h = def.exterior?.height || 0;
            return Math.max(1, Math.floor(h / Math.max(1, frames)));
        })();
        const frameWidth = def.exterior?.frameWidth ?? (() => {
            if (frameDirection === 'horizontal') {
                const w = def.exterior?.width || 0;
                return Math.max(1, Math.floor(w / Math.max(1, frames)));
            }
            return def.exterior?.width || 0;
        })();

        const displayWidth = (def.exterior?.width ?? frameWidth) * scale;
        const displayHeight = (def.exterior?.height ?? frameHeight) * scale;
        exterior.displayWidth = displayWidth;
        exterior.displayHeight = displayHeight;
        exterior.scale = scale;

        const doorWidth = (def.door?.width ?? def.exterior?.doorWidth ?? 36) * scale;
        const doorHeight = (def.door?.height ?? def.exterior?.doorHeight ?? 48) * scale;
        const exteriorBottom = (exterior?.y ?? 0) + displayHeight;
        const spriteOffsetX = def.door?.spriteOffsetX;
        const spriteOffsetY = def.door?.spriteOffsetY;
        const doorXDefault = (spriteOffsetX !== undefined)
            ? (exterior?.x ?? 0) + (spriteOffsetX * scale)
            : (exterior?.x ?? 0) + ((displayWidth - doorWidth) / 2);
        const doorYDefault = (spriteOffsetY !== undefined)
            ? (exterior?.y ?? 0) + (spriteOffsetY * scale)
            : exteriorBottom - doorHeight;
        const interactRadiusDefault = (def.door?.interactRadius ?? Math.max(doorWidth, doorHeight) * 0.6);

        return {
            id: def.id || null,
            name: def.name || 'Building',
            exterior,
            frames,
            frameDirection,
            frameHeight,
            frameWidth,
            displayWidth,
            displayHeight,
            frameIndex: 0, // 0 = door closed, 1 = door open
            door: {
                x: def.door?.x ?? doorXDefault,
                y: def.door?.y ?? doorYDefault,
                width: doorWidth,
                height: doorHeight,
                interactRadius: interactRadiusDefault
            },
            sprite: def.exterior?.sprite || null,
            interiorId: def.interior?.id || def.interiorId || null,
            interior: def.interior ? this.clonePlain(def.interior) : null,
            npcs: Array.isArray(def.npcs) ? [...def.npcs] : [],
            doorTimer: 0,
            doorOpen: false,
            collider: def.collider ? { ...def.collider } : null
        };
    }

    createSetpiece(def = {}) {
        const scale = def.scale ?? 1;
        const frames = def.frames ?? 1;
        const frameDirection = def.frameDirection || 'vertical';
        const frameHeight = def.frameHeight || null;
        const frameWidth = def.frameWidth || null;
        const preserveAbsoluteSize = def.preserveAbsoluteSize === true;
        const hasExplicitWidth = def.width !== undefined && def.width !== null;
        const hasExplicitHeight = def.height !== undefined && def.height !== null;
        const baseWidth = hasExplicitWidth ? def.width : (frameWidth || def.width);
        const baseHeight = hasExplicitHeight ? def.height : (frameHeight || def.height);
        const scaledWidth = (baseWidth || frameWidth || 0) * scale || (def.width ?? 64);
        const scaledHeight = (baseHeight || frameHeight || 0) * scale || (def.height ?? 64);
        // When preserving absolute size, keep width fixed but still scale height to stay proportional to the player
        const displayWidth = preserveAbsoluteSize ? (baseWidth || scaledWidth) : scaledWidth;
        const displayHeight = preserveAbsoluteSize ? scaledHeight : scaledHeight;
        const autoAlignToGround = def.autoAlignToGround ?? true;
        let y = def.y ?? 0;
        if (autoAlignToGround && displayHeight) {
            const groundY = this.getGroundY();
            if (groundY !== null && groundY !== undefined) {
                // For ground-layer props, align to ground top; otherwise sit on top of ground
                if (def.layer === 'ground') {
                    y = groundY;
                } else {
                    y = groundY - displayHeight;
                }
            }
        }
        return {
            id: def.id || null,
            name: def.name || 'Setpiece',
            x: def.x ?? 0,
            y,
            width: displayWidth,
            height: displayHeight,
            layer: def.layer || 'foreground',
            sprite: def.sprite || null,
            frames,
            frameHeight: frameHeight || null,
            frameWidth: frameWidth || null,
            frameDirection,
            frameIndex: 0,
            frameTimeMs: def.frameTimeMs ?? 120,
            scale,
            tileX: def.tileX || false,
            tileWidth: def.tileWidth || null,
            collider: def.collider ? { ...def.collider } : null
        };
    }

    createNpc(def = {}) {
        const npc = this.game?.entityFactory?.townNpc?.(def);
        if (npc) {
            npc.dialogueId = def.dialogueId || npc.dialogueId;
        }
        return npc;
    }

    buildInteriorMap() {
        const map = {};
        if (!Array.isArray(this.towns)) return map;
        this.towns.forEach(town => {
            (town?.interiors || []).forEach(int => {
                const id = int?.id || int?.interiorId;
                if (!id) return;
                map[id] = this.clonePlain(int);
            });
        });
        return map;
    }

    getInteriorConfig(id = null, building = null) {
        if (!id) return null;
        if (building?.interior && (!building.interior?.id || building.interior?.id === id)) {
            return building.interior;
        }
        return this.interiorConfigMap?.[id] || null;
    }

    resolveRoomManager(game) {
        const g = game || this.game;
        if (g?.roomManager) return g.roomManager;
        const ctor = (typeof RoomManager !== 'undefined')
            ? RoomManager
            : (typeof window !== 'undefined' ? window.RoomManager : null);
        if (!ctor) return null;
        const instance = new ctor(g);
        if (g) g.roomManager = instance;
        return instance;
    }

    ensureRoomManager() {
        // ALWAYS use game.roomManager if it exists to avoid having multiple instances
        if (this.game?.roomManager) {
            this.roomManager = this.game.roomManager;
            return this.roomManager;
        }
        if (this.roomManager && typeof this.roomManager.enterRoom === 'function') {
            return this.roomManager;
        }
        this.roomManager = this.resolveRoomManager(this.game);
        return this.roomManager;
    }

    registerLegacyInteriorsAsRooms() {
        if (typeof window === 'undefined') return;
        window.RoomDescriptors = window.RoomDescriptors || {};
        const defs = window.LevelDefinitions || {};
        Object.entries(defs).forEach(([id, def]) => {
            if (!def) return;
            // Only convert explicit interiors (avoid normal levels like testRoom)
            const isInteriorLike = def.theme === 'interior' || def.isInterior === true || def.backgroundImage;
            if (!isInteriorLike) return;
            if (window.RoomDescriptors[id]) return;
            const room = this.convertLevelDefinitionToRoom(id, def);
            if (room) {
                window.RoomDescriptors[id] = room;
            }
        });
    }

    resolveInteriorRoom(interiorId = null, interiorConfig = {}) {
        if (!interiorId) return null;
        const registry = this.roomManager?.resolveRoomRegistry?.() || (typeof window !== 'undefined' ? window.roomRegistry : null);
        const explicitRoom = interiorConfig.room || interiorConfig.descriptor;
        if (explicitRoom) {
            if (registry?.normalize) return registry.normalize(explicitRoom, { id: interiorId });
            return this.clonePlain(explicitRoom);
        }

        if (registry?.get?.(interiorId)) {
            const built = registry.build(interiorId, interiorConfig.overrides || {});
            if (built) return built;
        }

        const globalRoom = this.getGlobalRoomDescriptor(interiorId);
        if (globalRoom) {
            if (registry?.register) registry.register(interiorId, globalRoom);
            return globalRoom;
        }

        const levelDef = interiorConfig.level || interiorConfig.definition || (typeof window !== 'undefined' ? window.LevelDefinitions?.[interiorId] : null);
        if (levelDef) {
            const converted = this.convertLevelDefinitionToRoom(interiorId, levelDef);
            if (converted && registry?.register) registry.register(interiorId, converted);
            return converted;
        }
        return null;
    }

    getGlobalRoomDescriptor(id = null) {
        if (!id || typeof window === 'undefined') return null;
        const normalized = id.replace('_', '');
        return (window.RoomDescriptors?.[id] || window.RoomDescriptors?.[normalized]) || null;
    }

    convertLevelDefinitionToRoom(interiorId = null, levelDef = {}) {
        const width = levelDef.width || 1024;
        const height = levelDef.height || 720;
        const spawn = levelDef.spawn || { x: 200, y: height - 200 };
        const exit = levelDef.exit || { x: spawn.x, y: spawn.y + 40, radius: 80 };
        return {
            id: interiorId,
            width,
            height,
            spawn,
            exit,
            backgroundImage: levelDef.backgroundImage,
            platforms: Array.isArray(levelDef.platforms) ? levelDef.platforms.map(p => ({ ...p })) : [],
            enemies: Array.isArray(levelDef.enemies) ? levelDef.enemies.map(e => ({ ...e })) : [],
            items: Array.isArray(levelDef.items) ? levelDef.items.map(i => ({ ...i })) : [],
            npcs: Array.isArray(levelDef.npcs) ? levelDef.npcs.map(n => ({ ...n })) : [],
            hazards: Array.isArray(levelDef.hazards) ? levelDef.hazards.map(h => ({ ...h })) : [],
            theme: levelDef.theme || 'interior'
        };
    }

    getTownForPosition(levelId, x) {
        if (!Array.isArray(this.towns)) return null;
        return this.towns.find(t => (!t.levelId || t.levelId === levelId) && x >= (t.region?.startX ?? Infinity) && x <= (t.region?.endX ?? -Infinity)) || null;
    }

    /**
     * Load upcoming town content before it reaches the viewport to avoid pop-in.
     */
    ensureUpcomingTownPrepared() {
        if (!Array.isArray(this.towns) || !this.towns.length) return;
        const g = this.game;
        const camera = g.camera || {};
        const viewportWidth = camera.viewportWidth || g.canvas?.width || 0;
        const cameraRight = (camera.x || 0) + viewportWidth;
        const lookahead = this.getTownPreloadDistance(viewportWidth);
        const upcoming = this.towns.find(town => {
            if (town.levelId && town.levelId !== g.currentLevelId) return false;
            const startX = town.region?.startX ?? Infinity;
            const endX = town.region?.endX ?? -Infinity;
            if (cameraRight > endX) return false; // already passed this town
            // Load town when its start is approaching (within lookahead distance from current camera position)
            if (startX > (camera.x || 0) + lookahead) return false; // still too far away
            if (this.loadedTownId === town.id && this.game.townDecor?.length) return false; // already loaded with content
            if (this.currentTownId && this.currentTownId !== town.id) return false; // don't replace an active town
            return true;
        });
        if (!upcoming) return;

        // If sprites are still decoding, defer until they're ready.
        if (!this.spritePreloadReady && this.spritePreloadPromise) {
            this.pendingTownToLoad = this.pendingTownToLoad || upcoming;
            return;
        }

        this.loadTownContent(upcoming);
    }

    getTownPreloadDistance(viewportWidth = 0) {
        const base = viewportWidth ? viewportWidth * 2.5 : 2400;
        const minimum = 3000;
        return Math.max(minimum, this.preloadDistance || base);
    }

    /**
     * Build and cache renderables for all towns on the current level without changing active decor.
     */
    warmLevelTownCache() {
        if (!Array.isArray(this.towns)) return;
        const levelId = this.game?.currentLevelId;
        this.towns
            .filter(t => !t.levelId || t.levelId === levelId)
            .forEach(town => {
                this.townCache[town.id || '__unknown'] = this.buildTownBlueprint(town);
            });
    }

    handleTownEntry(town) {
        const g = this.game;
        this.currentTownId = town.id;
        this.lastBannerAt = g.gameTime || 0;
        g.uiManager?.showTownBanner?.(town);
        if (!this.spritePreloadReady && this.spritePreloadPromise) {
            this.pendingTownToLoad = town;
            return;
        }
        // Only load if not already preloaded (avoid clearing preloaded content)
        if (this.loadedTownId !== town.id || !this.game.townDecor?.length) {
            this.loadTownContent(town);
        }
        this.handleTownMusic(town);
    }

    handleTownExit() {
        if (!this.currentTownId) return;
        this.handleTownMusic(null);
        this.resetTownContent();
        this.currentTownId = null;
        this.preloadedTownId = null;
    }

    handleTownMusic(town, options = {}) {
        const audio = this.getAudioManager();
        if (!audio) return;
        const baseId = this.getBaseMusicId();
        const baseVolume = this.getBaseMusicVolume();
        const fromRoom = options.fromRoom === true;

        if (town) {
            const townMusicId = this.getTownMusicId(town);
            if (!townMusicId) return;
            this.ensureTownMusicLoaded(town);
            if (fromRoom && audio.music?.[baseId]) {
                audio.setTrackVolume?.(baseId, 0);
                audio.music[baseId].pause();
            } else {
                this.ensureTrackPlaying(baseId, baseVolume);
            }
            this.activeTownMusicId = townMusicId;
            if (fromRoom) {
                this.ensureTrackPlaying(townMusicId, this.getTownMusicVolume(town));
                audio.setTrackVolume?.(townMusicId, this.getTownMusicVolume(town));
                this.musicTransition = null;
            } else {
                this.beginTownEntryTransition({
                    baseId,
                    townId: townMusicId,
                    fromBase: audio.getTrackVolume?.(baseId) ?? baseVolume,
                    toTown: this.getTownMusicVolume(town)
                });
            }
            return;
        }

        if (this.activeTownMusicId) {
            const townMusicId = this.activeTownMusicId;
            this.beginTownExitTransition({
                baseId,
                townId: townMusicId,
                fromTown: audio.getTrackVolume?.(townMusicId) ?? this.getTownMusicVolume(town),
                toBase: baseVolume
            });
            this.activeTownMusicId = null;
        }
    }

    beginCrossFade({ baseId = null, townId = null, fromBase = 0, toBase = 0, fromTown = 0, toTown = 0 }) {
        this.musicTransition = {
            stage: 'cross',
            baseId,
            townId,
            fromBase,
            toBase,
            fromTown,
            toTown,
            elapsed: 0,
            duration: this.fadeDuration
        };
    }

    beginTownEntryTransition({ baseId = null, townId = null, fromBase = 0, toTown = 0 }) {
        this.musicTransition = {
            stage: 'fadeOutBase',
            baseId,
            townId,
            fromBase,
            toBase: 0,
            fromTown: 0,
            toTown,
            elapsed: 0,
            duration: this.fadeDuration
        };
    }

    beginTownExitTransition({ baseId = null, townId = null, fromTown = 0, toBase = 0 }) {
        this.musicTransition = {
            stage: 'fadeOutTown',
            baseId,
            townId,
            fromBase: 0,
            toBase,
            fromTown,
            toTown: 0,
            elapsed: 0,
            duration: this.fadeDuration
        };
    }

    /**
     * Handle interact input for town building doors. Returns true if consumed.
     */
    handleDoorInteract() {
        const g = this.game;
        const p = g.player;
        const input = g.services?.input || g.input;
        if (!p || !input) return false;
        const consumeInteract = () => {
            if (typeof input.consumeInteract === 'function') return input.consumeInteract();
            return input.consumeInteractPress?.();
        };
        const pressed = consumeInteract();
        const allowAuto = this.autoEnterDoorsInDebug;
        if (!pressed && !allowAuto) return false;

        // Interior exit handling: only care about exit zones, ignore building doors
        if (this.activeInterior && this.isInsideInteriorRoom()) {
            if (this.isPlayerAtInteriorExit(p)) {
                this.exitInterior();
                return true;
            }
            // Don't consume the interaction - let NPCs handle it
            return false;
        }

        const building = this.getNearbyBuildingDoor(p);
        if (building) {
            this.enterBuilding(building);
            return true;
        }

        // Debug aid: report nearest door distance when interact is pressed but no door found
        if (g.debug && Array.isArray(this.activeContent?.buildings)) {
            let nearest = null;
            let bestDistSq = Infinity;
            const px = p.x + (p.width ? p.width / 2 : 0);
            const py = p.y + (p.height ? p.height : 0);
            this.activeContent.buildings.forEach(b => {
                const door = b.door || {};
                const cx = (door.x ?? 0) + (door.width || 0) / 2;
                const cy = (door.y ?? 0) + (door.height || 0) / 2;
                const dx = px - cx;
                const dy = py - cy;
                const distSq = dx * dx + dy * dy;
                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    nearest = { building: b, door, distSq };
                }
            });
            if (nearest) {
                const dist = Math.sqrt(nearest.distSq);
                const radius = nearest.door.interactRadius ?? 0;
                g.uiManager?.showSpeechBubble?.(`Door too far: ${dist.toFixed(1)} (radius ${radius})`);
            } else {
                g.uiManager?.showSpeechBubble?.('No building doors loaded');
            }
        }

        return false;
    }

    getNearbyBuildingDoor(player) {
        if (!player || !Array.isArray(this.activeContent?.buildings)) return null;
        const px = player.x + (player.width ? player.width / 2 : 0);
        const py = player.y + (player.height ? player.height : 0);
        return this.activeContent.buildings.find(b => {
            const door = b.door || {};
            const centerX = (door.x ?? 0) + (door.width || 0) / 2;
            const centerY = (door.y ?? 0) + (door.height || 0) / 2;
            const dx = (px || 0) - centerX;
            const dy = (py || 0) - centerY;
            const distSq = dx * dx + dy * dy;
            const radius = door.interactRadius ?? 32;
            return distSq <= radius * radius;
        }) || null;
    }

    enterBuilding(building) {
        const label = building?.name || 'Building';
        const interiorId = building?.interiorId || building?.interior?.id || null;
        if (!interiorId) {
            this.game?.uiManager?.showSpeechBubble?.(`${label} is locked.`);
            return;
        }

        const interiorConfig = this.getInteriorConfig(interiorId, building) || {};
        const roomDesc = this.resolveInteriorRoom(interiorId, interiorConfig);
        if (!roomDesc) {
            this.game?.uiManager?.showSpeechBubble?.(`Add Room "${interiorId}" to enter ${label}.`);
            return;
        }

        const player = this.game?.player;
        const returnPosition = this.getExteriorReturnPosition(building, player);
        const spawnOverride = interiorConfig.spawn || interiorConfig.spawnPoint || roomDesc.spawn || null;
        const exitZone = interiorConfig.exit || interiorConfig.exitZone || this.getDefaultInteriorExit(spawnOverride || roomDesc.spawn, player);

        const prevTestMode = this.game?.testMode;
        if (this.game) {
            this.game.testMode = false; // force non-test layout for interiors
        }

        this.interiorReturn = {
            levelId: this.game?.currentLevelId || null,
            townId: this.currentTownId,
            buildingId: building?.id || null,
            position: returnPosition,
            prevTestMode
        };
        this.activeInterior = {
            id: interiorId,
            buildingId: building?.id || null,
            exitZone,
            label
        };

        this.openBuildingDoor(building);
        const mgr = this.ensureRoomManager();
        if (roomDesc && mgr) {
            const room = mgr.buildRoomDescriptor(interiorId, roomDesc, spawnOverride, exitZone);
            mgr.enterRoom(room, returnPosition);
            this.handleRoomMusic(roomDesc);
        } else {
            this.game?.uiManager?.showSpeechBubble?.('Room system is unavailable.');
        }
    }

    openBuildingDoor(building) {
        if (!building) return;
        building.doorOpen = true;
        building.frameIndex = 1; // second frame = door open
        building.doorTimer = this.doorAutoCloseMs;
    }

    closeBuildingDoor(building) {
        if (!building) return;
        building.doorOpen = false;
        building.frameIndex = 0;
        building.doorTimer = 0;
    }

    updateBuildingDoors(deltaTime = 0) {
        if (!Array.isArray(this.activeContent?.buildings)) return;
        this.activeContent.buildings.forEach(b => {
            if (!b.doorOpen) return;
            b.doorTimer = Math.max(0, (b.doorTimer || 0) - deltaTime);
            if (b.doorTimer <= 0) {
                this.closeBuildingDoor(b);
            }
        });
    }

    updateSetpieceAnimation(deltaTime = 0) {
        if (!Array.isArray(this.activeContent?.setpieces)) return;
        this.activeContent.setpieces.forEach(sp => {
            if (!sp.frames || sp.frames <= 1) return;
            const frameTime = sp.frameTimeMs ?? 120;
            sp._frameTimer = (sp._frameTimer || 0) + deltaTime;
            if (sp._frameTimer >= frameTime) {
                const advance = Math.floor(sp._frameTimer / frameTime);
                sp._frameTimer -= advance * frameTime;
                sp.frameIndex = ((sp.frameIndex || 0) + advance) % sp.frames;
            }
        });
    }

    getExteriorReturnPosition(building, player = null) {
        if (!building) return null;
        const door = building.door || {};
        const playerWidth = player?.width ?? 48;
        const playerHeight = player?.height ?? 64;
        const doorWidth = door.width ?? playerWidth;
        const doorHeight = door.height ?? playerHeight;
        const x = (door.x ?? 0) + Math.max(0, (doorWidth - playerWidth) / 2);
        const y = (door.y ?? 0) + Math.max(0, doorHeight - playerHeight);
        return { x, y };
    }

    getDefaultInteriorExit(spawn = null, player = null) {
        const playerWidth = player?.width ?? 48;
        const playerHeight = player?.height ?? 64;
        const fallbackSpawn = spawn || { x: player?.x ?? 80, y: player?.y ?? 0 };
        return {
            x: fallbackSpawn.x + playerWidth * 0.5,
            y: fallbackSpawn.y + playerHeight * 0.5,
            radius: Math.max(playerWidth, playerHeight) * 0.8
        };
    }

    isInsideInteriorRoom() {
        const g = this.game;
        if (!this.activeInterior || !g) return false;
        const activeRoomId = g.currentRoomId || null;
        const worldKind = g.activeWorld?.kind || (g.roomManager?.isActive?.() ? 'room' : 'level');
        return worldKind === 'room' && activeRoomId === this.activeInterior.id;
    }

    isPlayerAtInteriorExit(player) {
        if (!player || !this.activeInterior?.exitZone) return false;
        const zone = this.activeInterior.exitZone;
        const px = player.x + (player.width ? player.width / 2 : 0);
        const py = player.y + (player.height || 0);
        if (zone.radius) {
            const dx = px - (zone.x ?? 0);
            const dy = py - (zone.y ?? 0);
            return dx * dx + dy * dy <= Math.pow(zone.radius, 2);
        }
        const zx = zone.x ?? 0;
        const zy = zone.y ?? 0;
        const zw = zone.width ?? 64;
        const zh = zone.height ?? 64;
        return px >= zx && px <= zx + zw && py >= zy && py <= zy + zh;
    }

    exitInterior() {
        if (!this.activeInterior || !this.interiorReturn) return;
        
        // Check if leaving Club Cidic - stop Sound Gallery music
        const wasClubCidic = this.activeInterior?.id === 'club_cidic_interior';
        if (wasClubCidic && this.game?.audioManager) {
            this.game.audioManager.stopAllMusic();
        }
        
        const targetLevel = this.interiorReturn.levelId || 'testRoom';
        const spawn = this.interiorReturn.position || null;
        const prevTestMode = this.interiorReturn.prevTestMode;
        if (this.game && typeof prevTestMode === 'boolean') {
            this.game.testMode = prevTestMode;
        }
        this.activeInterior = null;
        this.interiorReturn = null;
        if (this.roomManager?.isActive()) {
            this.roomManager.exitRoom();
            this.handleRoomMusic(null, true, { resumeBase: false });
            const g = this.game;
            const playerX = g?.player?.x ?? 0;
            const town = this.getTownForPosition(g?.currentLevelId, playerX);
            if (town) {
                this.currentTownId = town.id;
                this.loadTownContent(town);
                this.handleTownMusic(town, { fromRoom: true });
            } else {
                this.handleTownMusic(null);
            }
            return;
        }
        this.restoreExteriorWorld(targetLevel, spawn);
    }

    restoreExteriorWorld(levelId = null, spawn = null) {
        const g = this.game;
        if (!g || !levelId) return;
        this.resetTownContent();
        this.currentTownId = null;
        this.handleRoomMusic(null, true);
        g.createLevel?.(levelId);
        const spawnX = spawn?.x ?? g.level?.spawnX ?? g.player?.x ?? 0;
        const spawnY = spawn?.y ?? g.level?.spawnY ?? g.player?.y ?? 0;
        if (g.player) {
            g.player.x = spawnX;
            g.player.y = spawnY;
            if (g.player.velocity) {
                g.player.velocity.x = 0;
                g.player.velocity.y = 0;
            }
            g.player.onGround = false;
        }
        g.setActiveWorld?.('level', { id: levelId, theme: g.currentTheme, bounds: { width: g.level?.width, height: g.level?.height } });
        const town = this.getTownForPosition(levelId, spawnX);
        if (town) {
            this.currentTownId = town.id;
            this.loadTownContent(town);
            this.handleTownMusic(town);
        }
    }

    handleRoomMusic(roomDesc = null, stopOnly = false, options = {}) {
        const audio = this.getAudioManager();
        if (!audio) return;
        const roomMusicId = roomDesc?.music?.id || this.activeRoomMusicId || 'room_theme';
        const roomMusicSrc = roomDesc?.music?.src || 'music/beach-house.mp3';
        const roomVolume = roomDesc?.music?.volume ?? 0.8;
        const baseId = this.getBaseMusicId();
        const activeTownId = this.activeTownMusicId;
        const resumeBase = options.resumeBase !== false;

        if (stopOnly || !roomDesc) {
            const stopId = this.activeRoomMusicId || roomMusicId;
            if (stopId && audio.music?.[stopId]) {
                audio.music[stopId].pause();
                audio.setTrackVolume?.(stopId, 0);
            }
            this.activeRoomMusicId = null;
            if (activeTownId && audio.music?.[activeTownId]) {
                audio.music[activeTownId].pause();
                audio.setTrackVolume?.(activeTownId, this.getTownMusicVolume({}));
            }
            if (resumeBase && baseId && audio.music?.[baseId]) {
                audio.setTrackVolume?.(baseId, this.getBaseMusicVolume());
                audio.playMusic?.(baseId, this.getBaseMusicVolume(), { allowParallel: true, restartIfPlaying: false });
            }
            return;
        }

        // Special case: Club Cidic uses Sound Gallery music state
        const isClubCidic = roomDesc?.id === 'club_cidic_interior' || this.activeInterior?.id === 'club_cidic_interior';
        if (isClubCidic && this.game?.soundGallery) {
            // Stop base and town music
            if (baseId && audio.music?.[baseId]) {
                audio.setTrackVolume?.(baseId, 0);
            }
            if (activeTownId && audio.music?.[activeTownId]) {
                audio.setTrackVolume?.(activeTownId, 0);
                audio.music[activeTownId].pause();
            }
            
            // Apply user's music selection if they've interacted, otherwise play default
            if (this.game.soundGallery.hasUserInteracted) {
                this.game.soundGallery.applyClubCidicMusic();
                return;
            }
            // Fall through to play default room music
        }

        if (!audio.music?.[roomMusicId] && roomMusicSrc) {
            audio.loadMusic?.(roomMusicId, roomMusicSrc);
        }
        if (baseId && audio.music?.[baseId]) {
            audio.setTrackVolume?.(baseId, 0);
        }
        if (activeTownId && audio.music?.[activeTownId]) {
            audio.setTrackVolume?.(activeTownId, 0);
            audio.music[activeTownId].pause();
        }
        if (audio.music?.[roomMusicId]) {
            audio.playMusic?.(roomMusicId, roomVolume, { allowParallel: true, restartIfPlaying: true });
            audio.setTrackVolume?.(roomMusicId, roomVolume);
            this.activeRoomMusicId = roomMusicId;
        }
    }

    spawnTownNpcs() {
        const g = this.game;
        if (!Array.isArray(this.townNpcs)) return;
        this.townNpcs.forEach(npc => {
            if (!npc) return;
            npc.game = g;
            if (!g.npcs.includes(npc)) {
                g.npcs.push(npc);
            }
        });
    }

    removeTownNpcs() {
        if (!this.game || !Array.isArray(this.townNpcs) || !Array.isArray(this.game.npcs)) return;
        this.game.npcs = this.game.npcs.filter(npc => !this.townNpcs.includes(npc));
        this.townNpcs = [];
    }

    restoreTownNpcs() {
        this.spawnTownNpcs();
    }

    updateTownNpcs(deltaTime = 0) {
        if (!Array.isArray(this.townNpcs)) return;
        this.townNpcs.forEach(npc => npc?.update?.(deltaTime));
    }

    ensureTownNpcsPresent() {
        const g = this.game;
        if (!Array.isArray(this.townNpcs) || !Array.isArray(g.npcs)) return;
        this.townNpcs.forEach(npc => {
            if (!npc) return;
            // Re-align to ground each ensure step to keep with player layer
            const groundY = this.getGroundY();
            if (groundY !== null && groundY !== undefined) {
                npc.y = groundY - npc.height;
                if (Array.isArray(npc.patrol)) {
                    npc.patrol = npc.patrol.map(p => ({ x: p.x, y: groundY - npc.height }));
                }
            }
            npc.game = g;
            if (!g.npcs.includes(npc)) {
                g.npcs.push(npc);
            }
        });
    }

    spawnTownItems(items = [], town = null) {
        const g = this.game;
        if (!g || !Array.isArray(items)) return;
        this.removeTownItems();
        const groundY = this.getGroundY();
        const spawned = [];
        items.forEach((def, idx) => {
            if (!def) return;
            const itemDef = { ...def };
            if (itemDef.y === undefined || itemDef.y === null) {
                const offset = itemDef.height ?? 50;
                itemDef.y = (groundY !== null && groundY !== undefined) ? groundY - offset : 0;
            }
            itemDef.x = itemDef.x ?? (town?.region?.startX ?? 0) + ((idx + 1) * 120);
            const item = this.createTownItem(itemDef);
            if (item) {
                item.game = g;
                g.items.push(item);
                spawned.push(item);
            }
        });
        this.activeTownItems = spawned;
    }

    spawnTownColliders(items = []) {
        const g = this.game;
        const factory = g?.entityFactory;
        if (!g || !factory || !Array.isArray(items)) return;
        this.removeTownColliders();

        items.forEach(item => {
            if (!item?.collider) return;
            const baseX = item.exterior?.x ?? item.x ?? 0;
            const baseY = item.exterior?.y ?? item.y ?? 0;
            const col = item.collider;
            const colX = baseX + (col.offsetX ?? 0);
            const colY = baseY + (col.offsetY ?? 0);
            const colWidth = col.width ?? item.displayWidth ?? item.width ?? 64;
            const colHeight = col.height ?? 16;
            const colliderDef = {
                type: 'decor_platform',
                x: colX,
                y: colY,
                width: colWidth,
                height: colHeight,
                hitboxWidth: col.hitboxWidth,
                hitboxHeight: col.hitboxHeight,
                hitboxOffsetX: col.hitboxOffsetX,
                hitboxOffsetY: col.hitboxOffsetY,
                sprite: null
            };
            const collider = factory.create(colliderDef);
            if (collider) {
                collider.game = g;
                collider.type = 'decor_platform';
                collider.invisible = true;
                collider.hidden = true;
                collider.render = false;
                // oneWay defaults to true for invisible platforms (set in DecorPlatform)
                g.platforms.push(collider);
                this.activeTownColliders.push(collider);
            }
        });
    }

    removeTownColliders() {
        if (!this.game || !Array.isArray(this.activeTownColliders) || !Array.isArray(this.game.platforms)) return;
        this.game.platforms = this.game.platforms.filter(p => !this.activeTownColliders.includes(p));
        this.activeTownColliders = [];
    }

    removeTownItems() {
        if (!this.game || !Array.isArray(this.activeTownItems) || !Array.isArray(this.game.items)) return;
        this.game.items = this.game.items.filter(item => !this.activeTownItems.includes(item));
        this.activeTownItems = [];
    }

    createTownItem(def = {}) {
        const factory = this.game?.entityFactory;
        if (!factory) return null;
        if (typeof factory.create === 'function') {
            return factory.create(def);
        }
        return null;
    }

    buildDecorRenderable(def = {}) {
        const spritePath = def.sprite;
        const img = this.getSprite(spritePath);
        if (!img) return null;
        const frames = Math.max(1, def.frames || 1);
        const frameDirection = def.frameDirection || 'vertical';
        const scale = def.scale ?? 1;
        const frameWidth = def.frameWidth ?? (frameDirection === 'horizontal' ? (img.width / frames) : img.width);
        const frameHeight = def.frameHeight ?? (frameDirection === 'vertical' ? (img.height / frames) : img.height);
        const width = def.width ?? ((frameDirection === 'horizontal' ? frameWidth : (def.frameWidth ?? frameWidth)) * scale);
        const height = def.height ?? ((frameDirection === 'vertical' ? frameHeight : (def.frameHeight ?? frameHeight)) * scale);
        const ref = def.frameIndexRef;
        const tileX = !!def.tileX;
        const tileWidth = def.tileWidth || (frameWidth * scale);
        const manager = this;
        return {
            x: def.x || 0,
            y: def.y || 0,
            width,
            height,
            layer: def.layer || 'foreground',
            sprite: spritePath,
            render: (ctx, camera) => {
                if (!ctx || !img.complete) return;
                
                // Viewport culling with large buffer to render ahead of player
                const renderBuffer = 2000; // Render 2000px beyond viewport edges
                const destX = (def.x || 0) - (camera?.x || 0);
                const destY = (def.y || 0) - (camera?.y || 0);
                
                if (destX + width < -renderBuffer ||
                    destX > ctx.canvas.width + renderBuffer ||
                    destY + height < -renderBuffer ||
                    destY > ctx.canvas.height + renderBuffer) {
                    return; // Skip rendering if too far off-screen
                }
                
                const frameIdx = ref?.frameIndex ?? def.frameIndex ?? 0;
                const sx = frameDirection === 'horizontal' ? frameIdx * frameWidth : 0;
                const sy = frameDirection === 'vertical' ? frameIdx * frameHeight : 0;
                const srcW = frameDirection === 'horizontal' ? frameWidth : img.width;
                const srcH = frameDirection === 'vertical' ? frameHeight : img.height;

                if (tileX) {
                    for (let x = 0; x < width; x += tileWidth) {
                        const drawWidth = Math.min(tileWidth, width - x);
                        ctx.drawImage(
                            img,
                            sx, sy,
                            srcW, srcH,
                            destX + x,
                            destY,
                            drawWidth,
                            height
                        );
                    }
                } else {
                    ctx.drawImage(
                        img,
                        sx, sy,
                        srcW,
                        srcH,
                        destX,
                        destY,
                        width,
                        height
                    );
                }

                // Debug overlay for building doors (visible when debug is enabled)
                if (manager?.game?.debug && def.doorRef?.door) {
                    const door = def.doorRef.door;
                    const doorX = (door.x || 0) - (camera?.x || 0);
                    const doorY = (door.y || 0) - (camera?.y || 0);
                    ctx.save();
                    ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(doorX, doorY, door.width || 0, door.height || 0);
                    const radius = door.interactRadius || 0;
                    if (radius > 0) {
                        ctx.beginPath();
                        ctx.arc(doorX + (door.width || 0) / 2, doorY + (door.height || 0) / 2, radius, 0, Math.PI * 2);
                        ctx.strokeStyle = 'rgba(0, 200, 100, 0.6)';
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }
        };
    }

    getGroundY() {
        const g = this.game;
        if (typeof g.testGroundY === 'number') return g.testGroundY;
        if (Array.isArray(g.platforms)) {
            const ground = g.platforms.find(p => p?.type === 'ground');
            if (ground) return ground.y;
        }
        if (g.canvas?.height) {
            const groundHeight = g.config?.testRoom?.groundHeight ?? 50;
            return g.canvas.height - groundHeight;
        }
        if (g.level?.height) {
            const groundHeight = g.config?.testRoom?.groundHeight ?? 50;
            return g.level.height - groundHeight;
        }
        return null;
    }

    getSprite(path) {
        if (!path) return null;
        if (this.spriteCache[path]) return this.spriteCache[path];
        const img = new Image();
        img.decoding = 'async';
        // Normalize paths with spaces to avoid fetch/load failures
        const normalizedSrc = encodeURI(path);
        img.src = normalizedSrc;
        this.spriteCache[path] = img;
        if (typeof img.decode === 'function') {
            this.spriteDecodePromises[path] = img.decode().catch(() => {});
        }
        return img;
    }

    preloadTownSprites() {
        if (!Array.isArray(this.towns)) return;
        const paths = new Set();
        this.towns.forEach(town => {
            (town?.buildings || []).forEach(b => {
                if (b?.exterior?.sprite) paths.add(b.exterior.sprite);
            });
            (town?.setpieces || []).forEach(sp => {
                if (sp?.sprite) paths.add(sp.sprite);
            });
        });
        // Preload via Image + fetch(blob) to force network/cache, then decode and prime GPU upload
        const promises = [];
        paths.forEach(p => {
            const img = this.getSprite(p);
            if (img && typeof img.decode === 'function') {
                const promise = img.decode().then(() => this.primeSpriteUpload(img)).catch(() => {});
                this.spriteDecodePromises[p] = promise;
                promises.push(promise);
            }
            if (typeof fetch === 'function') {
                const fetchPromise = fetch(encodeURI(p), { cache: 'force-cache' })
                    .then(res => res.ok ? res.blob() : null)
                    .then(blob => {
                        if (!blob || !img) return null;
                        const objectUrl = URL.createObjectURL(blob);
                        img.src = objectUrl;
                        if (typeof img.decode === 'function') {
                            const decodePromise = img.decode().then(() => this.primeSpriteUpload(img)).catch(() => {});
                            this.spriteDecodePromises[p] = decodePromise;
                            return decodePromise;
                        }
                        return null;
                    })
                    .catch(() => null);
                promises.push(fetchPromise);
            }
        });
        const filtered = promises.filter(Boolean);
        if (filtered.length) {
            this.spritePreloadPromise = Promise.all(filtered)
                .then(() => {
                    this.spritePreloadReady = true;
                    if (!this.preloadedTownId && this.towns?.length) {
                        const firstTown = this.towns[0];
                        this.preloadedTownId = firstTown.id;
                        this.loadTownContent(firstTown);
                    }
                    if (this.pendingTownToLoad) {
                        this.loadTownContent(this.pendingTownToLoad);
                        this.pendingTownToLoad = null;
                    }
                })
                .catch(() => { this.spritePreloadReady = true; });
        } else {
            this.spritePreloadReady = true;
        }
    }

    /**
     * Draw once to a tiny offscreen canvas to force GPU upload and avoid first-draw hitch/pop.
     */
    primeSpriteUpload(img) {
        if (!img || !img.width || !img.height) return;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(2, img.width);
            canvas.height = Math.min(2, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            // ignore
        }
    }

    /**
     * Draw renderable offscreen once to encourage eager upload.
     */
    primeRenderable(renderable) {
        if (!renderable || typeof renderable.render !== 'function') return;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 4;
            canvas.height = 4;
            const ctx = canvas.getContext('2d');
            renderable.render(ctx, { x: 0, y: 0 });
        } catch (e) {
            // ignore
        }
    }

    /**
     * Clone plain data (no functions/cycles). Falls back to the source if cloning fails.
     */
    clonePlain(obj) {
        if (obj === null || obj === undefined) return obj;
        try {
            if (typeof structuredClone === 'function') return structuredClone(obj);
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return obj;
        }
    }

    cloneObject(obj) {
        try {
            return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return JSON.parse(JSON.stringify(obj));
        }
    }

    updateMusicTransition(deltaTime = 0) {
        const t = this.musicTransition;
        const audio = this.getAudioManager();
        if (!t || !audio) return;
        t.elapsed += deltaTime;
        const progress = Math.min(1, t.elapsed / t.duration);
        const lerp = (a, b) => a + (b - a) * progress;

        if (t.stage === 'fadeOutBase') {
            if (t.baseId) {
                audio.setTrackVolume?.(t.baseId, lerp(t.fromBase, t.toBase));
            }
            if (progress >= 1) {
                if (t.baseId && audio.music?.[t.baseId]) {
                    audio.setTrackVolume?.(t.baseId, 0);
                }
                // Immediately start town theme at 0 then fade it in (no pause)
                this.ensureTrackPlaying(t.townId, 0);
                this.musicTransition = {
                    ...t,
                    stage: 'fadeInTown',
                    fromTown: 0,
                    elapsed: 0,
                    duration: this.fadeDuration
                };
            }
            return;
        }

        if (t.stage === 'fadeInTown') {
            if (t.townId) {
                audio.setTrackVolume?.(t.townId, lerp(t.fromTown ?? 0, t.toTown ?? 0));
            }
            if (progress >= 1) {
                this.musicTransition = null;
            }
            return;
        }

        if (t.stage === 'fadeOutTown') {
            if (t.townId) {
                audio.setTrackVolume?.(t.townId, lerp(t.fromTown, t.toTown));
            }
            if (progress >= 1) {
                if (t.townId && audio.music?.[t.townId]) {
                    audio.setTrackVolume?.(t.townId, 0);
                    audio.music[t.townId].pause();
                }
                // Bring base back only after town is fully silent
                this.ensureTrackPlaying(t.baseId, 0);
                this.musicTransition = {
                    ...t,
                    stage: 'fadeInBase',
                    fromBase: 0,
                    elapsed: 0,
                    duration: this.fadeDuration
                };
            }
            return;
        }

        if (t.stage === 'fadeInBase') {
            if (t.baseId) {
                audio.setTrackVolume?.(t.baseId, lerp(t.fromBase ?? 0, t.toBase ?? 0));
            }
            if (progress >= 1) {
                this.musicTransition = null;
            }
            return;
        }

        // Default cross-fade stage (legacy fallback)
        if (t.baseId) {
            audio.setTrackVolume?.(t.baseId, lerp(t.fromBase, t.toBase));
        }
        if (t.townId) {
            audio.setTrackVolume?.(t.townId, lerp(t.fromTown, t.toTown));
        }

        if (progress >= 1) {
            if (t.townId && t.toTown === 0 && audio.music?.[t.townId]) {
                audio.music[t.townId].pause();
            }
            this.musicTransition = null;
        }
    }

    ensureTownMusicLoaded(town) {
        const audio = this.getAudioManager();
        const id = this.getTownMusicId(town);
        const src = town?.music?.src;
        if (!audio || !id || !src) return;
        if (!audio.music?.[id]) {
            audio.loadMusic?.(id, src);
        }
    }

    ensureTrackPlaying(name, volume = 1) {
        const audio = this.getAudioManager();
        if (!audio || !name || !audio.music?.[name]) return;
        audio.playMusic?.(name, volume, { allowParallel: true, restartIfPlaying: false });
        audio.setTrackVolume?.(name, volume);
    }

    getBaseMusicId() {
        return this.game.currentLevelMusicId || 'level1';
    }

    getBaseMusicVolume() {
        return this.game.currentLevelMusicVolume ?? this.baseMusicVolume ?? 0.8;
    }

    getTownMusicId(town) {
        return town?.music?.id || null;
    }

    getTownMusicVolume(town = null) {
        return town?.music?.volume ?? 0.9;
    }

    getAudioManager() {
        return this.game?.services?.audio?.managerRef || this.game?.audioManager || null;
    }

    preloadTownMusic() {
        const audio = this.getAudioManager();
        if (!audio || !Array.isArray(this.towns)) return;
        this.towns.forEach(town => {
            const id = this.getTownMusicId(town);
            const src = town?.music?.src;
            if (id && src && !audio.music?.[id]) {
                audio.loadMusic?.(id, src);
            }
        });
    }
}
