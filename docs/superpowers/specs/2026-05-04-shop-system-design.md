# Shop System Design

## Summary

Add a general NPC shop system to the JRPG vertical slice. The first pass includes item buying, item selling, starting coins, enemy coin rewards, and two starter merchants:

- Mira in the Item Shop sells consumables.
- A new Guild Quartermaster in the Guild Hall sells selected equipment.

The shop system should extend the existing item, inventory, NPC, HUD bridge, and save-state architecture without moving game rules into Phaser or Svelte components.

## Goals

- Add a reusable shop content model that can be attached to shop-capable NPCs.
- Let the player open a shop only when near a shopkeeper NPC.
- Add a dedicated paused Shop overlay with Buy and Sell tabs.
- Add player coins from a starting wallet, enemy rewards, and item selling.
- Let shops sell curated consumables and selected equipment.
- Support hybrid stock: unlimited basic consumables and finite equipment listings.
- Let players sell non-key, unequipped items.
- Persist coins and finite stock purchases in the save state.
- Keep buy, sell, price, and stock rules testable in pure TypeScript.

## Non-Goals

- No quests, reputation, discounts, or branching dialogue.
- No haggling, price formulas, or dynamic economy simulation.
- No key item buying or selling.
- No selling currently equipped gear.
- No duplicate equipment instances.
- No new exterior Equipment Shop building in this pass.
- No legacy save migration. This prototype can reject older save versions and reset to a new run.

## Architecture

The shop system should follow the existing boundary split:

- `src/lib/game/content/items.ts` adds `basePrice` for sellable consumables and equipment.
- `src/lib/game/content/shops.ts` defines shop records, stock entries, shop-to-NPC content, and price override data.
- `src/lib/game/content/maps.ts` adds `shopId` to shop-capable NPCs and adds a Guild Quartermaster NPC.
- `src/lib/game/core/shop.ts` owns pure buy, sell, price lookup, stock, and eligibility rules.
- `src/lib/game/save/save-state.ts` bumps the save schema to `version: 3` and persists wallet plus finite stock purchases.
- `src/lib/game/phaser/scenes/WorldScene.ts` tracks the nearby shop, accepts typed shop commands, applies pure shop operations, awards coins from encounters, and publishes updated HUD state.
- `src/lib/game/ui-bridge/events.ts` expands HUD state and command types for shop data and wallet state.
- `src/lib/game/ui-bridge/store.ts` exposes shop command helpers.
- `src/lib/game/GameShell.svelte` renders the dedicated Shop overlay and menu entry.

This keeps content declarative, game rules independent of Phaser and DOM, Phaser responsible for runtime proximity and world state, and Svelte responsible for overlay UI.

## Content Model

### Items

Sellable items receive a `basePrice` field. Consumables and equipment should have prices. Key items should not be sellable and do not need a price for this pass.

Initial price tuning:

| Item                   | Base price |
| ---------------------- | ---------: |
| `ember-tonic`          |          8 |
| `field-potion`         |         10 |
| `sunleaf-salve`        |         12 |
| `ruin-draught`         |         14 |
| `greater-field-potion` |         18 |
| `meadow-charm`         |         30 |
| `iron-cap`             |         35 |
| `grip-wraps`           |         35 |
| `training-sword`       |         40 |
| `traveler-vest`        |         45 |
| `ruin-blade`           |         80 |
| `stone-mail`           |         90 |
| `warden-crown`         |        100 |

The sell value is 50% of the item base price, rounded down to an integer with a minimum of 1 coin for sellable items.

### Shops

Add a shop registry with stable shop ids.

Each shop definition includes:

- stable `id`
- display `name`
- display `merchantName`
- optional description or greeting copy
- stock entries

Each stock entry includes:

- stable stock `id`
- `itemId`
- optional `buyPrice` override
- stock mode:
  - `unlimited` for basic consumables
  - `finite` with a saved quantity for equipment

Starter shops:

- `miras-item-shop`: owned by Mira in `item-shop`, sells unlimited `field-potion`, `sunleaf-salve`, and `greater-field-potion`.
- `guild-quartermaster`: owned by a new Guild Quartermaster NPC in `guild-hall`, sells finite `iron-cap`, `grip-wraps`, and `traveler-vest`.

### NPCs

Extend `MapNpc` with optional `shopId`.

NPC dialogue remains proximity-triggered. A shop-capable NPC also exposes nearby shop metadata through HUD state so the Svelte menu can show a `Shop` action while the player is nearby.

## Economy

New saves start with 30 coins so buying works before combat. Enemy victories also award coins. Selling eligible inventory is a third income source.

Enemy definitions should gain a static `coinReward` value. Initial rewards are 4 coins for each `slime-scout` and 25 coins for `ruins-warden`. When an encounter is defeated, `WorldScene` awards both XP and coins. Cleared encounters do not award coins again after save/load because the existing cleared encounter flags already prevent repeat victory rewards.

Coins are non-negative integers. Runtime operations must never allow the wallet to become negative.

## Gameplay Behavior

When the hero enters proximity of a shop-capable NPC:

