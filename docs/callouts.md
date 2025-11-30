# Callout Bubbles (Interaction Prompts and Badge/Sign/Chest Callouts)

This guide explains how on-screen callouts work (e.g., “Press Z to interact with me!”), where they’re created, how to change text/position/style, and how to add your own.

## What Are Callouts?
Small floating labels that prompt the player (e.g., to interact) or celebrate an event (e.g., badge earned). They are DOM elements positioned relative to the game canvas.

## Where They’re Defined (HTML)
- **Shop ghost hint bubble:** `#shopGhostBubble` in `game/index.html` (inside `#gameUI`):
  ```html
  <div id="shopGhostBubble" class="npc-bubble hidden" aria-hidden="true">
      Press Z to interact with me!
  </div>
  ```
- **Other callouts are created dynamically in JS** (chest, badge callouts are injected at runtime; signs create bubbles in JS).

## Core Scripts and Responsibilities
- **UIManager (`game/scripts/ui/UIManager.js`):** Shows/hides the shop ghost bubble; positions it near the NPC/player.
- **SignUI (`game/scripts/ui/SignUI.js`):** Creates sign callouts (“Press E to read”) near signs and manages sign dialogue.
- **Chest (`game/scripts/items/Chest.js`):** Creates a “press key” callout above chests when in range.
- **BadgeUI (`game/scripts/ui/BadgeUI.js`):** Builds a “badge earned” callout overlay, queues, and displays it.
- **CSS (`game/styles/main.css`):** Controls appearance/positioning of `.npc-bubble`, `.sign-callout`, `.chest-callout`, `.badge-callout`, etc.

## How the Shop Ghost Callout Works
- **Markup:** `#shopGhostBubble` in `index.html`.
- **Show/Hide:** UIManager toggles `hidden` and `aria-hidden` based on proximity to the shop ghost.
- **Position:** UIManager aligns the bubble to the shop ghost in screen space (uses game camera + entity position).
- **Edit text:** Change the inner text in `index.html` or set it via JS before showing.
- **Edit style:** Update CSS for `.npc-bubble` (color, background, padding, font).

## How Sign Callouts Work
- **Creation:** SignUI builds a `.sign-callout` div near the sign when the player is close enough.
- **Text:** Typically “Press E to read”; set in SignUI when creating the callout element.
- **Positioning:** Uses camera + sign world position; sets `style.left/bottom`.
- **Style:** `.sign-callout` in CSS (background, border, font).
- **Dialogue:** When interacted, SignUI triggers speech bubble dialogue using `dialogueLines` on the sign entity.

## How Chest Callouts Work
- **Creation:** Chest entities create a `.chest-callout` div on demand (Chest.js).
- **Visibility:** Shown when player is in interact range and the chest is unopened.
- **Positioning:** Uses camera + chest world position; sets `left/bottom` style.
- **Style:** `.chest-callout` in CSS.
- **Edit text:** Change the default string in Chest.js where the callout element is created.

## How Badge Callouts Work
- **Creation:** BadgeUI injects a `#badgeCallout` container (with children `.badge-callout__*`) into a provided parent.
- **Queue:** `BadgeUI` queues callouts; shows one at a time for `calloutDuration` (default ~3.6s).
- **Content:** Title, badge name, icon, description set in `showNextCallout`.
- **Style:** `.badge-callout` and children in CSS control colors, size, animation.

## Adding Your Own Callout (Simple Pattern)
1) **Create a DOM element** (or add in `index.html`):
   ```html
   <div id="myCallout" class="custom-callout hidden" aria-hidden="true">
     Press F to do the thing!
   </div>
   ```
2) **Style it** in CSS (`.custom-callout { position: absolute; ... }`).
3) **Show/hide and position in JS:**
   ```js
   const el = document.getElementById('myCallout');
   function showCallout(worldX, worldY, camera) {
     const screenX = worldX - camera.x;
     const screenY = worldY - camera.y;
     el.style.left = `${screenX}px`;
     el.style.bottom = `${(camera.viewportHeight - screenY) + 20}px`;
     el.classList.remove('hidden');
     el.setAttribute('aria-hidden', 'false');
   }
   function hideCallout() {
     el.classList.add('hidden');
     el.setAttribute('aria-hidden', 'true');
   }
   ```
4) **Trigger show/hide** based on proximity or state (e.g., player near an object).

## Editing Text, Size, Color, Format
- **Text:** Change innerHTML/innerText where the bubble is defined (HTML) or when constructed in JS.
- **Size/Color:** Edit CSS for the relevant class (`.npc-bubble`, `.sign-callout`, `.chest-callout`, `.badge-callout`, or your custom class):
  ```css
  .npc-bubble {
    background: #1e1e2e;
    color: #f7f7f7;
    padding: 8px 12px;
    border: 2px solid #ffffff;
    border-radius: 10px;
    font-size: 15px;
  }
  ```
- **Position tweaks:** Adjust `transform`, `left`, `bottom` calculations in JS or add CSS offsets.
- **Animation:** Add CSS transitions or keyframes to fade/slide callouts.

## Scripts to Modify
- Shop ghost: `game/scripts/ui/UIManager.js` (`shopGhostBubble` handling).
- Signs: `game/scripts/ui/SignUI.js` (create/sign callouts and dialogue).
- Chests: `game/scripts/items/Chest.js` (callout creation/update).
- Badges: `game/scripts/ui/BadgeUI.js` (callout injection/queue).
- Styles: `game/styles/main.css` (search for `.npc-bubble`, `.sign-callout`, `.chest-callout`, `.badge-callout`).

## Quick Checklist
1) Locate the callout class/id you want to edit (or create a new one).
2) Update text in HTML/JS.
3) Update styles in CSS (size, color, border, font).
4) Ensure show/hide logic toggles `hidden` and `aria-hidden`.
5) Position relative to camera: `left = worldX - camera.x`, `bottom = (viewportHeight - (worldY - camera.y)) + offset`.
6) Test near the target entity; adjust offsets/thresholds as needed.
