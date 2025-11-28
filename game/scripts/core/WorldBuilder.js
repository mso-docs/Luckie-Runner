/**
 * WorldBuilder - builds and restores level/test-room content.
 * Keeps construction concerns out of Game.
 */
class WorldBuilder {
    constructor(game, factory) {
        this.game = game;
        this.factory = factory || new EntityFactory(game);
        this.config = game.config || GameConfig || {};
    }

    createLevel(levelId = 'testRoom') {
        const g = this.game;
        const registry = (typeof window !== 'undefined' && window.levelRegistry) ? window.levelRegistry : null;
        const levelDef = registry ? registry.get(levelId) : null;
        const validated = registry ? registry.validate(levelDef) : { valid: true, errors: [] };
        if (!validated.valid) {
            console.warn('Level validation failed:', validated.errors);
        }

        g.platforms = [];
        g.enemies = [];
        g.items = [];
        g.hazards = [];
        g.chests = [];
        g.flag = null;
        g.signBoards = [];
        g.signBoard = null;
        g.npcs = [];
        g.shopGhost = null;
        g.princess = null;
        g.balloonFan = null;

        const defaultSpawn = (levelDef && levelDef.spawn) || this.config.level?.spawn || { x: 100, y: g.canvas.height - 150 };
        const getTestSpawn = () => {
            const groundY = (typeof g.testGroundY === 'number') ? g.testGroundY : (g.canvas.height - 50);
            const playerWidth = 45;
            const playerHeight = 66;
            const defaultX = this.config.testRoom?.spawnAnchorX ?? 140;
            const signX = g.signBoard ? g.signBoard.x : defaultX + 40;
            return {
                x: signX - 20 - playerWidth,
                y: groundY - playerHeight
            };
        };

        if (levelId === 'testRoom' || g.testMode) {
            this.createTestRoom();
        } else {
            // Fallback: if levelDef has platforms/enemies/items, build them
            if (levelDef?.platforms) {
                levelDef.platforms.forEach(p => {
                    const plat = this.factory.create({ type: 'platform', ...p });
                    if (plat) g.platforms.push(plat);
                });
            } else {
                this.createGroundPlatforms();
                this.createFloatingPlatforms();
            }
            if (levelDef?.enemies) {
                levelDef.enemies.forEach(e => {
                    const enemy = this.factory.create(e);
                    if (enemy) g.enemies.push(enemy);
                });
            } else {
                this.spawnEnemies();
            }
            if (levelDef?.items) {
                levelDef.items.forEach(it => {
                    const item = this.factory.create(it);
                    if (item) g.items.push(item);
                });
            } else {
                this.spawnItems();
            }
        }

        const spawn = (levelId === 'testRoom' || g.testMode) ? getTestSpawn() : { x: defaultSpawn.x, y: defaultSpawn.y };
        const contentMaxX = (levelId === 'testRoom' || g.testMode)
            ? Math.max(4600, g.testRoomMaxX || 0)
            : (levelDef?.width || this.config.level?.width || g.canvas.width);

        g.level = {
            width: contentMaxX,
            height: levelDef?.height ?? this.config.level?.height ?? g.canvas.height,
            spawnX: spawn.x,
            spawnY: spawn.y
        };

        this.createFlag();
        if ((levelId === 'testRoom' || g.testMode) && !g.initialTestRoomState) {
            this.captureInitialTestRoomState();
        }

        g.createBackground();
    }

