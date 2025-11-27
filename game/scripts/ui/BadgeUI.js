/**
 * BadgeUI - manages badge progression, callouts, and inventory rendering
 */
class BadgeUI {
    constructor(game) {
        this.game = game;
        this.badgeDefinitions = {
            slime_badge: {
                id: 'slime_badge',
                name: 'Slime Badge',
                shortTitle: 'Slime Badge',
                description: '+5 damage to all slimes! Also gives +5 defense against any slime.',
                icon: 'art/badges/slime-badge.png',
                requirement: { type: 'defeat', enemyType: 'slime', count: 1 },
                modifiers: { slimeAttack: 5, slimeDefense: 5 }
            }
        };

        this.earnedBadges = new Map();
        this.progress = {
            defeats: {}
        };

        this.calloutQueue = [];
        this.calloutActive = false;
        this.calloutDuration = 3600;

        this.cacheInventoryRefs();
        this.buildCalloutShell();
    }

    /**
     * Cache DOM references for the inventory badge panel
     */
    cacheInventoryRefs() {
        this.inventoryList = document.getElementById('inventoryBadges');
        this.inventoryEmpty = document.getElementById('badgeEmptyState');
    }

    /**
     * Build the badge callout DOM container
     */
    buildCalloutShell() {
        const container = document.getElementById('gameContainer');
        if (!container) return;

        const callout = document.createElement('div');
        callout.id = 'badgeCallout';
        callout.className = 'badge-callout hidden';
        callout.setAttribute('aria-live', 'polite');
        callout.innerHTML = `
            <div class="badge-callout__banner">
                <div class="badge-callout__title">You got the <span class="badge-callout__name"></span>!</div>
                <div class="badge-callout__sparkles" aria-hidden="true">
                    <span>★</span>
                    <span>✦</span>
                    <span>★</span>
                </div>
            </div>
            <div class="badge-callout__body">
                <div class="badge-callout__burst">
                    <div class="badge-callout__starburst" aria-hidden="true"></div>
                    <div class="badge-callout__burst-ring" aria-hidden="true"></div>
                    <img class="badge-callout__icon" alt="Badge icon">
                </div>
                <div class="badge-callout__description"></div>
            </div>
        `;

        container.appendChild(callout);

        this.calloutEl = callout;
        this.nameEl = callout.querySelector('.badge-callout__name');
        this.descEl = callout.querySelector('.badge-callout__description');
        this.iconEl = callout.querySelector('.badge-callout__icon');
    }

    /**
     * Track an enemy defeat for badge progress
     * @param {Enemy} enemy
     */
    handleEnemyDefeated(enemy) {
        if (!enemy || !enemy.type) return;
        this.progress.defeats[enemy.type] = (this.progress.defeats[enemy.type] || 0) + 1;
        this.evaluateBadge('slime_badge');
    }

    /**
     * Check if a badge should be granted
     * @param {string} badgeId
     */
    evaluateBadge(badgeId) {
        const def = this.badgeDefinitions[badgeId];
        if (!def || this.earnedBadges.has(badgeId)) return;

        if (def.requirement?.type === 'defeat') {
            const kills = this.progress.defeats[def.requirement.enemyType] || 0;
            if (kills >= def.requirement.count) {
                this.awardBadge(def);
            }
        }
    }

    /**
     * Award a badge, apply effects, and show UI
     * @param {Object} badgeDef
     */
    awardBadge(badgeDef) {
        if (!badgeDef || this.earnedBadges.has(badgeDef.id)) return;

        this.earnedBadges.set(badgeDef.id, { ...badgeDef, earnedAt: Date.now() });
        this.applyBadgeModifiers(badgeDef.modifiers);

        this.queueCallout(badgeDef);
        this.renderInventory();

        if (this.game?.audioManager) {
            this.game.audioManager.playSound('badge', 0.9);
        }
    }

