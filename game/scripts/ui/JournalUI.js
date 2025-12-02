/**
 * JournalUI - manages journal entries, rendering, and modal display
 */
class JournalUI {
    constructor(game) {
        this.game = game;
        
        // Journal entries storage
        this.journals = new Map(); // key: journalId, value: journal object
        
        // DOM references
        this.journalList = null;
        this.journalEmpty = null;
        this.journalModal = null;
        this.modalTitle = null;
        this.modalAuthor = null;
        this.modalContent = null;
        this.modalClose = null;
        
        this.cacheInventoryRefs();
        this.buildJournalModal();
        this.setupEventListeners();
    }

    /**
     * Cache DOM references for the inventory journal panel
     */
    cacheInventoryRefs() {
        this.journalList = document.getElementById('inventoryJournals');
        this.journalEmpty = document.getElementById('journalEmptyState');
    }

    /**
     * Build the journal modal DOM container
     */
    buildJournalModal() {
        const container = document.getElementById('gameContainer');
        if (!container) return;

        const modal = document.createElement('div');
        modal.id = 'journalModal';
        modal.className = 'journal-modal hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'journalModalTitle');
        modal.innerHTML = `
            <div class="journal-modal-overlay"></div>
            <div class="journal-modal-card">
                <div class="journal-modal-header">
                    <div class="journal-modal-title" id="journalModalTitle">Journal Entry</div>
                    <div class="journal-modal-author" id="journalModalAuthor">by Author</div>
                    <button class="journal-modal-close" id="journalModalClose" aria-label="Close journal">✕</button>
                </div>
                <div class="journal-modal-body" id="journalModalContent">
                    <p>Journal content goes here...</p>
                </div>
            </div>
        `;

        container.appendChild(modal);

        this.journalModal = modal;
        this.modalTitle = modal.querySelector('#journalModalTitle');
        this.modalAuthor = modal.querySelector('#journalModalAuthor');
        this.modalContent = modal.querySelector('#journalModalContent');
        this.modalClose = modal.querySelector('#journalModalClose');
    }

