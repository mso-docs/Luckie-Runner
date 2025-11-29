/**
 * UIManager - Handles inventory overlay interactions and rendering.
 * Keeps Game focused on orchestration while UI concerns stay here.
 */
class UIManager {
    constructor(game, services = null) {
        this.game = game;
        this.inventoryUI = game.inventoryUI || {
            overlay: null,
            isOpen: false
        };
        // Share reference back to game for backward compatibility
        this.game.inventoryUI = this.inventoryUI;

        this.chestUI = game.chestUI || {
            overlay: null,
            isOpen: false,
            currentChest: null
        };
        this.game.chestUI = this.chestUI;

        this.shopUI = game.shopUI || {
            overlay: null,
            isOpen: false,
            items: []
        };
        this.game.shopUI = this.shopUI;
        this.shopGhostBubble = null;
        this.debugUI = {
            panel: null,
            toggle: null,
            close: null,
            content: null
        };
        this.townUI = {
            banner: null,
            text: null,
            timeout: null
        };

        this.config = game.config || GameConfig || {};
        this.services = services || {};
        this.uiConfig = (typeof window !== 'undefined' && window.UIConfig) ? window.UIConfig : {};
    }

    /**
     * Wire up menu/pause/audio controls and global shortcuts.
     */
    setupMenuAndControls() {
        if (!this.inputController) {
            this.inputController = new UIInputController(this.game, this);
            this.inputController.bindDom();
        }
        this.setupDebugUI();
        this.setupTownUI();
    }

    renderSaveSlots() {
        const list = document.getElementById('saveSlotsList');
        if (!list) return;
        const save = this.game?.services?.save;
        const slots = save?.listSlots?.() || [];
        list.innerHTML = '';
        if (!slots.length) {
            const empty = document.createElement('div');
            empty.className = 'save-slot';
            empty.innerHTML = `<div class="save-slot__meta"><div class="save-slot__title">No saves yet</div><div class="save-slot__subtitle">Start a run to create one.</div></div>`;
            list.appendChild(empty);
            return;
        }

        slots.forEach(slot => {
            const btn = document.createElement('div');
            btn.className = 'save-slot';
            const levelLabel = slot.levelId ? `Level: ${slot.levelId}` : 'Level: Unknown';
            const playTime = this.formatPlaytime(slot.timeElapsed || 0);
            const collectibles = slot.collectibles || {};
            const collectibleText = `Coins: ${collectibles.coins ?? 0} • Badges: ${collectibles.badges ?? 0}`;
            const updated = slot.updatedAt ? new Date(slot.updatedAt).toLocaleString() : 'Unknown';
            btn.innerHTML = `
                <div class="save-slot__meta">
                    <div class="save-slot__title">${slot.name || 'Save Slot'}</div>
                    <div class="save-slot__subtitle">${levelLabel} • Updated ${updated}</div>
                    <div class="save-slot__stats">Playtime: ${playTime} • ${collectibleText}</div>
                </div>
                <div class="save-slot__actions">
                    <button type="button" class="load-slot" data-slot="${slot.id}">Load</button>
                    <button type="button" class="delete-slot" data-slot="${slot.id}">Delete</button>
                </div>
            `;
            btn.querySelector('.load-slot')?.addEventListener('click', () => {
                this.game?.loadProgress?.(slot.id);
            });
            btn.querySelector('.delete-slot')?.addEventListener('click', () => {
                this.game?.services?.save?.deleteSlot?.(slot.id);
                this.renderSaveSlots();
            });
            list.appendChild(btn);
        });
    }

