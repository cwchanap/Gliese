# HPA-839 — Story-gear auto-equip and Mira shop implementation plan

**Design:** [HPA-839 story-gear/shop design](../specs/2026-11-20-hpa-839-story-gear-shop-design.md)  
**Linear:** https://linear.app/cwchanap/issue/HPA-839/equip-story-gear-automatically-and-fix-the-herb-shops-prices-and  
**Base reviewed:** `main` `ea5d5407a0b9bb777a0d1316537fd5cd3578d3b5`; refresh it before coding.  
**PR policy:** **One ticket, one PR.** Use this same draft PR for implementation, tests, review fixes and acceptance evidence. Do not create a second implementation PR.  
**Current state:** Design and plan only. No gameplay code, test execution, browser visual check, or screenshot evidence has been completed.

## Intended result

- Grik wears his Ancestral Amulet and Practice Spear immediately after Old Mott/Oren story rewards; reporting the Boar King to Borak equips Hunter's Knife and leaves the spear in the bag.
- Other newly acquired **non-shop** gear auto-equips only for empty slots or Pareto-dominant upgrades; purchased gear stays in the bag until manually equipped.
- Mira's Sunleaf Salve is 6 coins to buy, 3 to sell, and still heals 6 HP.
- Stock tooltips appear in the stock area, away from the detail action, with no blocked Buy at 1280×720 or 640×360.
- Localized reward status identifies the equipped item without a new toast/notification system.

## Dependencies and constraints

- HPA-836 and HPA-840 are already done; preserve existing keyboard menu shortcuts, shop focus lattice and compact responsive layout.
- HPA-837 (battle mechanics) is explicitly a separate no-PR design ticket; no combat balancing in this PR.
- HPA-704 (new item icons) is a separate art-only ticket; do not change art/SFX in this PR.
- HPA-694 (legacy painted maps / Git LFS / CI E2E restoration) is a separate infrastructure ticket. **Do not skip required MCP E2E acceptance if current LFS availability blocks it**; provide truthful evidence or leave that criterion open.
- Do not alter the save shape or provide save migration; no backward-compatibility implementation is needed. Existing saves should not have their intentionally unworn gear auto-equipped on load.
- Keep architecture pure and small: one helper, existing calls, existing UI, existing localization and test suites. Do not create a new inventory/reward service.

## Suggested file ownership

| File | Minimal planned change |
| --- | --- |
| `src/lib/game/core/equipment.ts` | Add pure helper for non-shop grants using existing `addItem` and `equipItem`; compare effective stats in the same slot (empty or strict non-regression in ATK/DEF/max HP). Preserve manual `equipItem`. |
| `src/lib/game/core/equipment.test.ts` | Cases for each slot, strict upgrades, ties, trade-offs, duplicate/invalid input, no auto-equip for non-equipment, and bag retention. |
| `src/lib/game/phaser/scenes/WorldScene.ts` | Use helper in quest rewards and direct pickups; preserve autosaves; publish named auto-equip status after rewards rather than immediately overwriting it. Do **not** call it in `buyOpenShopItem`. |
| `src/lib/game/core/battle.ts` | Use same helper in `applyBattleVictory` for drops and quest rewards, and `applyBattleDefeat` for any scripted quest reward; return upgraded worn state in save. |
| `src/lib/game/core/battle.test.ts`, `src/lib/game/phaser/scenes/scenes.test.ts` | Persisted regression of battle-return rewards, NPC quest grants, direct pickups, and save/HUD state. Prefer extending existing fixtures. |
| `src/lib/game/content/items.ts` | Change only Sunleaf Salve base price from 12 to 6. |
| `src/lib/game/core/shop.test.ts` | Price, healing amount and half-price sale; ensure unchanged potion prices and bought equipment stays manual. |
| `src/lib/game/ui/ShopScreen.svelte` | Re-anchor existing Buy/Sell tooltip to the stock column with bounded width and existing pointer-events/focus behavior; no JS positioning library. |
| `src/lib/game/ui/ShopScreen.svelte.spec.ts` | Browser geometry, actual clickable Buy/Sell, stock/tooltip bounds at desktop and compact sizes; keyboard focus navigation regression. |
| `src/lib/game/i18n/messages/{en,ja,zh-Hant}.ts` | Add only the needed named auto-equip status message in all three locales. |
| `tests/e2e/game.e2e.ts` (and existing helpers if needed) | Extend saved real-game prologue/merchant paths for MCP-run E2E acceptance and screenshot evidence. |

