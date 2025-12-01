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

Dialogue text supports rich markup for visual effects. All markup is parsed by `DialogueManager.formatSpeechText` and rendered with CSS animations in `speech.css`.

### Complete Markup Reference

#### Text Styling (Static)

**Bold Text** - `*text*`
- **Effect**: Makes text bold and thicker
- **CSS**: `font-weight: 800`
- **Use case**: Emphasis, important words, character names
- **Example**: `"Welcome to *Beachside*!"`

**Monospace/Code** - `` `text` ``
- **Effect**: Monospace font with subtle background
- **CSS**: Special font, gray background, rounded corners
- **Use case**: Technical terms, commands, item names
- **Example**: `` "Press the `E` key to interact" ``

#### Size Modifiers

**Tiny Text** - `_text_`
- **Effect**: Smaller text (14px)
- **CSS**: `font-size: 14px`
- **Use case**: Whispers, footnotes, side comments
- **Example**: `"I heard _someone_ stole the treasure"`

**Large Text** - `<text>`
- **Effect**: Big text (24px)
- **CSS**: `font-size: 24px`
- **Use case**: Shouting, emphasis, titles
- **Example**: `"<STOP> right there!"`

**Larger Text** - `<<text>>`
- **Effect**: Bigger text (28px)
- **CSS**: `font-size: 28px`
- **Use case**: Major announcements, boss names
- **Example**: `"<<BOSS BATTLE>> begins now!"`

**Gigantic Text** - `<<<text>>>`
- **Effect**: Huge text (32px) with tighter line height
- **CSS**: `font-size: 32px; line-height: 1.1`
- **Use case**: Dramatic reveals, important titles
- **Example**: `"<<<LEVEL COMPLETE>>>"`

#### Animated Effects

**Shake** - `%text%`
- **Effect**: Rapid vibrating/shaking motion
- **CSS Animation**: `speechShake` - horizontal shake at 0.18s intervals
- **Visual**: Text jitters left/right by 1px
- **Use case**: Fear, excitement, urgency, spicy/fizzy items
- **Example**: `"Try the %shake%fizzy%shake% boba!"`
- **Animation detail**: 
  ```
  0%: translate(0,0)
  25%: translate(-1px, 0)
  50%: translate(1px, 0)
  75%: translate(-1px, 0)
  100%: translate(0,0)
  ```

**Rainbow** - `~text~`
- **Effect**: Cycling through rainbow colors with glowing shadow
- **CSS Animation**: `speechRainbow` + `speechRainbowGlow` at 1.8s cycle
- **Visual**: Text color cycles through red → yellow → cyan → blue → magenta
- **Use case**: Magical items, special effects, mystical dialogue
- **Example**: `"The ~rainbow~ crystal glimmers"`
- **Color cycle**:
  ```
  0%: #ff6b6b (red)
  25%: #ffd166 (yellow)
  50%: #6fffd9 (cyan)
  75%: #6b9bff (blue)
  100%: #ff6bff (magenta)
  ```