    /**
     * Apply all earned badge modifiers to the current player
     * Useful when a new player instance is created
     * @param {Player} player
     */
    reapplyAllModifiers(player = this.game?.player) {
        if (!player) return;
        player.combatModifiers = player.combatModifiers || { slimeAttack: 0, slimeDefense: 0 };
        player.combatModifiers.slimeAttack = 0;
        player.combatModifiers.slimeDefense = 0;

        this.earnedBadges.forEach(badge => {
            this.applyBadgeModifiers(badge.modifiers, player, true);
        });
    }

    /**
     * Apply badge modifiers to the player
     * @param {Object} modifiers
     * @param {Player} targetPlayer
     * @param {boolean} skipReset - when reapplying, avoid clobbering existing sums
     */
    applyBadgeModifiers(modifiers = {}, targetPlayer = this.game?.player, skipReset = false) {
        if (!targetPlayer || !modifiers) return;

        targetPlayer.combatModifiers = targetPlayer.combatModifiers || { slimeAttack: 0, slimeDefense: 0 };

        if (!skipReset) {
            targetPlayer.combatModifiers.slimeAttack = (targetPlayer.combatModifiers.slimeAttack || 0);
            targetPlayer.combatModifiers.slimeDefense = (targetPlayer.combatModifiers.slimeDefense || 0);
        }

        if (modifiers.slimeAttack) {
            targetPlayer.combatModifiers.slimeAttack += modifiers.slimeAttack;
        }
        if (modifiers.slimeDefense) {
            targetPlayer.combatModifiers.slimeDefense += modifiers.slimeDefense;
        }
    }

    /**
     * Queue a badge callout for display
     * @param {Object} badge
     */
    queueCallout(badge) {
        this.calloutQueue.push(badge);
        if (!this.calloutActive) {
            this.showNextCallout();
        }
    }

    /**
     * Show the next queued callout
     */
    showNextCallout() {
        if (!this.calloutEl) return;
        if (this.calloutQueue.length === 0) {
            this.calloutActive = false;
            this.calloutEl.classList.add('hidden');
            return;
        }

        const badge = this.calloutQueue.shift();
        this.calloutActive = true;

        if (this.nameEl) this.nameEl.textContent = badge.shortTitle || badge.name || 'Badge';
        if (this.descEl) this.descEl.textContent = badge.description || '';
        if (this.iconEl && badge.icon) {
            this.iconEl.src = badge.icon;
            this.iconEl.alt = badge.name || 'Badge icon';
        }

        this.calloutEl.classList.remove('hidden');
        // Trigger transition
        requestAnimationFrame(() => {
            this.calloutEl.classList.add('is-visible');
        });

        setTimeout(() => {
            this.hideCallout(() => this.showNextCallout());
        }, this.calloutDuration);
    }

    /**
     * Hide current callout and continue the queue
     * @param {Function} onHidden
     */
    hideCallout(onHidden) {
        if (!this.calloutEl) return;
        this.calloutEl.classList.remove('is-visible');
        setTimeout(() => {
            this.calloutEl.classList.add('hidden');
            this.calloutActive = false;
            if (typeof onHidden === 'function') {
                onHidden();
            }
        }, 280);
    }

    /**
     * Get a flat array of earned badge objects
     * @returns {Array}
     */
    getEarnedBadges() {
        return Array.from(this.earnedBadges.values());
    }

    /**
     * Render earned badges into the inventory list
     */
    renderInventory() {
        if (!this.inventoryList) {
            this.cacheInventoryRefs();
        }
        const list = this.inventoryList;
        const emptyState = this.inventoryEmpty;
        if (!list) return;

        const badges = this.getEarnedBadges();
        list.innerHTML = '';

        if (!badges.length) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        badges.forEach(badge => {
            const row = document.createElement('div');
            row.className = 'badge-card';
            row.innerHTML = `
                <div class="badge-card__icon">
                    <span class="badge-card__burst" aria-hidden="true"></span>
                    <img src="${badge.icon}" alt="" />
                </div>
                <div class="badge-card__meta">
                    <div class="badge-card__name">${badge.name}</div>
                    <div class="badge-card__desc">${badge.description || ''}</div>
                </div>
            `;
            list.appendChild(row);
        });
    }
}