Adjust file list only to reflect actual ownership found after rebasing on latest main. No file duplication/new abstraction without a demonstrated need.

## Implementation sequence (all within this PR)

### Step 0 — refresh and pin observable failures

1. Recheck HPA-839 description/comments and `main` before code changes; confirm no other PR already implemented any part of the task.
2. Inspect `core/battle.ts` alongside `WorldScene.ts`; validate all active item-grant call sites rather than relying on `WorldScene.awardEncounterDrops`, which may not be on the active battle-result path.
3. Extend existing unit/browser tests to fail for unworn Mott/Oren/Borak rewards, non-dominant gear overwrite, 12-coin salve, and the tooltip rectangle overlapping the Buy rectangle.
4. Preserve the HPA-839 attached **failure screenshot** as a reference. There is **no approved target mockup**; acceptance must use real screenshots of the corrected interface.

### Step 1 — pure grant policy and tests

1. Implement one small `grantNonShopItem` helper, returning new inventory, new equipment, and the auto-equipped item ID (if any). Reuse `addItem`, `equipItem`, and `previewEquipmentSwap`/`deriveEffectiveStats`; avoid duplicating stat math.
2. Strict-improvement rule: only equip if slot empty, or `after.attack >= before.attack`, `after.defense >= before.defense`, `after.maxHp >= before.maxHp` and at least one of these is greater. Zero modifiers count as zero. Reject ties and sidegrades.
3. Keep original weapon in the bag on replacement. Do not auto-equip an already-owned duplicate or when loading old saves. Avoid accidentally resetting current HP to the new maximum.
4. Add tests for the specific amulet → spear → knife journey plus other slots and downgrade/trade-off cases, with inventory and equipment asserts.

### Step 2 — active reward paths, status and persistence

1. Replace direct non-shop `addItem` calls in `WorldScene.applyQuestRewards` and `WorldScene.tryCollectPickup` with helper calls. Ensure the final quest HUD publish uses a named `status.autoEquippedItem` if a reward was worn, instead of overwriting the message with the fallback status; existing journal/dialogue still signals quest completion.
2. Replace only the **active** battle-grant operations in `core/battle.ts::applyBattleVictory` (encounter drops and quest completion items) and `::applyBattleDefeat` (scripted defeat rewards), setting returned `saveState.equipment` as well as inventory. Preserve victory/defeat/flee battle summaries, coin/XP rules, existing autosave timing and HP clamping.
3. Use existing item-ID based localization to resolve `status.autoEquippedItem` per locale. For battle rewards, show the equipped-item message on return/after summary where possible without suppressing a higher-priority story/terminal cue or adding a message queue; assert equipped state regardless.
4. Keep the shop buy path unchanged so shop equipment does not auto-equip. Add scene/test fixtures that reload an equipped save and check no unintended change to a manually unequipped save.

### Step 3 — price from the canonical item definition

1. Set `sunleaf-salve.basePrice = 6`. Do not edit Mira's stock entry to carry a second hardcoded price.
2. Test buy price 6, sell price 3, heal 6, and unchanged Field/Greater prices 10/18, including wallet/inventory after an actual transaction.
3. Keep forge/quartermaster stock and equipment-preview purchase behavior unchanged.

### Step 4 — tooltip geometry, no redesign

1. Move the existing tooltip node(s) inside the main/stock column, set an appropriate positioned ancestor, and clamp tooltip width to available column width. Retain current item text, Buy/Sell behavior, focus handling and `pointer-events:none`.
2. Test real DOM rectangles: tooltip fully contained by shop/stock bounds and **zero intersection** with action button at 1280×720 and 640×360. Ensure selected action is actually focusable, visible and clickable, not merely pointer-through.
3. Check en/ja/zh-Hant text wrapping and focus navigation without changing the existing responsive breakpoints unless a measured case requires a tiny targeted fix.

### Step 5 — end-to-end acceptance **through MCP**

