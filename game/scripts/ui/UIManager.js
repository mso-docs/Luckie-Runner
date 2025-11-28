/**
 * UIManager - Handles inventory overlay interactions and rendering.
 * Keeps Game focused on orchestration while UI concerns stay here.
 */
class UIManager {
    constructor(game) {
        this.game = game;
        this.inventoryUI = game.inventoryUI || {
            overlay: null,
            isOpen: false
        };
        // Share reference back to game for backward compatibility
        this.game.inventoryUI = this.inventoryUI;
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

        if (!silent && this.game?.audioManager && this.game.playButtonSound) {
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
}
