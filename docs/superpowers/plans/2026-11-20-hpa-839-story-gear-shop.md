# HPA-839 — Story gear auto-equip and Mira shop implementation plan

**Design:** [HPA-839 design spec](../specs/2026-11-20-hpa-839-story-gear-shop-design.md)  
**Linear:** https://linear.app/cwchanap/issue/HPA-839/equip-story-gear-automatically-and-fix-the-herb-shops-prices-and  
**Draft PR:** https://github.com/cwchanap/Gliese/pull/69  
**Base inspected:** `main` at `ea5d5407a0b9bb777a0d1316537fd5cd3578d3b5`, unchanged at the 2026-11-21 review. Recheck before implementation.  
**Reviews addressed:** [Pass 1 (F1–F7)](https://github.com/cwchanap/Gliese/pull/69#pullrequestreview-6003780489) and [pass 2 (branch, prose, layout, battle)](https://github.com/cwchanap/Gliese/pull/69#pullrequestreview-6003862939).  
**One ticket, one PR:** Implement, test, review and attach evidence on **this same draft PR**. No second PR.  
**Current status:** Documentation-only review revision. No gameplay/UI code has changed and tests/MCP screenshots have not been run.

## Scope and constraints

- Automatically equip newly acquired **non-shop** gear when its slot is empty or the new item improves at least one of ATK/DEF/max HP without lowering the others. Keep replaced gear in the bag. **Shop purchases and manual equips keep their current behavior.**
- Old Mott's Ancestral Amulet, Oren's Practice Spear and Borak's Hunter's Knife must work through real quest dialogue. Salve buy price becomes 6 coins (6 HP restored; 3-coin sell value). Shop tooltip stays in the stock/main region and away from Buy/Sell actions.
- Keep existing Svelte 5 / Phaser 4 architecture, save schema, localized HUD, Shop compact layout and keyboard/pad focus. Correct only Oren's contradictory single story dialogue line; otherwise do not expand the narrative. Do not add a notification queue, item/reward service, floating tooltip engine, migration or timer.
- HPA-704 handles artwork, HPA-837 handles combat pacing, and HPA-694 handles LFS and CI-E2E restoration independently. Do not fold their work into this ticket.

## Review reconciliation

| Finding | Decision and reason |
| --- | --- |
| F1 — Named status hidden behind NPC dialogue | **Accept:** a single nullable pending field status shown after each actual reward dialogue closes. E2E checks **rendered FieldHud**, not only `HudState.status`. |
| F2 — Battle-return status for nonexistent equipment loot | **Accept:** keep cheap core battle equip-grant wiring and one synthetic gear-drop regression; remove battle-only UI-status policy and priority tests. Existing BattleSummary lists drops. |
| F3 — Batch grant helper, no stat base, no clamp | **Mostly accept:** use a pure `grantItems(state, items)` helper, existing item/stats functions and zero base for additive stat comparison. **Reject only the proposed empty-slot equivalence:** HPA-839 explicitly auto-equips when a slot is empty, even if a hypothetical item has no stat advantage. A single strict dominance rule would silently change that requirement. Do not introduce negative-stat edge-case machinery. |
| F4 — Extra i18n key | **Accept:** parameterize the existing `status.equippedItem` key in en/ja/zh-Hant. Manual equip and automatic equip share it. |
| F5 — Unused `WorldScene.awardEncounterDrops` | **Accept:** remove the dead method and its unused import; `core/battle.ts` is the live battle reward path. |
| F6 — Duplicate checks and unnamed fixtures | **Accept:** edit `content/items.test.ts`'s `expectedBasePrices` row instead of duplicating shop price unit tests; reuse existing Oren E2E (~13440) and Shop browser viewport spec (~424); fold Mira purchase/sale into the tooltip MCP scenario. |
| F7 — Missing visibility risk | **Accept:** main risk is a green hidden-HUD assertion that players never see. Explicit rendered-status E2E for Mott, Oren and Borak is mandatory. LFS limitations are a separate possible blocker, not the central design risk. |


### Pass 2 — new review items

The [second design review](https://github.com/cwchanap/Gliese/pull/69#pullrequestreview-6003862939) was checked against `story/beats/prologue/proving-morning.md`, the compiled browser catalog, `ShopScreen.svelte`, and `core/battle.ts`:

1. **Accept — unreachable Shop path:** Oren's `objective:collect-practice-spear` dialogue has no choices; `branch: always` is a later shop encounter. Remove the `closeOpenShop()` override and all Shop → close reward acceptance.
2. **Accept — contradictory tutorial line:** Oren currently says *"Open your pack and equip it before you leave."* This directly contradicts the feature. **Scope a single-line prose correction within this PR**, rather than deferring a visible inconsistency or redesigning the story. Proposed: *"Ha! Grow into it. Keep it ready when you leave. A spear in a bag has never killed anything."* Run normal story generation and strict story validation. Prose is currently English-only (separate from localized UI status).
3. **Accept — tooltip geometry:** Add a positioned stock column and width constraint so the existing 18rem tooltip cannot overflow a ~272px column at 640×360; use measured DOM geometry.
4. **Accept — scripted-loss max HP ordering:** Derive restored HP from the new post-grant equipment in `applyBattleDefeat`, not the old equipment.

These are refinements to the same one-PR plan, with **no new tasks**.

## Minimal file ownership

| File | Change |
| --- | --- |
| `src/lib/game/core/equipment.ts` and `equipment.test.ts` | Pure `grantItems({ inventory, equipment }, items)` composition of `addItem`, `equipItem`, `previewEquipmentSwap` with zero base; return `{ inventory, equipment, equipped: string[] }`. Test target story gear, strict upgrades, ties, trade-offs, empty slots, duplicates and invalid/non-equipment items. |
| `src/lib/game/phaser/scenes/WorldScene.ts` | Use helper in `applyQuestRewards` and `tryCollectPickup`. Add `pendingFieldStatus`, one common `endDialogue()` for terminal/explicit/choice-close dialogue paths. **Keep `closeOpenShop()` unchanged**: the spear reward branch has no shop choice. Preserve quest/status publication and autosaves. Remove dead `awardEncounterDrops`; leave `buyOpenShopItem` manual. |
| `src/lib/game/core/battle.ts`, `battle.test.ts` | Use helper for victory drops/quest items and scripted-defeat grants; write returned `equipment` to the save, and derive the scripted-defeat restored max HP **from updated equipment after grant**. One synthetic gear-drop test plus focused scripted-defeat max-HP assertion if fixture is needed; no new battle notification UI. |
| `src/lib/game/i18n/messages/{en,ja,zh-Hant}.ts` | Parameterize existing `status.equippedItem` with localized `{{itemName}}` and use existing item-name resolver for all equip publishers. |
| `src/lib/game/content/items.ts`, `items.test.ts` | Change Salve base price 12→6 and the existing expected-price table row. Retain 6-HP heal and half-price resale. |
| `src/lib/game/ui/ShopScreen.svelte`, `ShopScreen.svelte.spec.ts` | Re-parent current Buy/Sell tooltips into `.shop-main` with **`position: relative`**; clamp tooltip width to the column using `max-width: min(18rem, calc(100% - 1.5rem))` or insets. Keep pointer-events none and keyboard focus. Extend viewport spec (~424) with tooltip-vs-`.shop-detail-action` rectangles at 1280×720 and 640×360. |
| `story/beats/prologue/proving-morning.md` + generated story artifacts | Update **one** Oren dialogue line that currently instructs manual equip; preserve tone. Run existing `story:check` generation and `story:check:strict`. Story runtime has English-only prose (`StoryLocale = 'en'`); no additional ja/zh-Hant narrative translation pass. |
| `tests/e2e/game.e2e.ts` | Extend existing Oren walk (~13440) on the **linear spear-reward dialogue**, plus Borak and Mira real-game scenarios and MCP screenshot evidence. Reuse save/dialogue helpers; no new parallel harness. |
| `src/lib/game/phaser/scenes/scenes.test.ts` (as needed) | Focused NPC/pickup/persistence/status regression if existing E2E does not pin it. Avoid duplicate tests. |

## Work sequence on this single PR

### 0. Confirm failure and test ownership

1. Refresh `main` and PR comments before coding. Record that HPA-836/HPA-840 are merged, and no HPA-839 code exists yet.
2. In `WorldScene.startNearbyNpcStoryDialogue`, verify the NPC reward occurs *after* `dialogueSession` is assigned; trace the three **dialogue close** sites, and verify `FieldHud` is unmounted while dialogue is open. In `story/beats/prologue/proving-morning.md`, Oren's spear-award branch is a linear dialogue with **no `Shop` choice**. The separate `story/beats/prologue/village.md` fallback branch has the shop choice, and plays only on later interactions.
3. Add failing tests for *rendered* post-dialogue item-name status, weapon/accessory slots, salve price and measured tooltip/action overlap. **Do not** replace DOM visibility with a hidden HUD event assertion.
4. Use the existing [Linear failure screenshot](https://linear.app/cwchanap/issue/HPA-839/equip-story-gear-automatically-and-fix-the-herb-shops-prices-and) as a regression reference. There is no approved target mockup.

### 1. Implement the small reusable grant policy

1. Add pure `grantItems({ inventory, equipment }, items)` to existing core equipment code. Loop once through `{ itemId, quantity }` entries, call `addItem`, and only auto-equip equipment that has **just become owned**.
2. If slot empty, equip; else use `previewEquipmentSwap({ base:{hp:0,attack:0,defense:0}, equipment, itemId })` and equip only when every stat is no worse and one is strictly better. Preserve `inventory.equipment` as the owned list, including the replaced spear.
3. Return `equipped[]` for a single pending field message (`equipped.at(-1)`), without persisting it. Do not change `equipItem`, `addItem`, or the save schema beyond necessary call-site wiring.
4. Unit tests: amulet and spear equip, knife replaces spear without deleting spear, downgrade/tie/trade-off ignored, empty slot works, duplicate does not retrigger, consumable/key/invalid input remain non-equips.

### 2. Show reward feedback **after the dialogue is actually gone**

1. In `applyQuestRewards`, batch grants and assign returned inventory/equipment; build existing `status.equippedItem` with `{ itemName: {itemId} }` for last auto-equipped item. In `tryCollectPickup`, grant once and publish the same named status immediately when no dialogue is showing; otherwise retain existing pickup/quest status.
2. Add a **single** `pendingFieldStatus: WorldSceneStatus | null`. For a dialogue reward, hold the equipped status until the player can see the field. Route explicit close, terminal advance, and choice `close` via one `endDialogue()` method, which clears the dialogue, flushes pending status once and resets it.
3. **No Shop override:** The spear-awarding Oren dialogue has no shop choice. Keep `closeOpenShop()` and ordinary `shopClosed` status untouched. Reset/clear pending state on scene lifecycle and the normal dialogue completion paths; do not preserve it through an unreachable shop branch.
4. Preserve quest journal/completion cues and existing autosave semantics. Check story-gate scene restart does not immediately erase a just-published status. Do not queue unrelated messages or show equip text while the dialogue still hides FieldHud.
5. Parameterize `status.equippedItem` in all three locales and pass the item name in manual `equipInventoryItem` too.

### 3. Keep battle returns lean

1. Pass grouped victory loot and quest reward items into `grantItems`; write its equipment state in `applyBattleVictory`'s returned save. Repeat for scripted defeat grants in `applyBattleDefeat`. In that function, calculate `fullHp` **after** `grantItems`, using the resulting equipment instead of pre-reward `saveState.equipment` so an HP-increasing scripted reward restores to the correct maximum. Do not route battle rewards through the dead `WorldScene` method.
2. Delete unused `WorldScene.awardEncounterDrops` and clean up unused imports, but do not change battle formulae, Boar King phase, or BattleSummary UI.
3. Add **one** `core/battle.test.ts` case using a synthetic equipment drop, confirming auto-equip, old gear ownership and returned save. No separate battle-return toast or status priority policy: current battle loot is consumables only.

### 4. Price and tooltip

1. Edit `sunleaf-salve.basePrice: 12→6`, and update the matching existing price table in `content/items.test.ts`. Selling remains 3 via `getSellValue`; healing remains 6. Field/Greater stay 10/18.
2. Re-anchor tooltip DOM/CSS to `.shop-main` on the stock side; add `position: relative` to `.shop-main` and clamp its tooltip with `max-width: min(18rem, calc(100% - 1.5rem))` or paired insets. At 640×360 main area is about 272px wide, narrower than the old 18rem tooltip. Preserve mouse, keyboard and `pointer-events:none` behavior and HPA-840 short-landscape/portrait layouts.
3. Extend `ShopScreen.svelte.spec.ts`'s existing 640×360/832×560 viewport cases with 1280×720 and check: tooltip inside stock/shop frame, **zero rectangle intersection** with `.shop-detail-action`, and action actually selectable/clickable. Check Buy and Sell tabs and localized text.


### 4a. One-line Oren story correction

1. Edit only the manual-equipping instruction in `story/beats/prologue/proving-morning.md` (the spear-grant branch): replace *"Open your pack and equip it before you leave"* with a neutral reminder to keep the already equipped spear ready. Do not change the separate forge-shop fallback dialogue.
2. Execute `bun run story:check` to refresh the required Rust/browser story outputs and `bun run story:check:strict` to verify their freshness. Include only generated files changed by this line. `StoryLocale = 'en'` currently makes story prose English-only, so no additional JA/zh-Hant story translations; the HUD equip status remains localized in all three UI dictionaries.
3. Check the actual rendered Oren dialogue is consistent with the post-dialogue equip status in the MCP E2E journey.

### 5. End-to-end verification **through MCP**, using persisted browser tests

**A. Real New Run / first wolves:** Extend the existing Oren journey in `tests/e2e/game.e2e.ts` (~13440), including Mott's real NPC interaction. Finish the actual **linear** reward dialogues and then inspect the **visible `.heroic-field-status` text**, not only `readHud().status`. Verify `equipped.accessory === 'ancestral-amulet'`, `equipped.weapon === 'practice-spear'`, first wolves ATK **4** / DEF **1** without opening Gear, and no current-HP refill. **Do not test Oren Shop → close as part of the reward**; that choice belongs to his unrelated always/fallback dialogue.

**B. Real Boar King reporting:** Start from a committed checkpoint if traversal is long, but interact with Borak in the **running game** to award the knife; close dialogue, verify visible equipped-name status, knife worn, spear owned/unworn, and Save/Continue preservation. No auto-equip on a manually unworn saved item.

**C. One Mira shop/economy + tooltip run:** Open the real shop at **1280×720 and 640×360**, hover/focus stock items, measure tooltip/action rectangles, capture screenshots, and confirm the Buy/Sell action remains hit-testable. In the same E2E scenario buy **two** salves at 6 coins each (verify both deductions and inventory), heal 6 with one when below max HP, and sell the remaining salve for 3. Verify Field and Greater Potion labels 10/18; perform en/ja/zh-Hant checks without repeating an entire redundant matrix. Check screenshot appearance against the Linear failure screenshot and the existing Shop UI (no mockup supplied); reject clipping, offscreen action or tooltip obstruction.

Use the **existing** Playwright + shared-Chromium CDP workflow described in the HPA-840 documents, with the MCP browser connected to the *same live target*. A separate CLI-only Playwright run is useful but **does not satisfy MCP E2E**. One browser platform is sufficient; no native-specific change is involved.

### 6. Quality and PR completion

1. Run targeted unit and browser component regressions; then `bun run test:unit -- --run`, `bun run check`, `bun run lint`, `bun run build`, and `bun run story:check:strict`.
2. Run persisted E2E scenarios A–C via MCP, attach screenshot evidence (1280×720 and 640×360), recorded commands and observed statuses to **PR #69**, and link useful evidence in the Linear ticket.
3. If Git LFS blocks real-game execution, **leave MCP E2E unchecked** and report the obstacle. Do not substitute mocked status assertions for visible acceptance or fold HPA-694 into this task.
4. Address subsequent valid PR review comments on **this same PR**, do not open an implementation PR, and keep it draft until all acceptance gates pass.

## E2E acceptance criteria (all automated; no human approval gate)

- [ ] Mott and Oren rewards equip automatically, first wolves ATK 4 / DEF 1, no Gear action; **rendered FieldHud** shows the localized name after both actual NPC reward dialogues close (no Shop choice on Oren's award branch).
- [ ] Reporting Boar King to Borak equips Hunter's Knife, Practice Spear remains in bag, and Save/Continue preserves state; post-dialogue visible status checked; intentionally unworn loaded gear stays unworn.
- [ ] Equipment helper and synthetic battle drop prove empty slot, Pareto upgrade, tie/trade-off, duplicate, replacement and retained original; shop gear purchase remains manual.
- [ ] Mira shows salve at 6 coins, each buy subtracts 6 (buy two), one heals 6 HP, the other sells for 3; Field/Greater remain 10/18; full wallet/inventory effects checked in-game.
- [ ] MCP-driven Shop E2E and component DOM geometry: tooltip never overlaps visible Buy/Sell at 1280×720 or 640×360, actions work, and en/ja/zh-Hant strings do not clip.
- [ ] MCP-run screenshots at both viewport sizes compared with Linear failure reference; actual page status visually readable after NPC dialogue, not only hidden HUD state.
- [ ] Full unit, check, lint, build and `bun run story:check:strict` pass; MCP E2E evidence attached. Exactly one PR, no art/SFX, no unrelated battle or LFS change.

**State of this review commit:** these are planned checks, not completed work.
