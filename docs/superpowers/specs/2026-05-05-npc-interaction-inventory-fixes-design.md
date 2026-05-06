# NPC Interaction And Inventory Fixes Design

## Summary

Improve the existing JRPG shop and NPC loop so NPC interaction is explicit, NPCs block the hero, and purchased items reliably appear in inventory. This is a focused runtime fix on top of the current shop system.

The approved interaction keys are `E`, `Space`, and `Enter`.

## Goals

- Let the player press an interact key to talk to nearby NPCs.
- Let the player press an interact key near a shopkeeper to open that shop.
- Keep the existing Menu -> Shop action as a fallback while a shopkeeper is nearby.
- Prevent the hero from walking through NPCs.
- Add regression coverage proving bought items appear in the runtime inventory and visible inventory overlay.

## Non-Goals

- No new shops, items, NPC art, quests, or dialogue branches.
- No save schema change.
- No legacy save migration.
- No replacement of the existing Svelte shop overlay.
- No removal of the Menu -> Shop action.

## Current Context

`WorldScene` already owns player movement, NPC proximity, shop state, and HUD publication. NPC proximity currently publishes dialogue and nearby shop metadata automatically. The shop overlay opens through `GameShell.svelte` by sending an `open-shop` HUD command, and purchases go through the pure `buyShopItem` rule in `src/lib/game/core/shop.ts`.

The existing shop tests verify wallet and stock changes, but the user-visible bug needs stronger coverage at the HUD and browser level: after buying, the bought item must be present in the inventory data that Svelte renders.

## Interaction Behavior

`WorldScene` should bind `E`, `Space`, and `Enter` as interact keys. Pressing any of these keys should trigger once per key press, not every frame while held.

When the hero is near a non-shop NPC, interact republishes that NPC's dialogue through the existing HUD status path.

When the hero is near a shopkeeper, interact opens the shop directly through the same validation path used by `open-shop`. Opening the shop publishes the normal open-shop HUD state so `GameShell.svelte` can render the existing Shop overlay.

NPC proximity can still publish first-contact dialogue/status when the hero enters range. The key interaction is the deliberate action for repeating dialogue or opening a shop.

## Collision Behavior

NPCs should be treated as circular blockers in `WorldScene`. The hero should not be able to overlap an NPC's body.

Movement resolution should handle X and Y independently. If a diagonal move would hit an NPC, the blocked axis stops while the unblocked axis can still move, giving a simple slide-along behavior.

Collision should use the existing player radius plus an NPC blocking radius derived from the current NPC marker size. This keeps the solution data-driven enough for starter-pack and NPC-pack sprites without adding Phaser physics for this small pass.

NPC collision should not block dialogue or shop interaction. The interaction range remains slightly larger than the collision radius.

## Inventory Fix And Guardrails

The purchase path should continue to use `buyShopItem` and `addItem`. After a successful purchase, `WorldScene` must publish HUD state from the updated wallet, stock, open shop view, and inventory.

Regression coverage should assert that after buying:

- the `WorldScene` save inventory contains the bought item,
- `HudState.inventory` contains the bought item in the correct section,
- `HudState.shop.sell` reflects the newly sellable item when applicable,
- the browser flow can buy an item, close the shop, open Inventory, and see the item or updated quantity.

If the current implementation already mutates inventory correctly, the fix should still add the missing guardrails and repair any UI refresh or state ordering problem found while writing those tests.

## Architecture

- `src/lib/game/phaser/scenes/WorldScene.ts` adds interact key tracking, explicit interaction handling, NPC collision checks, and any required HUD refresh ordering fix after purchase.
- `src/lib/game/phaser/scenes/scenes.test.ts` covers key registration, key-triggered dialogue/shop opening, collision, and HUD inventory publication after purchase.
- `src/routes/game/page.svelte.e2e.ts` adds a visible buy-to-inventory regression.
- `src/lib/game/GameShell.svelte` should only change if the browser regression proves the overlay is not reacting to updated HUD state.

Pure shop and inventory rules should stay in `src/lib/game/core/shop.ts` and `src/lib/game/core/inventory.ts`. Svelte should not import Phaser state or duplicate game rules.

## Testing

Focused verification:

```sh
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
bun run test:e2e -- --grep "shop"
```

Completion verification:

```sh
bun run check
bun run test
```

If `bun run check` fails because generated Cloudflare worker types are stale, run `bun run gen` and re-run the check.