    captureInitialTestRoomState() {
        const g = this.game;
        if (!g.testMode || g.initialTestRoomState) return;

        const chestBlueprints = (g.chests || []).map(chest => ({
            x: chest.x,
            y: chest.y,
            displayName: chest.displayName,
            contents: (chest.contents || []).map(entry => ({ ...entry, taken: false }))
        }));

        const smallPalmBlueprints = (g.smallPalms || []).map(palm => ({
            x: palm.x,
            y: palm.y
        }));

        const npcBlueprints = [];
        if (g.shopGhost) {
            npcBlueprints.push({ type: 'shopGhost', x: g.shopGhost.x, y: g.shopGhost.y });
        }
        if (g.princess) {
            npcBlueprints.push({
                type: 'princess',
                x: g.princess.x,
                y: g.princess.y,
                dialogueLines: g.princess.dialogueLines ? [...g.princess.dialogueLines] : null
            });
        }
        if (g.balloonFan) {
            npcBlueprints.push({
                type: 'balloonFan',
                x: g.balloonFan.x,
                y: g.balloonFan.y,
                dialogueLines: g.balloonFan.dialogueLines ? [...g.balloonFan.dialogueLines] : null
            });
        }

        const enemyBlueprints = (g.enemies || []).map(enemy => {
            if (enemy instanceof Slime) {
                const patrol = enemy.simplePatrol
                    ? {
                        left: enemy.simplePatrol.left,
                        right: enemy.simplePatrol.right,
                        speed: enemy.simplePatrol.speed,
                        groundY: enemy.simplePatrol.groundY
                    }
                    : null;
                return { type: 'slime', x: enemy.x, y: enemy.y, patrol };
            }
            return null;
        }).filter(Boolean);

        const itemBlueprints = (g.items || []).map(item => {
            if (item instanceof HealthPotion) {
                return { type: 'health_potion', x: item.x, y: item.y, healAmount: item.healAmount };
            }
            if (item instanceof CoffeeItem) {
                return { type: 'coffee', x: item.x, y: item.y };
            }
            return null;
        }).filter(Boolean);

        g.initialTestRoomState = {
            level: { ...(g.level || {}) },
            testGroundY: g.testGroundY,
            platforms: (g.platforms || []).filter(p => p.type !== 'palm').map(p => ({
                x: p.x,
                y: p.y,
                width: p.width,
                height: p.height,
                type: p.type
            })),
            enemies: enemyBlueprints,
            items: itemBlueprints,
            chests: chestBlueprints,
            smallPalms: smallPalmBlueprints,
            npcs: npcBlueprints,
            signBoard: g.signBoard ? {
                x: g.signBoard.x,
                y: g.signBoard.y,
                spriteSrc: g.signBoard.sprite?.src
            } : null,
            signBoards: (g.signBoards || []).map(sign => ({
                x: sign.x,
                y: sign.y,
                spriteSrc: sign.sprite?.src,
                dialogueLines: sign.dialogueLines ? [...sign.dialogueLines] : null
            })),
            flag: g.flag ? { x: g.flag.x, y: g.flag.y } : null
        };
    }