Reuse the committed Playwright browser journeys and execute the same scenarios through the available MCP browser/shared-CDP flow documented by HPA-840. For screenshots and event inspection, the MCP and test harness must refer to the **same live Chromium target**, rather than a separate mocked screenshot session.

**Scenario A — New Run rewards and first wolves:** Run the game from title through Old Mott and Oren. Verify named translated auto-equip statuses at each grant; no user Gear action; before the first wolf fight the effective HUD is ATK 4 / DEF 1 and worn slots contain amulet + spear. Verify current HP was not silently refilled when max HP grew. Screenshot the HUD/Bag after grants.

**Scenario B — Boar King return and Borak:** Reach the report interaction (a committed prologue checkpoint fixture may shorten travel, but it must be an in-game interaction). Verify Hunter's Knife becomes the weapon; Practice Spear remains owned in the bag and unequipped; Save/Continue preserves both. Screenshot the worn/bag view.

**Scenario C — Mira's shop economy:** Visit Mira in the running game. Read the Sunleaf Salve price (6); buy it and assert wallet -6 and one added salve, 6 HP heal when HP is below max; sell it for 3 where stock/sell UI permits. Check Field/Greater price displays remain 10/18 and an equipment purchase does not auto-equip.

**Scenario D — tooltip and Buy usability:** For each buy/sell stock row, hover or focus a tile and assert tooltip and action rectangles never overlap. For 1280×720 and 640×360 capture screenshots showing the tooltip and fully visible Buy action. Assert action is hit-testable, activated by actual pointer or keyboard, and purchase/sale succeeds. Repeat localization checks for en, ja and zh-Hant (avoid a combinatorial matrix; spot check content and geometry). Compare screenshots to the Linear failure image and current shop layout; reject visible clipping, hover obstruction or misplaced tooltip.

The existing suite can use navigation helpers/seeded saves where the test must start at a late quest; it must still exercise the **running real-game event**, not only invoke a pure helper or prepopulate a finished state. A web Chromium E2E run is sufficient for a cross-platform app because this ticket makes no native-specific change. There is **no human sign-off criterion**.

### Step 6 — quality and PR evidence

1. Run targeted unit/browser component tests, then `bun run test:unit -- --run`, `bun run check`, `bun run lint`, `bun run build`; fix regressions on this PR.
2. Execute persisted E2E scenarios **via MCP** and attach logs/URLs and 1280×720 + 640×360 screenshots to PR body or a small evidence note. A stand-alone CLI Playwright run does not count as MCP acceptance.
3. If Git LFS restrictions leave the real-game assets unavailable, report the E2E criterion as blocked rather than claiming a pass. Keep HPA-694 as an independent ticket, no LFS migration here.
4. Recheck latest `main`, resolve valid PR review comments on this same branch, and keep the PR draft until all acceptance gates pass.

## End-to-end acceptance checklist (must be checked by tests/evidence, not humans)

- [ ] New Run: Mott amulet and Oren spear auto-equip, first wolf starts ATK 4 / DEF 1, status includes localized item names, no Gear action.
- [ ] Borak reporting: knife worn, spear still in bag, persisted after save/reload, no duplicate grant or unintended healing.
- [ ] Drops and pickups: true newly received stronger equipment auto-equips; non-dominant items/key items/consumables do not; purchased equipment remains unequipped until manual selection.
- [ ] Mira: salve buy 6, sell 3, heal 6; Field/Greater buy 10/18; wallet and inventory updates verified in running game.
- [ ] Shop E2E via MCP: at 1280×720 and 640×360 tooltip stays inside shop/stock area, never overlaps Buy/Sell, and actual Buy/Sell actions are reachable and succeed; en/ja/zh-Hant names and tooltips verified.
- [ ] Visual checks with screenshots at both sizes (no UI mockup supplied), compared with issue's failure screenshot; no clipped or obscured actionable UI.
- [ ] Unit/component/full quality checks and reproducible MCP-driven end-to-end browser tests pass; test commands and screenshot references recorded in PR.
- [ ] Exactly one PR, no art/SFX or unrelated battle balance work, no native acceptance unless a platform-specific change is introduced.

**Status as of initial draft:** all boxes intentionally unchecked. This PR currently contains only the design specification and implementation plan.
