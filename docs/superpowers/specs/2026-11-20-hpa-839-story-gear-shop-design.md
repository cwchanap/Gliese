# HPA-839 — Auto-equip non-shop rewards and repair Mira's shop (design)

**Linear:** https://linear.app/cwchanap/issue/HPA-839/equip-story-gear-automatically-and-fix-the-herb-shops-prices-and  
**Base inspected:** Gliese `main` at `ea5d5407a0b9bb777a0d1316537fd5cd3578d3b5` (2026-11-20 Pacific). Recheck before implementation.  
**Delivery:** Exactly one PR for design, implementation, tests and MCP acceptance; documentation-only until implementation is added to this same draft.  
**Review reconciliation:** [PR #69 design review](https://github.com/cwchanap/Gliese/pull/69#pullrequestreview-6003780489) (2026-11-21). Accepted the dialogue-visibility fix, batched helper, existing i18n/test reuse, and reduced redundant checks. Retained the issue's explicit empty-slot rule; also cover Oren's *Shop* dialogue exit.
**Visual source:** HPA-839 has UAT screenshots showing the *failure*, not an approved target mockup. Compare new 1280×720 and 640×360 screenshots against the working Shop layout and the reported failure; do not invent a new UI design.

## Problem and expected player experience

1. Old Mott awards the Ancestral Amulet, Oren awards the Practice Spear, and Borak awards the Hunter's Knife after the Boar King. All currently enter the bag but remain unworn. A new run should equip the first two automatically and replace the spear with the superior knife, while keeping the spear owned.
2. Mira sells a 6-HP Sunleaf Salve for 12 coins, worse than the 8-HP Field Potion at 10 coins. Salve should cost 6 coins, with the existing half-price resale rule.
3. Hover/focus tooltips on stock tiles are anchored to the shop's bottom-right, over the selected-item detail/Buy action. Tooltip position must never visually obscure the Buy button, including the compact 640×360 layout from HPA-840.

The visible reward status must identify the newly equipped item in en/ja/zh-Hant. A concise localized `Equipped {{itemName}}` is sufficient; do not introduce a stat-delta formatting system just to mirror an example in the ticket. The Gear screen already shows derived stats.

## Current code boundaries (verified on main)

- `content/quests.ts`: `talk-to-mott` → `ancestral-amulet` (accessory: +2 max HP, +1 DEF); `collect-practice-spear` → `practice-spear` (weapon: +1 ATK); `report-boar-king` → `hunters-knife` (weapon: +4 ATK).
- `core/inventory.ts`: `addItem` owns item acquisition, with `inventory.equipment` containing all owned gear IDs. It deduplicates equipment IDs. Worn slots live separately in `EquipmentState`.
- `core/equipment.ts`: `equipItem` intentionally permits a manual replacement. **Do not change its manual policy.** `core/stats.ts` already derives the actual before/after ATK, DEF and max HP.
- `WorldScene.ts`: non-shop quest rewards pass through `applyQuestRewards`; pickups through `tryCollectPickup`; shop purchases through `buyOpenShopItem`. Manual equip uses `equipInventoryItem`. Quest/scene restart and save paths already persist equipment.
- **Actual battle path:** `core/battle.ts::applyBattleVictory` adds encounter drops **and** battle-completion quest items to the returned save; `applyBattleDefeat` can grant quest items. `WorldScene.create` loads that returned save. Do not wire only `WorldScene.awardEncounterDrops` and miss the real battle flow.
- `content/items.ts` owns `sunleaf-salve.basePrice`; Mira's shop stock uses the item price by default; `getSellValue` owns half-price resale.
- `ui/ShopScreen.svelte`: `.shop-tooltip` is absolute to `.shop-screen`, with `right:1.9rem;bottom:1.4rem;z-index:20;pointer-events:none`. The selected Buy action is `.shop-detail-action` in `.shop-detail`. HPA-840 already established a compact three-column Shop layout for short landscape; reuse it.

## Design decision 1 — One small, pure non-shop grant path

Add one pure `grantItems({ inventory, equipment }, items)` helper alongside the existing core equipment code. Input items use `{ itemId, quantity }`; output is `{ inventory, equipment, equipped: string[] }`, ordered by actual equips, so the field message may name the last equipped item. Compose `addItem`, `equipItem`, and `previewEquipmentSwap` with a constant zeroed base (only additive gear modifiers are compared). No event bus, new persistence fields, per-source helper copy, rewards service or HUD command.

Rules (preserve the Linear ticket's explicit empty-slot behavior):

1. Invalid item/quantity or equipment already owned: do not trigger an auto-equip. Non-equipment grants only change inventory.
2. For a **newly owned** equipment ID, an **empty slot always equips**. The review proposed treating empty as zero modifiers in the strict-upgrade test; that would reject a legitimate zero-stat starter item and is not equivalent to the ticket. Do not change the requirement in anticipation of hypothetical negative-stat gear.
3. For an occupied slot, preview the swap and equip only when the new loadout's ATK, DEF, and max HP are each >= their previous values and at least one is strictly greater. Ties and stat trade-offs do not auto-replace. Do not use price/rarity to rank.
4. Replaced equipment stays owned in `inventory.equipment`; the returned worn slot changes. Ordinary shop purchases remain manual (`WorldScene.buyOpenShopItem` and `core/shop.buyShopItem` unchanged), and existing manual `equipItem` keeps its sidegrade-permitted policy.

Use this shared helper for **active non-shop** item grants in `WorldScene.applyQuestRewards` and `tryCollectPickup`, plus battle victory drops/quest rewards and scripted defeat rewards in `core/battle.ts`. The old `WorldScene.awardEncounterDrops` method is unused; remove it and its now-unused imports instead of mistakenly wiring the inactive path. Today no battle enemy drops gear and no battle objective awards it, but one pure `battle.test.ts` fixture with an equipment drop proves future grants share the rule. There is **no new battle-result equipped-status policy or test**; the existing battle summary displays drop items.

Keep the save schema and autosave/checkpoint timing. Do **not** auto-equip all unworn items on Continue/load; intentional manual choices must survive. Dominant swaps do not lower max HP, so no additional HP-clamp step is needed. Verify that growing the max HP does **not** refill current HP.

### Visible status after dialogue (main review defect)

The three story equipment grants are **talk-to-NPC objectives**. `startNearbyNpcStoryDialogue` sets `dialogueSession` *before* `applyQuestProgress`, and `GameShell` unmounts `FieldHud` while a dialogue is open. Simply putting `status.equippedItem` into `HudState.status` at reward time is invisible; dialogue advance and close overwrite/clear it. **Testing only the HUD state would be a false positive.**

Reuse and parameterize the existing `status.equippedItem` key (`Equipped {{itemName}}`) and manual-equip publisher instead of creating `status.autoEquippedItem`. Keep item ID params so names are resolved in the active en/ja/zh-Hant locale.

Store at most one `pendingFieldStatus: WorldSceneStatus | null` when an NPC dialogue grants an equipped item. Introduce one `endDialogue()` path for explicit dialogue close, last-line advance, and the choice `close` intent; after unmounting the dialogue, publish the pending named status and clear it. **Oren's NPC dialogue also has a `shop` choice** (`story/beats/prologue/village.md`): successful shop opening must preserve the pending message, then the shop close path publishes it once the field is visible. A direct pickup with no dialogue publishes immediately. Preserve existing error/quest-completion notices when no item was equipped. Do not turn this into a notification queue or add timers.

Acceptance must assert the **rendered `.heroic-field-status` text in the live page once the dialogue (or Oren's shop) closes**, rather than inspecting a hidden `HudState.status`. Recheck story-gate restart behavior so the status is not immediately cleared before the rendered assertion.

## Design decision 2 — One price source, no shop balancing system

- Change only `sunleaf-salve.basePrice` from 12 to 6 in `content/items.ts`; healing stays 6 HP. The shop already uses the default price; `getSellValue` continues deriving 3 coins. Update the existing `expectedBasePrices` table in `content/items.test.ts` (12 → 6), rather than duplicating those checks in `shop.test.ts`.
- Keep Field Potion 10 coins/8 HP and Greater Field Potion 18 coins/14 HP. No stock changes or per-shop overrides. The salve becomes the least expensive recovery and best HP/coin in Mira's three-item lineup (6/6=1.0, 8/10=0.8, 14/18≈0.78).

## Design decision 3 — Place tooltips in the stock column, away from Buy

Keep the existing tooltip text, triggers, focus behavior and `pointer-events:none`. Move the tooltip render placement into the existing stock/main column and position it relative to `.shop-main` (not `.shop-screen`), constrained to that column's bounds. It should open toward the stock/left side, **opposite the detail column's Buy button**. Clamp tooltip width and wrap text within the container; retain the current three-column short-landscape and stacked portrait layouts. Do not add a floating-position library, document-level portal, JS mouse tracking, or new breakpoints unless a measured regression proves necessary.

Because `.shop-main` and `.shop-detail` are distinct layout regions, the tooltip's actual bounding rectangle must not overlap the Buy action. In compact layouts, allow the tooltip to sit over stock content while never blocking pointer activation (existing `pointer-events:none`). In stacked layouts, keep it inside the stock panel, above the detail action. Confirm with measured DOM rectangles, not merely `pointer-events:none`.

## Primary risk and test evidence

The primary risk is **invisible success**: a reward is equipped in the save/HUD but the player never sees its named status because the dialogue masks it. The new E2E must check **visible FieldHud after the actual dialogue or shop closes**. Missing Git LFS art is a separate infrastructure limitation: if it prevents running real-game MCP acceptance, leave that criterion unresolved rather than replacing it with mocked tests.

## Out of scope / linked tickets

- HPA-704 owns drawing the five reused item icons as a separate **art-only** task; do not generate PNGs/SFX here.
- HPA-837 owns battle pacing; no attack timing, enemy HP/damage, or Boar King rebalance.
- HPA-694 owns removal of Git LFS and restoration of the main CI e2e gate. Do not fold its refactor or assets migration into this ticket.
- No new equipment slots, new items, shop stock expansion, redesigned Shop/Gear screens, data migration, or extra PR.

## Acceptance contract (automated, end to end)

All checks belong to **this same PR**. Implementation and test execution have **not** happened in this documentation-only revision.

1. **New Run / Mott–Oren, via MCP-driven real browser E2E:** Extend `tests/e2e/game.e2e.ts`'s existing Oren walk (around line 13440). Receive the amulet and spear, exit both real dialogues, and assert the **visible** `.heroic-field-status` reads the localized equipped name after close (for Oren, also exercise *Shop → close*). Without opening Gear, the first wolf fight has ATK **4** and DEF **1**; worn IDs are `ancestral-amulet` and `practice-spear`. New max HP must not refill current HP.
2. **Borak reporting, via MCP-driven real browser E2E:** Finish the in-game reward interaction (a late checkpoint fixture may shorten travel), verify the **rendered** post-dialogue Hunter's Knife message, knife worn, spear still owned and unworn, and correct state after Save/Continue. No auto-equip on old save load.
3. **Pure equipment/battle regressions:** Extend `core/equipment.test.ts` for empty slots, strict improvements, ties, mixed trade-offs, duplicate/invalid, consumable/key, amulet → spear → knife, and retention in bag. Extend `core/battle.test.ts` once with a synthetic equipment drop; do not add a battle UI-status test for content that does not exist. Confirm shop purchases remain manual.
4. **Mira economy + tooltip, one combined MCP E2E scenario:** At **1280×720 and 640×360**, read Salve price **6**, buy for 6 and verify wallet/inventory, heal **6**, sell for **3**, and confirm Field/Greater prices **10/18**. Hover/focus Buy/Sell tiles, measure no rectangle intersection with `.shop-detail-action`, and verify the action can really be clicked/activated. Use `ShopScreen.svelte.spec.ts`'s existing parametrized viewport test (around line 424) for reusable tooltip geometry checks. Capture screenshots at both sizes, compare with the Linear failure screenshot (no approved mockup), and check en/ja/zh-Hant wrapping/strings.
5. **Quality and independence:** `bun run test:unit -- --run`, `bun run check`, `bun run lint`, `bun run build` pass. Execute persisted browser E2E using **MCP** (shared CDP where applicable), attach logs and screenshots. CLI-only tests and mocked component snapshots do not replace real-game MCP acceptance. Web/Chromium platform is sufficient; no platform-specific code in scope.

Keep art/SFX (HPA-704), battle pacing (HPA-837), and Git LFS/CI cleanup (HPA-694) separate. One ticket → one PR.