    restoreInitialTestRoomState() {
        const g = this.game;
        const blueprint = g.initialTestRoomState;
        if (!blueprint) {
            this.createLevel();
            return;
        }

        g.testMode = true;
        g.level = { ...(blueprint.level || {}) };
        g.testGroundY = blueprint.testGroundY;
        g.testRoomMaxX = Math.max(0, blueprint.level?.width || 0);

        g.platforms = (blueprint.platforms || [])
            .filter(p => p.type !== 'palm')
            .map(p => this.factory.platform(p.x, p.y, p.width, p.height, p.type));

        g.enemies = (blueprint.enemies || []).map(def => {
            if (def.type === 'slime') {
                const slime = this.factory.slime(def.x, def.y);
                slime.y = def.y;
                if (def.patrol) {
                    slime.setSimplePatrol(def.patrol.left, def.patrol.right, def.patrol.speed, def.patrol.groundY);
                }
                return slime;
            }
            return null;
        }).filter(Boolean);

        g.items = (blueprint.items || []).map(def => {
            if (def.type === 'health_potion') {
                return this.factory.healthPotion(def.x, def.y, def.healAmount);
            }
            if (def.type === 'coffee') {
                return this.factory.coffee(def.x, def.y);
            }
            return null;
        }).filter(Boolean);

        g.chests = (blueprint.chests || []).map(def => {
            const chest = this.factory.chest(def.x, def.y, def.displayName, (def.contents || []).map(entry => ({ ...entry, taken: false })));
            return chest;
        });

        g.smallPalms = (blueprint.smallPalms || []).map(def => {
            const palm = this.factory.smallPalm(def.x, def.y);
            g.testRoomMaxX = Math.max(g.testRoomMaxX || 0, def.x + palm.width + 300);
            return palm;
        });

        const contentMax = g.testRoomMaxX || g.level.width || 0;
        g.level.width = Math.max(g.level.width || 0, contentMax);

        g.npcs = [];
        g.shopGhost = null;
        g.princess = null;
        g.balloonFan = null;
        (blueprint.npcs || []).forEach(def => {
            if (def.type === 'shopGhost') {
                const ghost = this.factory.shopGhost(def.x, def.y);
                g.shopGhost = ghost;
                g.npcs.push(ghost);
            } else if (def.type === 'princess') {
                const princess = this.factory.princess(def.x, def.y, def.dialogueLines || []);
                g.princess = princess;
                g.npcs.push(princess);
            } else if (def.type === 'balloonFan') {
                const balloonFan = this.factory.balloonFan(def.x, def.y, def.dialogueLines || []);
                g.balloonFan = balloonFan;
                g.npcs.push(balloonFan);
            }
        });

        g.signBoard = blueprint.signBoard
            ? this.factory.sign(blueprint.signBoard.x, blueprint.signBoard.y, blueprint.signBoard.spriteSrc)
            : null;
        g.signBoards = (blueprint.signBoards || []).map(def => {
            const sign = this.factory.sign(def.x, def.y, def.spriteSrc, def.dialogueLines);
            return sign;
        });
        if (g.signBoard) {
            const alreadyIncluded = g.signBoards.some(sign => sign && sign.x === g.signBoard.x && sign.y === g.signBoard.y);
            if (!alreadyIncluded) {
                g.signBoards.unshift(g.signBoard);
            }
        }
        if (!g.signBoard && g.signBoards.length > 0) {
            g.signBoard = g.signBoards[0];
        }

        g.flag = blueprint.flag ? this.factory.flag(blueprint.flag.x, blueprint.flag.y) : null;
        if (g.flag) {
            g.flag.game = g;
        }

        g.createBackground();
    }

    createGroundPlatforms() {
        const g = this.game;
        const groundHeight = 40;
        const groundY = g.level.height - groundHeight;
        for (let x = 0; x < g.level.width; x += 64) {
            g.platforms.push({
                x: x,
                y: groundY,
                width: 64,
                height: groundHeight,
                type: 'ground',
                solid: true,
                color: '#8B4513'
            });
        }

        const gaps = [800, 1200, 1800, 2400];
        gaps.forEach(gapX => {
            g.platforms = g.platforms.filter(platform => {
                return !(platform.x >= gapX && platform.x < gapX + 128);
            });
        });
    }

    createFloatingPlatforms() {
        const g = this.game;
        const platforms = [
            { x: 300, y: 400, width: 96, height: 16 },
            { x: 500, y: 320, width: 64, height: 16 },
            { x: 750, y: 350, width: 128, height: 16 },
            { x: 900, y: 450, width: 64, height: 16 },
            { x: 1100, y: 380, width: 96, height: 16 },
            { x: 1350, y: 300, width: 128, height: 16 },
            { x: 1600, y: 420, width: 64, height: 16 },
            { x: 1900, y: 350, width: 96, height: 16 },
            { x: 2100, y: 280, width: 128, height: 16 },
            { x: 2500, y: 400, width: 160, height: 16 }
        ];

        platforms.forEach(platform => {
            g.platforms.push({
                ...platform,
                type: 'floating',
                solid: true,
                color: '#654321'
            });
        });
    }

    spawnEnemies() {
        const g = this.game;
        const enemySpawns = [
            { x: 250, y: 450, type: 'Slime' },
            { x: 600, y: 450, type: 'Slime' },
            { x: 1000, y: 450, type: 'Slime' },
            { x: 1400, y: 450, type: 'Slime' },
            { x: 1800, y: 450, type: 'Slime' },
            { x: 2200, y: 450, type: 'Slime' }
        ];

        enemySpawns.forEach(spawn => {
            let enemy;

            try {
                switch (spawn.type) {
                    case 'Slime':
                        enemy = this.factory.slime(spawn.x, spawn.y);
                        break;
                    default:
                        return;
                }

                if (enemy) {
                    g.enemies.push(enemy);
                }
            } catch (error) {
                // swallow
            }
        });
    }

