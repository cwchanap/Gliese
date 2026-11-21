# HPA-839 — Auto-equip non-shop rewards and repair Mira's shop (design)

**Linear:** https://linear.app/cwchanap/issue/HPA-839/equip-story-gear-automatically-and-fix-the-herb-shops-prices-and  
**Base inspected:** Gliese `main` at `ea5d5407a0b9bb777a0d1316537fd5cd3578d3b5` (2026-11-20 Pacific). Recheck before implementation.  
**Delivery:** Exactly one PR for design, implementation, tests and MCP acceptance; this first commit adds documents only.  
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

Add a pure, directly testable helper to the existing core equipment/inventory area, e.g. `grantNonShopItem({inventory,equipment,itemId,quantity})`. It reuses `addItem` and existing equipment/stat helpers; returns the updated inventory, updated equipment, and the auto-equipped item ID when something was actually equipped. Do not add a generic reward event bus, new persistence fields, equipment tiers, an item-acquisition service, or a new UI command.

Auto-equip rules, in order:

1. An invalid item/quantity or unchanged equipment ownership results in no auto-equip action.
2. Consumable and key item grants never modify worn slots.
3. For a genuinely newly owned equipment ID: if its slot is empty, equip it.
4. If its slot is occupied, preview replacing the old item using existing effective-stat calculation. Equip **only when** new ATK, DEF and max HP are each >= the old values, **and at least one is strictly greater**. Ties and mixed trade-offs are not upgrades. Do not compare base price or item rarity.
5. Replaced gear stays in `inventory.equipment`; the save's worn slot points to the replacement. A returned `autoEquippedItemId` is a lightweight status cue, not a persisted event queue.
6. Never auto-equip from `buyOpenShopItem` / `core/shop.buyShopItem`. Preserve the current equipment-swap preview and manual action for purchases. Manual `equipItem` remains user-controlled even when the replacement is a statistical sidegrade.

Use the helper in all **active** non-shop acquisition paths:

- `WorldScene.applyQuestRewards`: quests awarded while talking, inspecting, or collecting.
- `WorldScene.tryCollectPickup`: direct map/story pickups.
- `core/battle.ts`: victorious drops and quest rewards, plus scripted-defeat quest rewards. Keep the helper pure so the save-state transformation can use it without importing Phaser.
- Any existing active non-shop drop path discovered during implementation; avoid modifying unused methods as a workaround.

Keep the current save schema and autosave/checkpoint timing. New rewards are equipped when received; **do not** retroactively auto-equip every unworn item on Continue/load, which would override an intentional manual choice. Clamp HP if needed against updated max HP; an increased HP ceiling must not silently refill HP.

### Status precedence

`WorldScene.applyQuestProgress` currently publishes the quest-complete/fallback status immediately after granting items. Return the auto-equipped ID from the grant step and publish one named `status.autoEquippedItem` when an auto-equip happens, rather than publishing a transient line that gets immediately overwritten by quest completion. The quest journal and scripted dialogue remain the source of quest-completion feedback. Use existing item-name parameter resolution, so names remain localized after locale changes.

For battle-applied grants, surface the named result on return to the field / after the existing battle summary without replacing the summary or adding a second overlay. If the reward is granted alongside a higher-priority terminal story cue, preserve that story cue and expose equipped state through HUD/Gear; document this priority and test it.

## Design decision 2 — One price source, no shop balancing system

- Change only `sunleaf-salve.basePrice` from 12 to 6 in `content/items.ts`; healing stays 6 HP. The shop already uses the default price; `getSellValue` continues deriving 3 coins.
- Keep Field Potion 10 coins/8 HP and Greater Field Potion 18 coins/14 HP. No stock changes or per-shop overrides. The salve becomes the least expensive recovery and best HP/coin in Mira's three-item lineup (6/6=1.0, 8/10=0.8, 14/18≈0.78).

## Design decision 3 — Place tooltips in the stock column, away from Buy

Keep the existing tooltip text, triggers, focus behavior and `pointer-events:none`. Move the tooltip render placement into the existing stock/main column and position it relative to `.shop-main` (not `.shop-screen`), constrained to that column's bounds. It should open toward the stock/left side, **opposite the detail column's Buy button**. Clamp tooltip width and wrap text within the container; retain the current three-column short-landscape and stacked portrait layouts. Do not add a floating-position library, document-level portal, JS mouse tracking, or new breakpoints unless a measured regression proves necessary.

Because `.shop-main` and `.shop-detail` are distinct layout regions, the tooltip's actual bounding rectangle must not overlap the Buy action. In compact layouts, allow the tooltip to sit over stock content while never blocking pointer activation (existing `pointer-events:none`). In stacked layouts, keep it inside the stock panel, above the detail action. Confirm with measured DOM rectangles, not merely `pointer-events:none`.

## Out of scope / linked tickets

- HPA-704 owns drawing the five reused item icons as a separate **art-only** task; do not generate PNGs/SFX here.
- HPA-837 owns battle pacing; no attack timing, enemy HP/damage, or Boar King rebalance.
- HPA-694 owns removal of Git LFS and restoration of the main CI e2e gate. Do not fold its refactor or assets migration into this ticket.
- No new equipment slots, new items, shop stock expansion, redesigned Shop/Gear screens, data migration, or extra PR.

## Acceptance contract (automated, end to end)

Implementation is done only when all of the following are evidenced in this *same PR*:

1. **New Run story path, via MCP-driven browser E2E:** Receive amulet from Old Mott and spear from Oren; without opening Gear, the first wolf encounter starts at **ATK 4 / DEF 1** (base ATK 3 / DEF 0). Check both worn IDs and localized named status at the award events.
2. **Boar King reporting path, via MCP-driven browser E2E:** After reporting to Borak, Hunter's Knife is worn, Practice Spear remains owned but unworn, and both persist across Save/Continue. A checkpoint fixture is acceptable for the long journey only if the test actually performs the reward interaction in the running game.
3. **Acquisition boundary:** unit tests cover empty slots, strict upgrades, ties, mixed stat trade-offs, invalid/duplicate items, pickups, drops, scripted battle rewards, save/return and manual shop purchases remaining unworn. No retroactive equip on Continue.
4. **Shop pricing, via live-game E2E:** Mira displays Sunleaf Salve at **6 coins**; purchasing deducts 6 and adds a 6-HP consumable; selling yields **3**. Field and Greater potions remain 10/18 respectively.
5. **Shop visual/interaction, via MCP-driven browser E2E:** At **1280×720 and 640×360** (English and localized spot checks), hovering/focusing each Buy/Sell stock item shows a tooltip inside the shop frame, no intersection with the visible Buy/Sell action, and action remains hit-testable, clickable and successful. Include **screenshots at both sizes**, review layout against the Linear failure screenshot / current Shop design, verify no clipped text, inaccessible Buy, or misplaced overlay. There is no approved target mockup.
6. **Localized strings:** en, ja and zh-Hant resolve every newly added status; no raw template keys/parameters appear.
7. **Quality gates:** `bun run test:unit -- --run`, `bun run check`, `bun run lint`, `bun run build`, and focused Playwright all pass. Run the saved, deterministic E2E scenarios **through MCP** and attach reproducible screenshots/logs to this PR. A CLI-only pass is useful but is **not** MCP acceptance; Chromium web acceptance suffices because no platform-specific code changes.

If missing LFS assets prevent a real game E2E run, record that as an **unmet acceptance criterion** rather than silently substituting mocked component tests. HPA-694 remains a separate follow-up.
