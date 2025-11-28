/**
 * DialogueManager - central lookup and simple delivery for dialogues by id.
 */
class DialogueManager {
    constructor(game, dialogueMap = {}) {
        this.game = game;
        this.dialogues = dialogueMap || {};
    }

    getLines(id) {
        if (!id) return [];
        const lines = this.dialogues[id];
        if (!lines) return [];
        return Array.isArray(lines) ? lines.slice() : [];
    }
}