    spawnItems() {
        const g = this.game;

        const rockSpawns = [
            { x: 450, y: 450, count: 1, rocksPerPile: 5 },
            { x: 900, y: 400, count: 1, rocksPerPile: 8 },
            { x: 1300, y: 450, count: 2, rocksPerPile: 4 },
            { x: 1750, y: 420, count: 1, rocksPerPile: 6 },
            { x: 2000, y: 450, count: 1, rocksPerPile: 10 }
        ];

        rockSpawns.forEach(spawn => {
            const rocks = RockItem.createScattered(spawn.x, spawn.y, spawn.count, spawn.rocksPerPile);
            rocks.forEach(rock => {
                rock.game = g;
                g.items.push(rock);
            });
        });

        const coffeeSpawns = [
            { x: 1550, y: 360 }
        ];
        coffeeSpawns.forEach(spawn => {
            const coffee = this.factory.coffee(spawn.x, spawn.y);
            g.items.push(coffee);
        });
    }

    createFlag() {
        const g = this.game;
        const flagHeight = 128;
        const groundHeight = 40;
        let flagX = g.level.width - 300;
        let flagY = (g.level.height - groundHeight) - flagHeight;

        if (g.testMode) {
            const groundY = (typeof g.testGroundY === 'number') ? g.testGroundY : (g.level.height - 50);
            flagY = groundY - flagHeight;
            flagX = 3880;
        }

        g.flag = this.factory.flag(flagX, flagY);
    }