    formatPlaytime(ms = 0) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    /**
     * Prepare the inventory overlay UI state
     */
    setupInventoryUI() {
        const inv = this.inventoryUI;
        inv.overlay = document.getElementById('inventoryOverlay');
        inv.list = document.getElementById('inventoryItems');
        inv.statsList = document.getElementById('inventoryStats');
        inv.badgesList = document.getElementById('inventoryBadges');
        inv.badgesEmpty = document.getElementById('badgeEmptyState');
        inv.gearList = document.getElementById('inventoryGear');
        inv.itemCache = [];
        inv.modal = {
            container: document.getElementById('inventoryItemModal'),
            icon: document.getElementById('itemModalIcon'),
            title: document.getElementById('itemModalName'),
            description: document.getElementById('itemModalDescription'),
            useBtn: document.getElementById('itemModalUse'),
            exitBtn: document.getElementById('itemModalExit')
        };
        inv.tabs = Array.from(document.querySelectorAll('.inventory-tab'));
        inv.panels = Array.from(document.querySelectorAll('[data-tab-panel]'));

        inv.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab-target');
                this.switchInventoryTab(target);
            });
        });

        this.switchInventoryTab('stats', true);
        this.hideInventoryOverlay(true);

        if (inv.modal.exitBtn) {
            inv.modal.exitBtn.addEventListener('click', () => this.hideInventoryItemModal());
        }
        if (inv.modal.container) {
            inv.modal.container.addEventListener('click', (e) => {
                if (e.target === inv.modal.container) {
                    this.hideInventoryItemModal();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            this.handleInventoryListNavigation(e);
        });

        if (this.game.badgeUI) {
            this.game.badgeUI.cacheInventoryRefs();
        }
    }

    /**
     * Switch inventory tabs
     * @param {string} tabName
     * @param {boolean} silent - avoid sounds when true
     */
    switchInventoryTab(tabName = 'stats', silent = false) {
        const inv = this.inventoryUI;
        if (!inv) return;

        const tabs = inv.tabs || [];
        const panels = inv.panels || [];

        tabs.forEach(tab => {
            const isActive = tab.getAttribute('data-tab-target') === tabName;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach(panel => {
            const isActive = panel.getAttribute('data-tab-panel') === tabName;
            panel.classList.toggle('active', isActive);
            panel.classList.toggle('hidden', !isActive);
        });

        if (!silent && this.services?.audio?.managerRef && this.game.playButtonSound) {
            this.game.playButtonSound();
        }
    }

    /**
     * Populate the inventory overlay with live player stats/items
     */
    updateInventoryOverlay() {
        const inv = this.inventoryUI;
        const list = inv?.list;
        const statsList = inv?.statsList;
        if (!list || !statsList) return;

        const player = this.game.player;
        const stats = this.game.stats;
        const statEntries = [];
        const itemEntries = [];

        if (player) {
            statEntries.push({
                name: 'Score',
                value: player.score ?? 0
            });
            statEntries.push({
                name: 'HP',
                value: `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`
            });
            if (stats && typeof stats.timeElapsed === 'number') {
                const totalSeconds = Math.floor(stats.timeElapsed / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                statEntries.push({
                    name: 'Time',
                    value: timeString
                });
            }
            statEntries.push({
                name: 'Coins',
                value: player.coins ?? 0
            });

            itemEntries.push({
                name: 'Rocks',
                value: player.throwables?.getAmmo('rock') ?? player.rocks ?? 0,
                description: 'Ammo used for throwing. Found scattered along the course.',
                icon: 'art/items/rock-item.png',
                key: 'rocks',
                consumable: false
            });
            itemEntries.push({
                name: 'Coconuts',
                value: player.throwables?.getAmmo('coconut') ?? 0,
                description: 'Heavy rolling ammo dropped from palms.',
                icon: 'art/items/coconut.png',
                key: 'coconut',
                consumable: false
            });
            itemEntries.push({
                name: 'Health Potions',
                value: player.healthPotions ?? 0,
                description: 'A small health potion that restores 25 HP.',
                icon: 'art/sprites/health-pot.png',
                key: 'health_potion',
                consumable: true
            });
            itemEntries.push({
                name: 'Coffee',
                value: player.coffeeDrinks ?? 0,
                description: 'Gives a speed boost for a short time.',
                icon: 'art/items/coffee.png',
                key: 'coffee',
                consumable: true
            });
        } else if (stats && typeof stats.timeElapsed === 'number') {
            const totalSeconds = Math.floor(stats.timeElapsed / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            statEntries.push({
                name: 'Time',
                value: timeString
            });
        }

        const renderList = (target, entries, options = {}) => {
            const { isItemList = false, modalType = 'item' } = options;
            target.innerHTML = '';
            if (isItemList) {
                inv.itemCache = entries.slice();
            }
            entries.forEach(item => {
                const row = document.createElement('button');
                row.className = 'inventory-item';
                row.type = 'button';
                const iconHtml = item.icon ? `<span class="inventory-item__icon" style="background-image:url('${item.icon}')"></span>` : '';
                row.innerHTML = `
                    ${iconHtml}
                    <span class="inventory-item__name">${item.name}</span>
                    <span class="inventory-item__value">${item.value}</span>
                `;
                if (item.isActive) {
                    row.classList.add('is-active');
                }
                if (isItemList || modalType === 'gear') {
                    row.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (modalType === 'gear') {
                            this.showThrowableModal(item);
                        } else if (item.onSelect) {
                            item.onSelect();
                        } else {
                            this.showInventoryItemModal(item);
                        }
                    });
                }
                target.appendChild(row);
            });
        };

        renderList(statsList, statEntries, { isItemList: false });
        renderList(list, itemEntries, { isItemList: true, modalType: 'item' });

        const gearList = inv?.gearList;
        if (gearList) {
            const throwableTypes = this.game.player?.throwables?.listTypesSortedByIcon?.() || [];
            const gearEntries = throwableTypes.map(t => ({
                name: t.displayName || t.key,
                value: t.ammo ?? 0,
                description: t.description || 'Throwable item',
                icon: t.icon,
                key: t.key,
                consumable: false,
                isActive: this.game.player?.throwables?.getActiveType() === t.key,
                onSelect: () => {
                    this.showThrowableModal({
                        name: t.displayName || t.key,
                        key: t.key,
                        icon: t.icon,
                        description: t.description || 'Click to equip this ammo type.'
                    });
                }
            }));
            renderList(gearList, gearEntries, { isItemList: true, modalType: 'gear' });
        }
        if (this.game.badgeUI) {
            this.game.badgeUI.renderInventory();
        }
    }

    /**
     * Keyboard navigation for inventory items (W/S or ArrowUp/ArrowDown)
     */
    handleInventoryListNavigation(e) {
        if (!this.inventoryUI?.isOpen) return;
        if (!this.inventoryUI.list) return;

        const key = e.key;
        const isDown = key === 'ArrowDown' || key === 's' || key === 'S';
        const isUp = key === 'ArrowUp' || key === 'w' || key === 'W';
        if (!isDown && !isUp) return;

        const buttons = Array.from(this.inventoryUI.list.querySelectorAll('.inventory-item'));
        if (!buttons.length) return;

        const activeEl = document.activeElement;
        let currentIndex = buttons.indexOf(activeEl);

        if (currentIndex === -1) {
            currentIndex = isDown ? -1 : 0;
        }

        const delta = isDown ? 1 : -1;
        let nextIndex = currentIndex + delta;
        if (nextIndex < 0) nextIndex = buttons.length - 1;
        if (nextIndex >= buttons.length) nextIndex = 0;

        buttons[nextIndex].focus();
        e.preventDefault();
    }

    /**
     * Show modal for an inventory item
     * @param {Object} item
     */
    showInventoryItemModal(item) {
        const inv = this.inventoryUI;
        const modal = inv.modal;
        if (!modal || !modal.container) return;

        if (inv.overlay) {
            inv.overlay.classList.remove('hidden');
            inv.overlay.classList.add('active');
            inv.overlay.setAttribute('aria-hidden', 'false');
            inv.isOpen = true;
        }

        const nameEl = modal.title;
        const descEl = modal.description;
        const iconEl = modal.icon;
        const useBtn = modal.useBtn;

        if (nameEl) nameEl.textContent = item.name || 'Item';
        if (descEl) descEl.textContent = item.description || '';
        if (iconEl) {
            iconEl.style.backgroundImage = item.icon ? `url('${item.icon}')` : 'none';
        }

        if (useBtn) {
            useBtn.disabled = !item.consumable || (item.value <= 0);
            useBtn.textContent = item.consumable ? 'Use' : 'OK';
            useBtn.onclick = () => {
                const used = this.consumeInventoryItem(item);
                if (used) {
                    this.hideInventoryItemModal();
                    this.updateInventoryOverlay();
                }
            };
        }

        modal.container.classList.remove('hidden');
        modal.container.classList.add('active');
        modal.container.setAttribute('aria-hidden', 'false');
    }

    /**
     * Show modal for equipping a throwable/ammo
     * @param {Object} item
     */
    showThrowableModal(item) {
        const inv = this.inventoryUI;
        const modal = inv.modal;
        if (!modal || !modal.container) return;

        if (inv.overlay) {
            inv.overlay.classList.remove('hidden');
            inv.overlay.classList.add('active');
            inv.overlay.setAttribute('aria-hidden', 'false');
            inv.isOpen = true;
        }

        const nameEl = modal.title;
        const descEl = modal.description;
        const iconEl = modal.icon;
        const useBtn = modal.useBtn;

        if (nameEl) nameEl.textContent = item.name || 'Ammo';
        if (descEl) descEl.textContent = item.description || '';
        if (iconEl) {
            iconEl.style.backgroundImage = item.icon ? `url('${item.icon}')` : 'none';
        }

        if (useBtn) {
            useBtn.disabled = false;
            useBtn.textContent = 'Equip';
            useBtn.onclick = () => {
                this.game.player?.setActiveThrowable?.(item.key);
                this.hideInventoryItemModal();
                this.updateInventoryOverlay();
            };
        }

        modal.container.classList.remove('hidden');
        modal.container.classList.add('active');
        modal.container.setAttribute('aria-hidden', 'false');
    }

    /**
     * Hide inventory item modal
     */
    hideInventoryItemModal() {
        const modal = this.inventoryUI.modal;
        if (!modal || !modal.container) return;
        modal.container.classList.remove('active');
        modal.container.classList.add('hidden');
        modal.container.setAttribute('aria-hidden', 'true');
    }

    /**
     * Consume an inventory item and apply its effect
     * @param {Object} item
     * @returns {boolean}
     */
    consumeInventoryItem(item) {
        const player = this.game.player;
        if (!item || !item.key || !player) return false;
        switch (item.key) {
            case 'health_potion':
                if (player.healthPotions <= 0) return false;
                return player.consumeHealthPotion(25);
            case 'coffee':
                if (player.coffeeDrinks <= 0) return false;
                player.coffeeDrinks = Math.max(0, player.coffeeDrinks - 1);
                if (typeof player.applyCoffeeBuff === 'function') {
                    player.applyCoffeeBuff(2, 120000);
                }
                if (typeof player.updateUI === 'function') {
                    player.updateUI();
                }
                return true;
            default:
                return false;
        }
    }

    /**
     * Show the inventory overlay
     */
    showInventoryOverlay() {
        const overlay = this.inventoryUI.overlay;
        if (!overlay) return;

        overlay.classList.add('active');
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        this.inventoryUI.isOpen = true;
            if (this.game.playMenuEnterSound) {
                this.game.playMenuEnterSound();
            }
    }

    /**
     * Hide the inventory overlay
     * @param {boolean} immediate - Included for API symmetry; no animation currently
     */
    hideInventoryOverlay(immediate = false) {
        const overlay = this.inventoryUI.overlay;
        if (!overlay) return;

        const wasOpen = this.inventoryUI.isOpen;
        overlay.classList.remove('active');
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        this.inventoryUI.isOpen = false;
        if (wasOpen && !immediate && this.game.playMenuExitSound) {
            this.game.playMenuExitSound();
        }
    }

    /**
     * Toggle inventory overlay with the I key
     */
    toggleInventoryOverlay() {
        if (this.inventoryUI.isOpen) {
            this.hideInventoryOverlay();
        } else {
            this.showInventoryOverlay();
        }
    }

    /**
     * Prepare the chest overlay UI
     */
    setupChestUI() {
        const overlay = document.getElementById('chestOverlay');
        this.chestUI.overlay = overlay;
        this.chestUI.list = overlay ? overlay.querySelector('.chest-items') : null;
        this.chestUI.title = overlay ? overlay.querySelector('.chest-title') : null;
        this.chestUI.takeAllButton = overlay ? overlay.querySelector('[data-action="take-all"]') : null;
        this.chestUI.emptyState = overlay ? overlay.querySelector('.chest-empty') : null;

        if (overlay) {
            const closeButton = overlay.querySelector('[data-action="close-chest"]');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.hideChestOverlay());
            }
        }

        if (this.chestUI.takeAllButton) {
            this.chestUI.takeAllButton.addEventListener('click', () => {
                if (!this.chestUI.currentChest || !this.game.player) return;
                const chest = this.chestUI.currentChest;
                const tookAny = chest.takeAll(this.game.player);
                this.populateChestOverlay(chest);
                if (tookAny && this.game.playMenuEnterSound) this.game.playMenuEnterSound();
            });
        }

        this.hideChestOverlay(true);
    }

    showChestOverlay(chest) {
        const ui = this.chestUI;
        if (!ui.overlay || !chest) return;

        ui.currentChest = chest;
        ui.isOpen = true;
        if (ui.title) {
            ui.title.textContent = chest.displayName || 'Chest';
        }
        ui.overlay.classList.add('active');
        ui.overlay.classList.remove('hidden');
        ui.overlay.setAttribute('aria-hidden', 'false');
        this.populateChestOverlay(chest);
        if (this.game.playMenuEnterSound) {
            this.game.playMenuEnterSound();
        }
    }

    hideChestOverlay(immediate = false) {
        const ui = this.chestUI;
        if (!ui.overlay) return;

        const wasOpen = ui.isOpen;
        ui.overlay.classList.remove('active');
        ui.overlay.classList.add('hidden');
        ui.overlay.setAttribute('aria-hidden', 'true');
        ui.isOpen = false;
        ui.currentChest = null;
        if (wasOpen && !immediate && this.game.playMenuExitSound) {
            this.game.playMenuExitSound();
        }
    }

    populateChestOverlay(chest) {
        const ui = this.chestUI;
        if (!ui.list || !chest) return;

        ui.list.innerHTML = '';
        const items = chest.getAvailableItems();

        if (ui.emptyState) {
            ui.emptyState.classList.toggle('hidden', items.length > 0);
        }
        if (ui.takeAllButton) {
            ui.takeAllButton.disabled = items.length === 0;
        }

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'chest-item';

            const info = document.createElement('div');
            info.className = 'chest-item__info';
            const name = document.createElement('div');
            name.className = 'chest-item__name';
            name.textContent = item.name;
            const desc = document.createElement('div');
            desc.className = 'chest-item__desc';
            desc.textContent = item.description || '';
            info.appendChild(name);
            info.appendChild(desc);

            const takeBtn = document.createElement('button');
            takeBtn.type = 'button';
            takeBtn.className = 'chest-item__take';
            takeBtn.textContent = 'Take';
            takeBtn.addEventListener('click', () => {
                const success = chest.takeItem(item.id, this.game.player);
                if (success) {
                    this.populateChestOverlay(chest);
                    if (this.game.playMenuEnterSound) this.game.playMenuEnterSound();
                }
            });

            row.appendChild(info);
            row.appendChild(takeBtn);
            ui.list.appendChild(row);
        });
    }

    /**
     * Prepare shop UI state
     */
    setupShopUI() {
        this.shopUI.overlay = document.getElementById('shopOverlay');
        this.shopUI.isOpen = false;
        this.shopUI.list = this.shopUI.overlay ? this.shopUI.overlay.querySelector('#shopItemList') : null;
        this.shopUI.coinValue = this.shopUI.overlay ? this.shopUI.overlay.querySelector('#shopCoinValue') : null;
        this.shopUI.hpValue = this.shopUI.overlay ? this.shopUI.overlay.querySelector('#shopHPValue') : null;
        this.shopUI.rockValue = this.shopUI.overlay ? this.shopUI.overlay.querySelector('#shopRockValue') : null;
        this.shopUI.levelValue = this.shopUI.overlay ? this.shopUI.overlay.querySelector('#shopLevelValue') : null;
        this.shopUI.items = [
            {
                id: 'rock_bag',
                name: 'Bag of Rocks',
                price: 10,
                iconClass: 'icon-rockbag',
                grant: (player) => player?.addRocks && player.addRocks(10)
            },
            {
                id: 'health_potion',
                name: 'Health Potion',
                price: 25,
                iconClass: 'icon-healthpotion',
                grant: (player) => player?.addHealthPotion && player.addHealthPotion(1)
            },
            {
                id: 'coffee',
                name: 'Coffee',
                price: 10,
                iconClass: 'icon-coffee',
                grant: (player) => player?.addCoffee && player.addCoffee(1)
            }
        ];
        this.hideShopOverlay(true);
        this.game.shopGhostBubble = document.getElementById('shopGhostBubble');

        document.addEventListener('keydown', (e) => {
            this.handleShopListNavigation(e);
        });
    }

    showShopOverlay() {
        const overlay = this.shopUI.overlay;
        if (!overlay) return;

        this.updateShopDisplay();
        overlay.classList.add('active');
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        this.shopUI.isOpen = true;
        if (this.game.playMenuEnterSound) {
            this.game.playMenuEnterSound();
        }

        const firstItem = this.shopUI.list ? this.shopUI.list.querySelector('.shop-item') : null;
        if (firstItem) {
            firstItem.focus();
        }
    }

    hideShopOverlay(immediate = false) {
        const overlay = this.shopUI.overlay;
        if (!overlay) return;

        const wasOpen = this.shopUI.isOpen;
        overlay.classList.remove('active');
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        this.shopUI.isOpen = false;
        if (wasOpen && !immediate && this.game.playMenuExitSound) {
            this.game.playMenuExitSound();
        }
    }

    updateShopDisplay() {
        const ui = this.shopUI;
        if (!ui.list || !Array.isArray(ui.items)) return;

        const player = this.game.player;
        if (ui.coinValue && player) {
            ui.coinValue.textContent = player.coins ?? 0;
        }
        if (ui.hpValue && player) {
            const current = Math.max(0, Math.floor(player.health));
            const max = Math.max(1, Math.floor(player.maxHealth));
            ui.hpValue.textContent = `${current}/${max}`;
        }
        if (ui.rockValue && player) {
            ui.rockValue.textContent = player.throwables?.getAmmo('rock') ?? 0;
        }
        if (ui.levelValue && player) {
            ui.levelValue.textContent = player.level ?? 1;
        }

        ui.list.innerHTML = '';
        ui.items.forEach(item => {
            const affordable = player ? (player.coins ?? 0) >= item.price : false;
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'shop-item';
            row.innerHTML = `
                <span class="shop-item-icon ${item.iconClass}" aria-hidden="true"></span>
                <span class="shop-item-name">${item.name}</span>
                <span class="shop-item-price">${item.price} coins</span>
            `;
            row.disabled = !affordable;
            row.addEventListener('click', () => {
                this.purchaseShopItem(item);
            });
            ui.list.appendChild(row);
        });
    }

    purchaseShopItem(item) {
        const player = this.game.player;
        if (!item || !player) return false;

        const coins = player.coins ?? 0;
        if (coins < item.price) {
            if (this.services?.audio) {
                this.services.audio.playSound('error', 0.8);
            }
            return false;
        }

        player.coins = coins - item.price;
        if (typeof player.updateUI === 'function') {
            player.updateUI();
        }
        if (typeof item.grant === 'function') {
            item.grant(player);
        }
        if (this.services?.audio) {
            this.services.audio.playSound('menu_enter', 0.8);
        }
        this.updateShopDisplay();
        return true;
    }

    handleShopListNavigation(e) {
        if (!this.shopUI?.isOpen) return;
        if (!this.shopUI.list) return;

        const key = e.key;
        const isDown = key === 'ArrowDown' || key === 's' || key === 'S';
        const isUp = key === 'ArrowUp' || key === 'w' || key === 'W';
        if (!isDown && !isUp) return;

        const buttons = Array.from(this.shopUI.list.querySelectorAll('.shop-item'));
        if (!buttons.length) return;

        const activeEl = document.activeElement;
        let currentIndex = buttons.indexOf(activeEl);

        if (currentIndex === -1) {
            currentIndex = isDown ? -1 : 0;
        }

        const delta = isDown ? 1 : -1;
        let nextIndex = currentIndex + delta;
        if (nextIndex < 0) nextIndex = buttons.length - 1;
        if (nextIndex >= buttons.length) nextIndex = 0;

        buttons[nextIndex].focus();
        e.preventDefault();
    }

    /**
     * Aggregate gameplay input handling (dialogue, chests, shops).
     */
    handleFrameInput() {
        this.inputController?.update?.();
        this.handleSpeechBubbleInput();
        this.handleChestInput();
        this.handleInteractionInput();
    }

    /**
     * True when UI overlays should pause world updates.
     */
    isOverlayBlocking() {
        return Boolean(this.inventoryUI?.isOpen || this.shopUI?.isOpen);
    }

    /**
     * Advance or dismiss dialogue when Enter is pressed.
     */
    handleSpeechBubbleInput() {
        if (!this.game.dialogueManager?.isActive()) return;
        const input = this.services?.input || this.game.input;
        const consumeEnter = () => {
            if (!input) return false;
            if (typeof input.consume === 'function') return input.consume('enter') || input.consume('numpadenter');
            return input.consumeKeyPress?.('enter') || input.consumeKeyPress?.('numpadenter');
        };
        if (consumeEnter()) {
            this.game.dialogueManager.advance();
        }
    }

    /**
     * Handle player interaction input (E/Enter) for chests and signs.
     */
    handleChestInput() {
        const input = this.services?.input || this.game.input;
        if (!this.game.player || !input) return;

        const consumeInteract = () => {
            if (typeof input.consumeInteract === 'function') return input.consumeInteract();
            return input.consumeInteractPress?.();
        };

        if (consumeInteract()) {
            if (this.chestUI.isOpen) {
                this.hideChestOverlay();
                return;
            }

            const talker = this.getNearbyTalkableNpc();
            if (talker) {
                this.startNpcDialogue(talker);
                return;
            }

            const nearbySign = this.game.signUI.findNearbySign();
            if (nearbySign) {
                this.game.signUI.signDialogue.target = nearbySign;
                if (this.game.signUI.signDialogue.active) {
                    this.game.signUI.advanceSignDialogue();
                } else {
                    this.game.signUI.showSignDialogue(nearbySign);
                }
                return;
            }

            const chest = this.getNearbyChest();
            if (chest) {
                chest.open();
                this.showChestOverlay(chest);
            }
        }
    }

    /**
     * Handle player interaction input (Z key / action).
     */
    handleInteractionInput() {
        const input = this.services?.input || this.game.input;
        if (!this.game.player || !input) return;

        const consumeAction = () => {
            if (typeof input.consumeAction === 'function') return input.consumeAction();
            return input.consumeActionPress?.();
        };

        if (consumeAction()) {
            if (this.shopUI.isOpen) {
                this.hideShopOverlay();
                if (this.game.shopGhost) this.game.shopGhost.toggleFrame();
                return;
            }

            const ghost = this.getNearbyShopGhost();
            if (ghost) {
                ghost.toggleFrame();
                this.showShopOverlay();
                return;
            }

            if (typeof this.game.player.handleInteraction === 'function') {
                this.game.player.handleInteraction();
            }
        }
    }

    getNearbyShopGhost() {
        if (this.game.shopGhost && this.game.player && this.game.shopGhost.isPlayerNearby(this.game.player)) {
            return this.game.shopGhost;
        }
        return null;
    }

    getNearbyTalkableNpc() {
        if (!this.game.player || !Array.isArray(this.game.npcs)) return null;
        return this.game.npcs.find(npc =>
            npc &&
            npc.canTalk &&
            typeof npc.isPlayerNearby === 'function' &&
            npc.isPlayerNearby(this.game.player, npc.interactRadius || 120)
        ) || null;
    }

    getNearbyChest() {
        if (!this.game.player || !this.game.chests) return null;
        return this.game.chests.find(chest => chest.isPlayerNearby(this.game.player)) || null;
    }

    /**
     * Update UI elements that depend on world state each frame.
     */
    updateFrame(deltaTime) {
        this.updateChests(deltaTime);
        this.game.signUI.updateSignCallout();
        this.game.signUI.updateSignDialoguePosition();
        this.updateDebugOverlay();
        // town banner is event-driven; nothing per-frame here
    }

    /**
     * Keep dialogue bubble anchored to the speaking entity.
     */
    updateDialoguePosition() {
        if (this.game.dialogueManager?.isActive()) {
            this.game.dialogueManager.updatePosition();
        }
    }

    /**
     * NPC callouts (shop ghost bubble, etc).
     */
    updateNpcCallouts() {
        this.updateShopGhostBubble();
    }

    updateShopGhostBubble() {
        if (!this.shopGhostBubble) {
            this.shopGhostBubble = document.getElementById('shopGhostBubble');
            if (!this.shopGhostBubble) {
                const bubble = document.createElement('div');
                bubble.className = 'npc-bubble hidden';
                bubble.textContent = this.uiConfig?.shop?.bubble || 'Press Z to trade';
                bubble.setAttribute('aria-hidden', 'true');
                const gameContainer = document.getElementById('gameContainer');
                if (gameContainer) {
                    gameContainer.appendChild(bubble);
                    this.shopGhostBubble = bubble;
                }
            }
        }

        const bubble = this.shopGhostBubble;
        const ghost = this.game.shopGhost;
        if (!bubble || !ghost || !this.game.player) {
            if (bubble) bubble.classList.add('hidden');
            return;
        }

        if (this.shopUI.isOpen || !ghost.isPlayerNearby(this.game.player)) {
            bubble.classList.add('hidden');
            bubble.setAttribute('aria-hidden', 'true');
            return;
        }

        const screenX = ghost.x - this.game.camera.x + ghost.width / 2;
        const screenY = ghost.y - this.game.camera.y + ghost.bobOffset;
        bubble.style.left = `${screenX}px`;
        const render = this.game.getRenderService();
        const bottomFromCanvas = render.height() - screenY + ghost.height + 6;
        bubble.style.bottom = `${bottomFromCanvas}px`;
        bubble.classList.remove('hidden');
        bubble.setAttribute('aria-hidden', 'false');
    }

    /**
     * Update chests (UI + animation hooks).
     */
    updateChests(deltaTime) {
        if (!Array.isArray(this.game.chests)) return;
        this.game.chests.forEach(chest => {
            if (chest?.update) chest.update(deltaTime);
        });
    }

    setupTownUI() {
        if (this.townUI.banner) return;
        this.townUI.banner = document.getElementById('townBanner');
        this.townUI.text = document.getElementById('townBannerText');
        if (this.townUI.banner) {
            this.townUI.banner.style.setProperty('--town-banner-bg', "url('art/ui/scroll.png')");
        }
    }

    showTownBanner(town) {
        this.setupTownUI();
        const { banner, text } = this.townUI;
        if (!banner || !text || !town) return;

        if (this.townUI.timeout) {
            clearTimeout(this.townUI.timeout);
            this.townUI.timeout = null;
        }

        const bg = town.banner?.background || null;
        if (bg) {
            banner.style.setProperty('--town-banner-bg', `url('${bg}')`);
        }
        const color = town.banner?.textColor || '#5c3a1a';
        text.style.color = color;
        text.textContent = town.name || 'Town';

        banner.classList.remove('hidden');
        banner.setAttribute('aria-hidden', 'false');

        this.townUI.timeout = setTimeout(() => {
            banner.classList.add('hidden');
            banner.setAttribute('aria-hidden', 'true');
        }, 3000);
    }

    setupDebugUI() {
        if (this.debugUI.panel) return;
        this.debugUI.panel = document.getElementById('debugPanel');
        this.debugUI.toggle = document.getElementById('debugToggleButton');
        this.debugUI.close = document.getElementById('debugCloseButton');
        this.debugUI.content = document.getElementById('debugPanelContent');

        const toggleFn = () => {
            this.game.debug = !this.game.debug;
            this.updateDebugOverlay(true);
        };

        this.debugUI.toggle?.addEventListener('click', toggleFn);
        this.debugUI.close?.addEventListener('click', () => {
            this.game.debug = false;
            this.updateDebugOverlay(true);
        });
    }

    updateDebugOverlay(force = false) {
        if (!this.debugUI.panel) this.setupDebugUI();
        const { panel, toggle, content } = this.debugUI;
        if (!panel || !content) return;

        const shouldShow = !!this.game.debug;
        panel.classList.toggle('hidden', !shouldShow);
        panel.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        if (toggle) {
            toggle.classList.toggle('is-active', shouldShow);
            toggle.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
        }
        if (!shouldShow && !force) return;

        const p = this.game.player;
        const cam = this.game.camera || { x: 0, y: 0 };
        const stats = [
            `Player: ${p ? `x=${p.x.toFixed(1)} y=${p.y.toFixed(1)}` : 'n/a'}`,
            `Velocity: ${p?.velocity ? `vx=${p.velocity.x.toFixed(2)} vy=${p.velocity.y.toFixed(2)}` : 'n/a'}`,
            `Camera: x=${cam.x.toFixed(1)} y=${cam.y.toFixed(1)}`,
            `Level: ${this.game.currentLevelId || 'unknown'}`,
            `Test mode: ${this.game.testMode ? 'on' : 'off'}`,
            `FPS target: ${this.game.config?.timing?.fps ?? '--'}`
        ];
        content.textContent = stats.join('\n');
    }

    /**
     * Start a dialogue with an NPC using the shared speech bubble.
     */
    startNpcDialogue(npc) {
        if (!npc || !npc.canTalk) return;
        const id = npc.dialogueId || null;
        const start = id
            ? this.game.dialogueManager.startById(id, npc, () => {
                npc.onDialogueClosed?.();
                npc.setTalking?.(false);
            })
            : this.game.dialogueManager.startDialog(npc.dialogueLines || [], npc, () => {
                npc.onDialogueClosed?.();
                npc.setTalking?.(false);
            });
        if (start && typeof npc.setTalking === 'function') {
            npc.setTalking(true);
        }
    }

    /**
     * Start a one-off speech bubble with raw text.
     */
    showSpeechBubble(text) {
        const anchor = this.game.dialogueManager.state.anchor || this.game.player;
        this.game.dialogueManager.startDialog([text], anchor);
    }

    /**
     * Advance or dismiss the active speech bubble.
     */
    advanceSpeechBubble() {
        this.game.dialogueManager?.advance();
    }

    /**
     * Hide the speech bubble.
     */
    hideSpeechBubble(immediate = false) {
        this.game.dialogueManager?.close();
        if (immediate && this.game.speechBubble?.container) {
            this.game.speechBubble.container.style.display = 'none';
        }
    }

    /**
     * Lightweight styling parser for speech text.
     */
    formatSpeechText(text) {
        return this.game.dialogueManager?.formatSpeechText(text) ?? (typeof text === 'string' ? text : '');
    }

    wrapWaveText(inner) {
        return this.game.dialogueManager?.wrapWaveText(inner) ?? inner;
    }
}
