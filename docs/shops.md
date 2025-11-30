# Creating a New Shop from Scratch

This guide explains how to add a new shop with custom item offerings: the UI pieces, data shape, and code touchpoints. It assumes minimal prior knowledge.

## Core Components
- **Shop overlay markup**: `#shopOverlay` in `game/index.html`.
- **Shop UI logic**: `UIManager` (`game/scripts/ui/UIManager.js`) handles showing/hiding the shop, populating items, and purchases.
- **Shop inventory/data**: You define what items are for sale and their costs; purchase logic consumes coins/rocks/other currencies from the player.
- **EntityFactory** / **items**: Items you sell should exist as item definitions and be creatable by `EntityFactory`.
- **Input**: `UIInputController` manages list navigation and confirm/exit keys; click handlers are also wired in UIManager.
- **NPC/Trigger**: A shop is usually opened by interacting with a shop NPC (e.g., `ShopGhost`) or a trigger zone.

## Shop UI Anatomy (index.html)
```html
<!-- Shop Overlay -->
<div id="shopOverlay" class="shop-overlay hidden" aria-hidden="true">
  <div class="shop-window" role="dialog" aria-labelledby="shopTitle">
    <div class="shop-header">
      <div class="shop-currency chip hp">
        <span class="chip-label">HP</span>
        <span class="chip-value" id="shopHPValue">0/0</span>
      </div>
      <div class="shop-currency chip coin">
        <span class="chip-label">Coins</span>
        <span class="chip-value" id="shopCoinValue">0</span>
      </div>
      <div class="shop-currency chip rock">
        <span class="chip-label">Rocks</span>
        <span class="chip-value" id="shopRockValue">0</span>
      </div>
      <div class="shop-currency chip star">
        <span class="chip-label">Lvl</span>
        <span class="chip-value" id="shopLevelValue">1</span>
      </div>
    </div>

    <div class="shop-title" id="shopTitle">Which one?</div>

    <div class="shop-list" id="shopItemList"></div>

    <div class="shop-footer">
      <span class="footer-control stop">Z Stop</span>
      <span class="footer-control confirm">Enter Confirm</span>
    </div>
  </div>
</div>
```
- List container: `#shopItemList` — UIManager populates it with your items.
- Currency chips: `#shopHPValue`, `#shopCoinValue`, `#shopRockValue`, `#shopLevelValue`.
- Visibility: `hidden` class toggled by UIManager (`showShopOverlay`/`hideShopOverlay`).

## Styling
Styles for `.shop-overlay`, `.shop-window`, `.shop-currency`, `.shop-list`, etc., live in `game/styles/main.css`. You can add new classes or tweak existing ones for your shop theme.

## Wiring the Shop (UIManager)
Key functions in `UIManager`:
- `setupShopUI()`: Caches DOM refs, binds close/confirm/navigation handlers.
- `showShopOverlay()`: Removes `hidden`, sets current shop context.
- `hideShopOverlay()`: Adds `hidden`, clears selection.
- `updateShopDisplay()`: Populates `#shopItemList` with current shop items and updates currency chips.
- `purchaseShopItem(item)`: Checks currency, applies effects, plays sounds, updates inventory/HUD, and refreshes the list.

If you add new currencies or behaviors, extend `updateShopDisplay` and `purchaseShopItem` to handle them.

## Defining Shop Offerings
You can define shop inventory as plain data (array of objects) and pass it to UIManager when opening the shop. Suggested shape:
```js
const myShopItems = [
  { id: 'coffee', name: 'Coffee', desc: 'Stamina boost', price: { coins: 25 }, icon: 'art/items/coffee.png', type: 'coffee' },
  { id: 'rock_bag', name: 'Rock Bag', desc: 'Adds 5 rocks', price: { coins: 10 }, type: 'rock_bag', amount: 5 },
  { id: 'potion', name: 'Health Potion', desc: 'Restores 20 HP', price: { coins: 30 }, type: 'health_potion', healAmount: 20 }
];
```
- `id`: Unique item key for the shop list.
- `name` / `desc`: Display strings.
- `icon`: (optional) Sprite path for list rendering.
- `price`: An object keyed by currency (`coins`, `rocks`, etc.).
- `type` + extra fields: Passed to item creation/effect application.