    createTestRoom() {
        const g = this.game;
        const levelDef = (typeof window !== 'undefined' && window.LevelDefinitions && window.LevelDefinitions.testRoom) || {};
        const config = this.config.testRoom || {};
        const groundHeight = config.groundHeight ?? 50;
        const groundY = g.canvas.height - groundHeight;
        g.testGroundY = groundY;
        const spawnAnchorX = config.spawnAnchorX ?? 140;

        for (let i = 0; i < 10; i++) {
            const segmentX = i * 2000;
            g.platforms.push(this.factory.platform(segmentX, groundY, 2000, groundHeight));
        }

        const wallWidth = 20;
        const wallHeight = g.canvas.height;
        g.platforms.push(this.factory.platform(-wallWidth, 0, wallWidth, wallHeight));

        const baseY = groundY - 90;
        const parkour = (levelDef.parkour || []).map(p => ({
            x: p.x,
            width: p.width,
            y: p.y !== null && p.y !== undefined ? p.y : baseY - ((p.yOffset || 0))
        }));
        parkour.forEach(p => {
            g.platforms.push(this.factory.platform(p.x, p.y, p.width, 12));
        });

        const mountainSteps = (levelDef.mountainSteps || []).map(step => ({
            x: step.x,
            y: groundY - (step.yOffset || 0),
            width: step.width,
            height: step.height
        }));
        mountainSteps.forEach(step => {
            g.platforms.push(this.factory.platform(step.x, step.y, step.width, step.height));
        });

        const balloonParkour = (levelDef.balloonParkour || []).map(p => ({
            x: p.x,
            width: p.width,
            y: groundY - (p.yOffset || 0)
        }));
        balloonParkour.forEach(p => {
            g.platforms.push(this.factory.platform(p.x, p.y, p.width, 14));
        });

        const smallPalmHeight = 191;
        const smallPalmWidth = 121;
        const lastBalloon = balloonParkour[balloonParkour.length - 1];
        const smallPalmX = lastBalloon.x + lastBalloon.width + 20;
        const smallPalmY = groundY - smallPalmHeight;
        const smallPalm = this.factory.smallPalm(smallPalmX, smallPalmY);
        g.smallPalms.push(smallPalm);
        g.testRoomMaxX = Math.max(g.testRoomMaxX || 0, smallPalmX + smallPalmWidth + 300);

        const slime = this.factory.slime(300, groundY);
        const slimeGroundY = groundY - slime.height;
        slime.y = slimeGroundY;
        slime.setSimplePatrol(200, 800, 90, slimeGroundY);
        g.enemies.push(slime);

        const mountainSlime = this.factory.slime(1960, groundY);
        const mountainSlimeGroundY = groundY - mountainSlime.height;
        mountainSlime.y = mountainSlimeGroundY;
        mountainSlime.setSimplePatrol(1880, 2100, 80, mountainSlimeGroundY);
        g.enemies.push(mountainSlime);

        const potion = this.factory.healthPotion(480, groundY - 40, 25);
        g.items.push(potion);

        const coffee = this.factory.coffee(860, groundY - 70);
        g.items.push(coffee);

        const ghostX = 680;
        const ghostY = groundY - 64;
        g.shopGhost = this.factory.shopGhost(ghostX, ghostY);
        g.npcs.push(g.shopGhost);

        const mountainTop = mountainSteps[6];
        const princessX = mountainTop.x + (mountainTop.width / 2) - 24.5;
        const princessY = mountainTop.y - 64;
        g.princess = this.factory.princess(princessX, princessY, [
            'You actually made it up here? I promise I will have a real quest soon.',
            'For now, enjoy this breeze and pretend the mountain is much taller.',
            'Press Enter again if you want to hear me repeat myself. I am patient!'
        ]);
        g.npcs.push(g.princess);

        const balloonPerch = balloonParkour[balloonParkour.length - 1];
        const balloonFanX = balloonPerch.x + (balloonPerch.width / 2) - (55 / 2);
        const balloonFanY = balloonPerch.y - 63;
        g.balloonFan = this.factory.balloonFan(balloonFanX, balloonFanY);
        g.npcs.push(g.balloonFan);

        g.signBoard = this.factory.sign(
            spawnAnchorX + 40,
            groundY - 52,
            'art/items/sign.png',
            levelDef.defaultSignMessages ? [...levelDef.defaultSignMessages] : (g.signUI?.signDialogue?.defaultMessages ? [...g.signUI.signDialogue.defaultMessages] : [])
        );
        g.signBoards.push(g.signBoard);

        const postSignPlatform = balloonParkour[balloonParkour.length - 1];
        const postSignX = postSignPlatform.x + postSignPlatform.width - 48;
        const postSignY = groundY - 52;
        const postSign = this.factory.sign(postSignX, postSignY, 'art/items/sign.png', [
            'Coming soon: a real message for champions.',
            'Thanks for checking out the balloon parkour!'
        ]);
        g.signBoards.push(postSign);

        const coinChestX = spawnAnchorX + 210;
        const coinChestY = groundY - 64;
        const coinChest = this.factory.chest(coinChestX, coinChestY, 'Coin Test Chest', [
            {
                id: 'coins_test',
                name: '100 Coins',
                description: 'A test stash of coins.',
                take: (player) => player?.collectCoin && player.collectCoin(100)
            }
        ]);
        g.chests.push(coinChest);

        const lastPlatform = parkour[parkour.length - 1];
        const chestX = lastPlatform.x + lastPlatform.width - 64;
        const chestY = lastPlatform.y - 64;
        const parkourChest = this.factory.chest(chestX, chestY, 'Parkour Chest', [
            {
                id: 'climbing_shoes',
                name: 'Climbing Shoes',
                description: 'Sticky soles that let you double jump for 2 minutes.',
                take: (player) => player?.applyClimbingBuff && player.applyClimbingBuff(120000, 1)
            },
            {
                id: 'health_potion',
                name: 'Health Potion',
                description: 'Restores 25 HP (or stashes a potion if you are full).',
                take: (player) => {
                    if (!player) return;
                    if (player.health >= player.maxHealth && typeof player.addHealthPotion === 'function') {
                        player.addHealthPotion(1);
                    } else if (typeof player.heal === 'function') {
                        player.heal(25);
                    } else {
                        player.health = Math.min(player.maxHealth ?? player.health, player.health + 25);
                    }
                    player.updateHealthUI?.();
                }
            },
            {
                id: 'rock_bag',
                name: 'Bag of Rocks',
                description: "10 sturdy rocks for Luckie's throw.",
                take: (player) => player?.addRocks && player.addRocks(10)
            }
        ]);
        g.chests.push(parkourChest);
    }
}
