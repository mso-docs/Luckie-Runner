# Dialogue and Speech Bubble Guide

This guide explains how dialogue works, how to add new lines from scratch, and how to map dialogue to players, NPCs, and signs. It also shows where to change speech bubble styling (size, color, format).

## Components and File Map
- **Dialogue data:**
  - `game/scripts/dialogue/Dialogues.js` — general dialogue entries.
  - `game/scripts/dialogue/NPCDialogues.js` — NPC-specific dialogue entries.
- **Dialogue runtime:**
  - `DialogueManager` (`game/scripts/ui/DialogueManager.js`) — stores dialogue state, formatting, and advancing lines.
  - `SpeechBubble` (`game/scripts/dialogue/SpeechBubble.js`) — handles DOM bubble sizing, showing, hiding, advancing.
  - `UIManager` (`game/scripts/ui/UIManager.js`) — triggers dialogue start/end and updates bubble position.
- **Hook points:**
  - **NPCs:** `dialogueId` on NPC definitions (e.g., TownPatrolNPC data, buildings, or room NPCs).
  - **Signs:** `SignUI` (`game/scripts/ui/SignUI.js`) uses `dialogueLines` on sign entities.
  - **Player intro/system text:** Call `uiManager.showSpeechBubble(text)` directly, or use DialogueManager to sequence lines.

## Dialogue Markup (Formatting Codes)
Dialogue text supports lightweight markup handled by `DialogueManager.formatSpeechText`:
- `*bold*`
- `_italic_`
- `` `mono` ``
- `%shake%` — shaky effect
- `~rainbow~`
- `^glow^`
- `!bounce!`
- `#wave#`

Example:
```js
"Welcome to *Beachside*!\nTry the %shake%fizzy%shake% boba."
```

## Adding New Dialogue (Data)
Add entries to `Dialogues.js` or `NPCDialogues.js`. Keys are arbitrary strings you reference via `dialogueId`.

```js
// game/scripts/dialogue/NPCDialogues.js
window.NPCDialogues = window.NPCDialogues || {};
window.NPCDialogues['npc.maria'] = [
  "Welcome to *Beachside*!",
  "The boba shop is just ahead."
];
window.NPCDialogues['npc.guard'] = [
  "Halt! You need a pass to enter.",
  "Come back with permission."
];
```

You can add player/system dialogue in `Dialogues.js` similarly:
```js
window.Dialogues = window.Dialogues || {};
window.Dialogues['intro'] = [
  "Hi, I'm Luckie.",
  "Let's find the cafe before sunset."
];
```

## Mapping Dialogue to NPCs
Add `dialogueId` to the NPC definition:
```js
// TownsConfig NPC example
{
  id: 'maria',
  type: 'townNpc',
  name: 'Maria',
  sprite: 'art/sprites/maria.png',
  width: 48, height: 70, frames: 4,
  dialogueId: 'npc.maria',   // maps to NPCDialogues['npc.maria']
  speed: 35, pauseMs: 40,
  x: 8800,
  patrol: [{ x: 8700 }, { x: 9100 }]
}
```
When the player interacts (E/Enter), `UIManager.startNpcDialogue(npc)` is called, which uses `dialogueId` to fetch lines.

## Mapping Dialogue to Signs
Signs are entities with `dialogueLines`:
```js
// Example sign definition
{ type: 'sign', x: 3200, y: 820, spriteSrc: 'art/items/sign.png',
  dialogueLines: [
    "North: Beachside",
    "South: Quiet Docks"
  ]
}
```
`SignUI` shows these lines in the speech bubble when interacted with.

## Player/System Dialogue
Call directly:
```js
// Show a single line
uiManager.showSpeechBubble("Welcome to *Beachside*!");

// Sequence lines using DialogueManager
uiManager.dialogueManager.startDialogue(['Line 1', 'Line 2']);
```
Attach to events (entering areas, completing quests) as needed.

## Showing/Advancing Dialogue
- **Show:** `uiManager.startNpcDialogue(npc)` or `uiManager.showSpeechBubble(text)`.
- **Advance:** `uiManager.advanceSpeechBubble()` (bound to input like Enter).
- **Hide:** `uiManager.hideSpeechBubble(immediate?)`.
- The bubble tracks the speaker (player or NPC) via `UIManager.updateDialoguePosition()`.

## Changing Speech Bubble Look (Size, Color, Format)
Edit `game/styles/main.css` (look for `.speech-bubble`, `.speech-bubble__body`, `.dialog-bubble`):
- **Background/color:** change `background`, `border`, `color`.
- **Padding/size:** adjust `padding`, `max-width`, `font-size`, `line-height`.
- **Pointer/arrow:** modify pseudo-elements if present.
- **Animation:** tweak CSS transitions or add keyframes for fade/slide.

Example CSS tweaks:
```css
.speech-bubble {
  max-width: 520px;
}
.speech-bubble__body {
  background: #1e1e2e;
  color: #f7f7f7;
  border: 2px solid #ffffff;
  border-radius: 12px;
  padding: 12px 16px;
}
.speech-bubble__body p {
  font-size: 16px;
  line-height: 1.4;
}
```

## Customizing Dialogue Flow
- Add new formatting: extend `DialogueManager.formatSpeechText` to parse new markers.
- Change auto-advance: adjust DialogueManager timing (if you add timers) or require explicit input.
- Change positioning: update `UIManager.updateDialoguePosition` to offset the bubble relative to the speaker.

## Quick Start Checklist
1) Add lines to `Dialogues.js` or `NPCDialogues.js` under a new key.
2) Set `dialogueId` on an NPC, or set `dialogueLines` on a sign, or call `showSpeechBubble` directly.
3) Ensure input (Enter/E) advances via `UIManager.advanceSpeechBubble`.
4) Style the bubble in CSS (`speech-bubble`, `.speech-bubble__body`).
5) Test: interact with the NPC/sign, verify lines/formatting and positioning.
