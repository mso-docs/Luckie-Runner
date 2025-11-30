# Dialogue System Guide (DialogueManager + SpeechBubble)

This guide explains how dialogue is stored, formatted, and displayed. It assumes no prior knowledge.

---
## Files and Classes
- Dialogue manager: `game/scripts/ui/DialogueManager.js`
- Speech bubble UI: `game/scripts/dialogue/SpeechBubble.js`
- Dialogue data: `game/scripts/dialogue/Dialogues.js`, `game/scripts/dialogue/NPCDialogues.js`
- UI hooks: `UIManager` calls dialogue methods and manages the bubble overlay.

---
## Responsibilities
- DialogueManager: loads dialogue data, tracks state (active, messages, index), formats text with markup, advances lines.
- SpeechBubble: manages DOM elements for the bubble, text, and hints.
- UIManager: triggers `startNpcDialogue`, `advanceSpeechBubble`, and positions bubbles near speakers.

---
## Data Format
Dialogues are arrays of strings keyed by id:
```js
window.NPCDialogues['npc.guide'] = [
  "Welcome to Beachside!",
  "Follow the signs to the town square."
];
```

---
## Markup (Formatting)
Supported markers in dialogue text (parsed by DialogueManager):
- `*bold*`
- `_italic_`
- `` `mono` ``
- `%shake%` (shaky effect)
- `~rainbow~`
- `^glow^`
- `!bounce!`
- `#wave#`

Example:
```js
"Take the *north path* to find the ~rainbow~ chest."
```

---
## Flow
1) UIManager detects interact with an NPC (E/Enter) and calls `startNpcDialogue(npc)`.
2) DialogueManager sets active dialogue, shows SpeechBubble overlay.
3) On Enter: `advanceSpeechBubble()` moves to next line or closes.
4) UIManager keeps the bubble positioned near the speaker each frame (`updateDialoguePosition`).

---
## SpeechBubble DOM
- Created/managed by `SpeechBubble` class; elements referenced in `UIManager`.
- Hint text: “Press Enter” (see `index.html` speech bubble markup).

---
## Extending Dialogue
- Add new dialogue arrays to `Dialogues.js`/`NPCDialogues.js`.
- If you need branching/choices, extend DialogueManager to handle new step types.
- To style differently, adjust `main.css` or the SpeechBubble template.

---
## Troubleshooting
- Dialogue not showing: ensure `dialogueId` matches data; check `isPlayerNearby` and interaction flow.
- Markup not applying: verify markers are closed and not escaped; ensure DialogueManager formatting is invoked (UIManager uses it by default).
- Bubble in wrong place: ensure `updateDialoguePosition` runs (called in UIManager update paths).