    /**
     * Setup event listeners for modal and keyboard navigation
     */
    setupEventListeners() {
        if (!this.journalModal) return;

        // Close modal on button click
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.closeModal());
        }

        // Close modal on overlay click
        const overlay = this.journalModal.querySelector('.journal-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeModal());
        }

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.journalModal.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }

    /**
     * Add a journal entry to the collection
     * @param {Object} journalData - Journal entry data
     * @param {string} journalData.id - Unique identifier for the journal
     * @param {string} journalData.title - Journal title
     * @param {string} journalData.author - Author/giver of the journal
     * @param {string} journalData.content - Full journal content (supports HTML)
     * @param {number} journalData.timestamp - When the journal was received
     */
    addJournal(journalData) {
        if (!journalData || !journalData.id) {
            console.warn('[JournalUI] Invalid journal data:', journalData);
            return;
        }

        const journal = {
            id: journalData.id,
            title: journalData.title || 'Untitled Journal',
            author: journalData.author || 'Unknown',
            content: journalData.content || '',
            timestamp: journalData.timestamp || Date.now(),
            read: false
        };

        this.journals.set(journal.id, journal);
        this.renderInventory();

        // Show callout notification
        this.showJournalCallout(journal);

        // Play sound
        const audio = this.game?.services?.audio || this.game?.audioManager;
        if (audio) {
            audio.playSound?.('badge', 0.9); // Reuse badge sound for now
        }
    }

    /**
     * Show a brief callout when a new journal is received
     * @param {Object} journal
     */
    showJournalCallout(journal) {
        // Reuse the badge callout system if available
        const callout = document.getElementById('badgeCallout');
        if (!callout) return;

        const nameEl = callout.querySelector('.badge-callout__name');
        const descEl = callout.querySelector('.badge-callout__description');
        const iconEl = callout.querySelector('.badge-callout__icon');

        if (nameEl) nameEl.textContent = journal.title;
        if (descEl) descEl.textContent = `From ${journal.author}. Check your Journal!`;
        if (iconEl) {
            iconEl.src = 'art/items/book.png'; // Use book icon if available, otherwise keep badge icon
            iconEl.alt = 'Journal icon';
        }

        callout.classList.remove('hidden');
        requestAnimationFrame(() => {
            callout.classList.add('is-visible');
        });

        setTimeout(() => {
            callout.classList.remove('is-visible');
            setTimeout(() => {
                callout.classList.add('hidden');
            }, 280);
        }, 3600);
    }

    /**
     * Check if player has a specific journal
     * @param {string} journalId
     * @returns {boolean}
     */
    hasJournal(journalId) {
        return this.journals.has(journalId);
    }

    /**
     * Get all journals as a sorted array
     * @returns {Array}
     */
    getJournals() {
        const journalArray = Array.from(this.journals.values());
        // Sort by title alphabetically
        return journalArray.sort((a, b) => a.title.localeCompare(b.title));
    }

    /**
     * Render journal entries into the inventory list
     */
    renderInventory() {
        if (!this.journalList) {
            this.cacheInventoryRefs();
        }
        
        const list = this.journalList;
        const emptyState = this.journalEmpty;
        if (!list) {
            console.warn('[JournalUI] Journal list element not found!');
            return;
        }

        const journals = this.getJournals();
        list.innerHTML = '';

        if (!journals.length) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        journals.forEach(journal => {
            const card = document.createElement('div');
            card.className = 'journal-card';
            if (!journal.read) {
                card.classList.add('unread');
            }
            card.setAttribute('data-journal-id', journal.id);
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.innerHTML = `
                <div class="journal-card__icon" aria-hidden="true">📖</div>
                <div class="journal-card__meta">
                    <div class="journal-card__title">${journal.title}</div>
                    <div class="journal-card__author">by ${journal.author}</div>
                </div>
                ${!journal.read ? '<div class="journal-card__badge">New</div>' : ''}
            `;

            // Click to open modal
            card.addEventListener('click', () => this.openModal(journal.id));
            
            // Enter key to open modal
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openModal(journal.id);
                }
            });

            list.appendChild(card);
        });
    }

    /**
     * Open the journal modal to display a specific entry
     * @param {string} journalId
     */
    openModal(journalId) {
        const journal = this.journals.get(journalId);
        if (!journal || !this.journalModal) return;

        // Mark as read
        journal.read = true;
        this.renderInventory();

        // Set modal content
        if (this.modalTitle) this.modalTitle.textContent = journal.title;
        if (this.modalAuthor) this.modalAuthor.textContent = `by ${journal.author}`;
        if (this.modalContent) {
            // Support HTML content with line breaks
            const formattedContent = journal.content.replace(/\n/g, '<br>');
            this.modalContent.innerHTML = formattedContent;
        }

        // Show modal
        this.journalModal.classList.remove('hidden');
        
        // Pause game if playing
        if (this.game && this.game.state === 'playing') {
            this.wasPlaying = true;
        }
    }

    /**
     * Close the journal modal
     */
    closeModal() {
        if (!this.journalModal) return;

        this.journalModal.classList.add('hidden');

        // Resume game if it was playing
        if (this.wasPlaying) {
            this.wasPlaying = false;
        }
    }

    /**
     * Reset all journals (for new game)
     * @param {boolean} clearAll - If true, removes all journals
     */
    reset(clearAll = true) {
        if (clearAll) {
            this.journals.clear();
        } else {
            // Mark all as unread
            this.journals.forEach(journal => {
                journal.read = false;
            });
        }
        this.renderInventory();
        this.closeModal();
    }

    /**
     * Get save data for persistence
     * @returns {Object}
     */
    getSaveData() {
        const journalArray = Array.from(this.journals.values());
        return {
            journals: journalArray.map(j => ({
                id: j.id,
                title: j.title,
                author: j.author,
                content: j.content,
                timestamp: j.timestamp,
                read: j.read
            }))
        };
    }

    /**
     * Load saved journal data
     * @param {Object} saveData
     */
    loadSaveData(saveData) {
        if (!saveData || !Array.isArray(saveData.journals)) return;

        this.journals.clear();
        saveData.journals.forEach(journalData => {
            this.journals.set(journalData.id, journalData);
        });
        this.renderInventory();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = JournalUI;
}