### Populating the List
Modify `UIManager.updateShopDisplay` to read from your shop inventory source:
```js
updateShopDisplay() {
  const list = this.shopItemList;
  if (!list) return;
  list.innerHTML = '';
  const items = this.currentShopItems || [];
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.innerHTML = `
      <div class="shop-item__name">${item.name}</div>
      <div class="shop-item__desc">${item.desc || ''}</div>
      <div class="shop-item__price">${item.price?.coins ?? 0}c</div>
    `;
    el.addEventListener('click', () => this.purchaseShopItem(item));
    list.appendChild(el);
  });
  this.updateShopCurrencies();
}
```
Make sure `currentShopItems` is set before calling `showShopOverlay`.

## Opening the Shop
From an NPC interaction or trigger:
```js
// Example: inside NPC interaction
uiManager.currentShopItems = myShopItems; // set current shop inventory
uiManager.showShopOverlay();
uiManager.updateShopDisplay();
```
For a custom NPC (e.g., a “Merchant”), wire the interact handler to set `currentShopItems` and open the overlay. If using `ShopGhost`, you can extend its interaction to load your items.

## Purchase Logic
Inside `purchaseShopItem(item)` (UIManager):
1) Check player currencies (coins/rocks/etc.).
2) If enough, deduct costs and apply the item effect:
   - For consumables (coffee, potions): call player methods (`player.addCoffee`, `player.heal`, etc.).
   - For ammo (rocks): `player.addRocks(amount)`.
   - For key items: update player state/progress.
3) Update HUD: coin/rock counts, health bars if healing, inventory overlay if needed.
4) Play sounds/FX and refresh the list.
5) Handle insufficient funds with a message or sound.

Adapt the effect application to the items you’re selling; you might need to add new player methods for new item types.

## Adding New Currencies
1) Add display in the shop header (HTML + CSS).
2) Extend player state to track the currency.
3) Update `updateShopCurrencies()` to show the current value.
4) Update `purchaseShopItem` to check/deduct the new currency from `item.price`.

## Integrating with EntityFactory/Items
- Ensure items you sell exist as item classes and can be instantiated or applied:
  - For inventory items: create via `entityFactory.create({ type: 'your_item', ... })` and then add to the player/inventory.
  - For instant effects: call player methods directly in `purchaseShopItem`.
- If you want to display item icons/sprites, include an `icon` field in the shop data and render `<img src="...">` in the list.

## Input & Accessibility
- UIInputController binds keys (e.g., Z to close, Enter to confirm). Click handlers handle mouse input.
- Ensure your items are focusable (tabindex) if you want keyboard navigation on the list; add appropriate ARIA labels if needed.

## Checklist
1) Ensure `#shopOverlay` exists (it’s in `index.html` by default).
2) Define your shop inventory data array.
3) Set `uiManager.currentShopItems = yourItems`, then call `showShopOverlay()` and `updateShopDisplay()`.
4) Implement/extend `purchaseShopItem` to apply effects and deduct currencies.
5) Update HUD/inventory after purchases.
6) Add an NPC or trigger to open the shop; wire its interaction to the steps above.

## Troubleshooting
- **Shop won’t open:** Verify `showShopOverlay` is called and `hidden` class is removed; ensure `UIManager.setupShopUI` ran.
- **Items not listed:** Check `currentShopItems` is set and `updateShopDisplay` is called; confirm your data shape and rendering code.
- **Purchases do nothing:** Ensure currency checks and effect application are implemented; confirm player methods exist for the item type.
- **New currency not showing:** Add HTML/CSS for the currency chip and update `updateShopCurrencies`.