1. `WorldScene` publishes the NPC dialogue/status as it does today.
2. HUD state includes `nearbyShop` with the shop id, shop name, and merchant name.
3. The settings menu shows a `Shop` action only while `nearbyShop` is present.

Opening the shop pauses gameplay through the existing overlay pause flow. Closing the shop resumes gameplay if no other overlay owns the pause.

Buying:

- subtracts the buy price from coins
- adds the bought item to inventory
- decrements finite stock when applicable
- publishes a success status

Selling:

- accepts consumables from inventory stacks
- accepts owned equipment only when it is not currently equipped
- rejects key items
- removes one sold item or one equipment id
- adds the sell value to coins
- publishes a success status

Failed operations do not mutate wallet, inventory, equipment, or stock state.

## Shop UI

Add a dedicated Shop overlay separate from Inventory.

The overlay includes:

- merchant name and shop name
- current coin total
- status feedback
- Buy tab
- Sell tab
- Close action

The Buy tab lists each stock entry with item name, description, price, and availability. Unlimited entries should read as unlimited. Finite entries should show remaining quantity and disable purchase when depleted.

The Sell tab lists only eligible sellable inventory:

- consumables with quantity and sell value
- unequipped equipment with sell value

Currently equipped equipment does not appear as sellable in this pass. Key items do not appear.

The UI should preserve the existing pattern that runtime validation stays in `WorldScene`. Buttons can be disabled for obvious cases like depleted stock or no nearby shop, but command handlers still validate and publish failure status when needed.

## HUD Bridge

Extend `HudState` with:

- `wallet: { coins: number }`
- `nearbyShop: null | { shopId: string; name: string; merchantName: string }`
- `shop: null | { shopId: string; name: string; merchantName: string; buy: HudShopBuyEntry[]; sell: HudShopSellEntry[] }`

The normalized shop view should include enough item metadata for Svelte to render without importing Phaser state.

`HudShopBuyEntry` includes:

- `stockId`
- `itemId`
- `name`
- `description`
- `price`
- `availability: { mode: 'unlimited' } | { mode: 'finite'; remaining: number }`

`HudShopSellEntry` includes:

- `itemId`
- `name`
- `description`
- `quantity`
- `kind: 'consumable' | 'equipment'`
- `price`

Extend `HudCommand` with:

- `{ type: 'open-shop'; shopId: string }`
- `{ type: 'close-shop' }`
- `{ type: 'buy-shop-item'; shopId: string; stockId: string }`
- `{ type: 'sell-inventory-item'; itemId: string }`

`WorldScene` should reject open, buy, or sell commands when the requested shop is not the current nearby shop.

## Save Model

The save schema becomes `version: 3`.

Persisted shop and economy state includes:

- `wallet.coins`
- finite stock purchases or remaining finite stock by shop id and stock id

Existing `version: 2` saves may be rejected and reset. The app is still in prototype, so no migration is required unless explicitly requested later.

Save validation should reject:

- negative or non-integer coins
- stock state for unknown shop ids
- stock state for unknown stock ids
- negative or non-integer finite quantities
- malformed wallet or shop state objects

## Error Handling

Content validation should catch:

- duplicate shop ids
- duplicate stock ids within a shop
- unknown item ids in stock
- non-sellable key item stock
- shopkeeper NPCs with unknown shop ids
- finite stock entries with invalid quantities

Runtime command handling should publish clear status messages for:

- no shop nearby
- not enough coins
- item out of stock
- item cannot be sold
- equipped item cannot be sold
- item cannot be bought

Runtime failures must leave state unchanged.

## Testing

Add or update tests for:

- item base price metadata and sellable item coverage
- shop content validity, stock ids, item ids, finite quantities, and NPC `shopId` references
- pure buy rules: price lookup, coin subtraction, inventory add, unlimited stock, finite stock decrement, and out-of-stock rejection
- pure sell rules: sell value, stack decrement, equipment removal, key item rejection, equipped item rejection, and state immutability on failure
- save `version: 3` creation, round-trip parsing, wallet validation, finite stock validation, and rejection of `version: 2`
- `WorldScene` nearby shop publishing for Mira and the Guild Quartermaster
- `WorldScene` buy and sell command effects
- `WorldScene` finite equipment stock persistence through save state
- `WorldScene` enemy coin rewards
- `GameShell.svelte` menu behavior and Shop overlay command dispatch
- Playwright coverage for opening Menu -> Shop near a merchant and verifying Buy/Sell basics

Because `GameShell.svelte` changes, run the Svelte autofixer loop before completing implementation work.

Final verification for implementation should include focused unit tests, affected scene tests, `bun run check`, and e2e coverage for the shop flow.

## Scope Guardrails

This pass is complete when:

1. A new run starts with coins.
2. Defeating enemies awards coins once.
3. Mira sells unlimited consumables.
4. The Guild Quartermaster sells finite selected equipment.
5. The player can sell non-key consumables and unequipped equipment.
6. Buying and selling update coins and inventory immediately.
7. Saving and loading preserves coins and finite equipment purchases.
8. The dedicated Shop overlay is reachable only near shop-capable NPCs.

Do not expand this pass into quests, new buildings, dynamic economy systems, item instances, key item commerce, or broad village layout changes.