**Glow** - `^text^`
- **Effect**: Bright glowing green with pulsing shadow
- **CSS Animation**: `speechGlowPulse` at 1.4s intervals
- **Visual**: Lime-green color (#c5ff4a) with radiating glow effect
- **Use case**: Healing, nature, success, positive effects
- **Example**: `"You found a ^healing potion^!"`
- **Glow details**: 
  - Base color: Bright lime green
  - Text stroke: Dark green outline
  - Triple shadow layers with brightness pulse

**Bounce** - `!text!`
- **Effect**: Gentle up-and-down bouncing
- **CSS Animation**: `speechBounce` at 0.8s intervals
- **Visual**: Text moves up 2px and back down
- **Use case**: Excitement, alerts, warnings, cheerful dialogue
- **Example**: `"!Warning!  Watch out for slimes!"`
- **Animation detail**:
  ```
  0%: translateY(0)
  50%: translateY(-2px)
  100%: translateY(0)
  ```

**Wave** - `#text#`
- **Effect**: Letter-by-letter wave motion (like "the wave" at sports games)
- **CSS Animation**: `speechWave` at 1.1s intervals, staggered per letter
- **Visual**: Each letter independently moves up 3px, down 3px in sequence
- **Use case**: Water, ocean, flowing movement, playful text
- **Example**: `"The #ocean waves# crash against the shore"`
- **Technical**: Each letter gets `animation-delay` based on position (i × 0.06s)
- **Animation detail**:
  ```
  0%: translateY(0)
  25%: translateY(-3px)
  50%: translateY(0)
  75%: translateY(3px)
  100%: translateY(0)
  ```

### Combining Markup

You can combine multiple effects by nesting or placing them adjacent:

```javascript
// Size + Animation
"The <<<~LEGENDARY~>>> sword!"
// Result: Gigantic rainbow-colored text

// Multiple effects in sequence
"Be *careful* with the %radioactive% ^slime^!"
// Result: Bold "careful", shaking "radioactive", glowing "slime"

// Mixing sizes
"_whisper:_ <<SHOUT!>>"
// Result: Tiny whisper, then large shout
```

### Complete Examples

```javascript
// Friendly shopkeeper
'npc.shopkeeper': [
    'Welcome to my *shop*!',
    'We have ^healing potions^ and %spicy% peppers.',
    'The <<<LEGENDARY>>> sword is in the back.'
]

// Mysterious wizard
'npc.wizard': [
    '_Listen closely..._ The ~rainbow crystal~ holds great power.',
    '!Beware! The ^ancient magic^ is unpredictable.',
    'Press the `E` key when you\'re ready.'
]

// Ocean-themed NPC
'npc.sailor': [
    'Ahoy! The #ocean waves# are calm today.',
    'You can see the <<lighthouse>> from here.',
    '_They say_ a ~mythical~ creature lives in the deep.'
]

// Dramatic boss encounter
'boss.slime_king': [
    '<<<WHO DARES DISTURB MY SLUMBER?>>>',
    'I am the *Slime King*, ruler of the %toxic% marsh!',
    'Prepare to face my ^legendary^ power!'
]
```

### Markup Best Practices

**Do:**
- ✅ Use `*bold*` for names and important terms
- ✅ Use `^glow^` for positive/healing effects
- ✅ Use `%shake%` for urgency or excitement
- ✅ Use `~rainbow~` sparingly for truly special items
- ✅ Use `#wave#` for ocean/water-related text
- ✅ Use size modifiers for dramatic effect

**Don't:**
- ❌ Overuse animations - too many effects become distracting
- ❌ Use `<<<gigantic>>>` for regular dialogue
- ❌ Mix too many different effects in one sentence
- ❌ Forget to close markup tags (e.g., `%text` without closing `%`)
- ❌ Use animated effects for every word

### Technical Details

**Processing order** (DialogueManager.formatSpeechText):
1. HTML escape special characters (`<`, `>`, `&`)
2. Apply size modifiers (gigantic, bigger, big, tiny)
3. Apply text styling (bold, mono)
4. Apply animated effects (shake, rainbow, glow, bounce)
5. Apply wave effect (special - creates individual spans per letter)

**Performance notes:**
- Wave effect creates one `<span>` per character
- Long wave text (>50 chars) may impact performance on older devices
- Rainbow and glow effects use CSS animations (GPU-accelerated)
- All effects are pure CSS - no JavaScript animation loops

**Extending markup:**
To add new effects, modify `DialogueManager.formatSpeechText` and add corresponding CSS in `speech.css`:

```javascript
// In DialogueManager.js
apply(/\$(.+?)\$/g, 'speech-custom');  // Add new marker

// In speech.css
.speech-custom {
    color: #ff00ff;
    animation: customAnimation 1s infinite;
}
@keyframes customAnimation {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}
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
