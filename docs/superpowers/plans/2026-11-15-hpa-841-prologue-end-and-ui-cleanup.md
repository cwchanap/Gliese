# HPA-841 — Prologue ending and UI/text cleanup (implementation plan)

**Issue:** https://linear.app/cwchanap/issue/HPA-841  
**Design spec:** [2026-11-15-hpa-841-prologue-end-and-ui-cleanup-design.md](../specs/2026-11-15-hpa-841-prologue-end-and-ui-cleanup-design.md)  
**Base:** main as of 2026-11-15 (592034bb0c8030e6468bd21e82c3a0b587f778bd)  
**PR strategy:** one PR for HPA-841. The existing draft planning PR is the implementation PR: add runtime code and tests to the same branch/PR after the design is reviewed. Do not create a second PR for this ticket.

## Scope and implementation rules

Close the prologue cleanly and fix all eleven UAT findings from Linear HPA-841. Stick to established Svelte/Phaser ownership. Reuse the seven-quest model, quest effects, title key art, localization files and save slot 0. No new art/SFX, no new story content, no new framework/state machine, no backwards-compatibility migration.

**Existing owners:**

| Concern | Source owners / regression tests |
|---|---|
| Final quest and pending presentation effects | `content/quests.ts`, `core/quests.ts`, `core/quests.test.ts`, `content/quests.test.ts` |
| Scene playback, HUD status, durable autosaves | `phaser/scenes/WorldScene.ts`, `phaser/scenes/scenes.test.ts`, `save/slots.test.ts` |
| End card, title return, overlay/focus and Save footer | `GameShell.svelte`, `GameShell.svelte.spec.ts`, `ui-bridge/events.ts`, `ui/TitleScreen.svelte`, `ui/SaveScreen.svelte` |
| Scripted captain loss | `phaser/scenes/BattleScene.ts`, `core/battle.ts`, `core/battle.test.ts`, `phaser/scenes/scenes.test.ts` |
| Quest/ambient dialogue Escape handling | `DialoguePanel.svelte`, `DialoguePanel.svelte.spec.ts`, `core/dialogue.ts`, `story/client.ts` as necessary |
| Status, region names, journal and command UI | `ui/FieldHud.svelte`, `core/area-map.ts`, `ui/QuestJournal.svelte`, `ui/CommandGrid.svelte`, `ui/SystemScreen.svelte`, `ui/BagScreen.svelte` |
| Translations and behavior tests | `i18n/messages/en.ts`, `ja.ts`, `zh-Hant.ts`, `messages/locale-parity.test.ts`, `tests/e2e/game.e2e.ts` |

## Step 1 — pin the regressions before changing code

Add small failing tests in current test files, not a new test harness:

1. In quest tests, complete the final ridge discovery and assert the queue order is vow → chapter-one → terminal end marker. Assert the marker is not available while either dialogue remains active and is consumed once.
2. In WorldScene/GameShell tests, simulate end marker receipt, autosave flush, and title return. Assert that a very fast key after the last line cannot leave before saving and that a reloaded completed save has no terminal effect or repeated card.
3. In BattleScene/core battle tests, prove the raid captain's required defeat skips generic summary while a normal defeat still shows it.
4. In dialogue component/scene tests, make an active talk objective whose progress updates on conversation start. Press Escape while text is still revealing, then later in the multi-line script: both must reveal/advance rather than abandon remaining lines. For ambient NPC dialogue, Escape still closes; fallback “nothing to say” is dismissible.
5. In UI component/Playwright tests, capture baseline symptoms for non-wrapping journal chain, empty status pill, the fake HUD density row, duplicated title hint, disabled Rest, and overlapping title confirmation/equipment badge.
6. Use seven quest IDs as the ground truth for Chapter Progress: 0/7 = 0%, 3/7 = 43%, 7/7 = 100%. Pin the region name at known compiled Sundrop/Wildwood/Silverpine/Mistfen positions, with a fallback for an unbuilt chunk.

Keep tests deterministic: use fixtures and a mocked save adapter for fast cases rather than replaying the entire story in every unit test. Reserve one real full-path E2E for the ending.

## Step 2 — implement authoritative end-of-prologue signaling

1. In `content/quests.ts` extend the `QuestEffect` discriminated union with a minimal `show-prologue-end` variant and append it after `prologue.chapter-one` in the last objective's `onComplete`. Keep `story/beats/prologue/escape.md` authoritative for the two existing final story lines.
2. In `WorldScene.updateStory/runQuestEffect` consume the marker only when no story dialogue is open and earlier effects have been shown/closed. Do not trigger on `isQuestComplete` alone. On entering the final marker, freeze interaction while completing the save handoff.
3. Arrange a **confirmed autosave** of the finalized quest state using the existing `writeSaveSlot(0,...)`/`flushSaveStorage` and screenshot-after-render mechanism. Modify `writeAutosave` narrowly (or add a terminal wrapper around its existing helpers) so the end-card activation awaits completion; handle save failure by leaving a recoverable in-run state with localized failure feedback instead of allowing an unsaved title return. Do not introduce a new persistence format.
4. In `ui-bridge/events.ts` add one transient `prologue completed` notification; in `GameShell.svelte` subscribe and show a lightweight full-screen Svelte card on the existing title key art + scrim. Keep keyboard, pointer and pad handling owned by GameShell. Consume the first allowed input once (ignore held-key repeats), prevent Phaser from acting on it, and respect reduced-motion settings. Use localized card text and accessible heading.
5. On dismissal, return to title; refresh the current save slot list, Continue availability, playtime/area subtitle and New Run overwrite guard from storage (not startup-only captured constants). Continue loads the ridge state. Derive a permanent field tracker “Prologue complete” from the existing seven quest entries, not an eighth fake quest or saved boolean.
6. Test a completed save reopened from Title and an interrupted final dialogue separately. The completed save must not replay the terminal effect or card; the unfinished final dialogue resumes according to existing story-queue semantics without duplicating quest rewards.

**Integration caution:** queued quest effects are removed before playback. If the marker is consumed before the successful write, retain the state required for retry until persistence succeeds; do not make save failure irrecoverable.

## Step 3 — fix scripted dialogue and scripted captain loss

1. Determine whether NPC dialogue is **quest-driven** from `getCurrentObjective` and matching dialogue ID **before** `WorldScene.startNearbyNpcStoryDialogue` calls `applyQuestProgress`. Carry an explicit narrow Escape behavior in `DialogueSession` → `HudDialogueState`, marking current-quest NPC dialogues and queued scripted scenes as “advance”; ambient dialogue and transient fallback notices are “close.” Do not use `mode === 'system'` as the sole test.
2. In `DialoguePanel.svelte` route protected Escape through the same `resolveDialogueConfirm` reveal/advance path as Enter, honoring the typewriter state and one action per non-repeated press; ordinary ambient Escape still closes. Prevent duplicate invocation from the panel and window listeners. Keep choices and pad controls consistent with protected dialogue (no unintended skip).
3. In `BattleScene.finishBattle` detect **outcome === 'defeat' AND current quest objective kind === 'lose-battle' AND source enemy === objective enemy**. Immediately hand the result to `WorldScene`, just as flee does, but preserve the actual defeat/quest result so `prologue.captain-sneers` appears as the next scripted scene. Preserve ordinary defeat summary and respawn behavior. No special UI text hacks in `BattleSummary.svelte`.
4. Change localized text for existing objective ID `walk-lirra-home` to “See Lirra at the Herb Hut” and an honest progress label. Keep its single-NPC talk trigger and quest ID unchanged. If story prose has to change, edit `story/` source only and run the story compiler/checker.

**Regressions:** exact quest dialog lines remain reachable after Escape; ambient close works; scripted loss never shows generic “Defeat / No rewards / Returned to Shrine,” ordinary losses still do; no duplicate reward or completion event.

## Step 4 — status lifecycle, Heal, settings, and Save footer

1. Trace `WorldScene.publishHudState`, `lastPublishedStatus`, and preference subscription. Keep semantic status `MessageKey` plus interpolation params for status messages, resolving via `t(currentLocale,...)` when building HUD. Minimize conversion: a helper/wrapper is fine, no broad generic i18n redesign. Preserve genuinely freeform displays if present. Switching en → ja → zh-Hant immediately re-renders the current status text.
2. Stop publishing `status.dialogueClosed` when a conversation closes or its last line is advanced. When an actual menu surface opens, clear temporary field status through one non-mutating HUD command or equivalent existing bridge handoff; avoid clearing it when a dialogue line merely advances.
3. In `FieldHud.svelte` keep the screen-reader live region mounted but suppress the **visual** status pill whenever text is blank, including after a menu opens.
4. Separate save-result status from the field HUD status. `GameShell.svelte` should pass an empty string or save-specific status to `SaveScreen.svelte`; saving feedback must still work while “Shop out of reach” or “HP already full” does not leak to the Save footer.
5. In `CommandGrid.svelte` retain command key `rest` and behavior `requestHeal()`. Replace visible string with localized “Heal.” When disabled due to zero potions, expose localized “No potions” using an accessible description/tooltip even though the button cannot activate. Do not rework consumables or recovery.
6. Delete the redundant HUD density row from `SystemScreen.svelte`, adjust the remaining focus-grid row numbers and tests, and remove unused translation keys. Leave existing motion/text-speed/prompt/audio preferences intact.

**Regressions:** clear status never renders an empty box; neither opening a menu nor switching locale leaves stale field copy; saving still reports its own success/failure; navigating settings by keyboard/pad does not jump a removed density row.

## Step 5 — region names, quest journal, and presentation cleanup

1. Add a pure coordinate-to-region lookup against `overworld.chunks` from `content/maps/overworld/world.ts`. Use the existing grid tile size and compiled chunk bounds. Group both Wildwood chunks into “Wildwood”; map Sundrop, Silverpine, Mistfen directly. Use localized strings and a generic fallback for other chunks/maps. Thread the player's position into `buildAreaMapState`, save slot area subtitle and quest journal map text where location is grounded; do **not** rename the underlying `overworld` map ID or duplicate pixel rectangles.
2. In `QuestJournal.svelte` replace the Chapter Progress calculation with total completed main quests / `mainQuestIds.length`. Render the seven main quest steps as the panel's progress timeline, while preserving the detail view of objectives for an individual selected quest. Three completed quests show 43%; a completed run shows 100%.
3. Allow the *detail* objective chain to wrap cleanly into a second line on small widths. Avoid clipping and keep connector elements visually consistent; update or remove separators at line breaks rather than overflowing the viewport. Remove the misleading “Turned in by” label and related false turn-in implication; only keep independently useful NPC/map context under a neutral caption.
4. In `BagScreen.svelte` separate the EQUIPPED badge from the slot-type label (e.g., badge at lower right). Confirm actual bounding-box nonintersection at the minimum 640×360 and standard desktop sizes.
5. In `TitleScreen.svelte` remove the duplicate “↵ Enter” hint, retaining a single “↵ Select” control hint. Update localized title pill and region subline to “Sundrop · Prologue” and stale “Chapter I” captions to “Prologue.” Keep the title's existing key art and layout.
6. In `GameShell.svelte` reposition the New Run confirmation **below** Continue/New Run cards. Account for normal 1440×900 and compact 640×360 compositions without obscuring either card; preserve the alertdialog and focus restore behavior.

**Regressions:** heading strings follow the player's current world chunk and language; seven-quest progress remains correct after a save/load; the key UI surfaces retain their existing navigation and title visuals.

## Step 6 — localization, full-path E2E and CI

**Translation work:** update `en.ts`, `ja.ts`, `zh-Hant.ts` for new completion text, “Heal”, “No potions”, prologue labels, region names, and Lirra objective. Remove dead density/title-hint strings where no references remain. Run parity checks. No new dialogue prose in TypeScript; if anything in `story/` changes, use `bun run story:check` and verify generated references are updated.

**Automated verification:**

- `bun run check`
- `bun run lint`
- `bun run test:unit -- --run` (node + browser component tests)
- `bun run test:e2e` (build + Playwright)
- `bun run story:check:strict`, and `bun run story:check` before it if story sources change
- `bun run build:tauri` for the release frontend build; existing Rust CI remains the owner of Rust checks.

Keep the E2E fixture cost under control: one complete prologue run, then shorter targeted scenario fixtures for the eleven defects. Use persisted save records to test Continue, but not to substitute for the *one* real ending-path test. Do not require manual clicking to accept this ticket.

## End-to-end acceptance criteria — macOS and Windows

All criteria below are automated. Android and Linux are not E2E acceptance platforms for this ticket.

| ID | End-to-end expectation | Machine-verifiable signal |
|---|---|---|
| A1 | Prologue finishes with the two current lines in order, confirmed autosave, full-screen end card, and one key/click/pad return to title | Game state + slot 0 + screen assertions in desktop E2E; a rapid dismissal cannot drop the save |
| A2 | Continue restores ridge, tracker says “Prologue complete,” end card does not repeat | Relaunch/load same stored slot and inspect map/position/quest HUD |
| A3 | Quest dialogue Escape advances/reveals all lines; ambient Escape closes; captain scripted defeat goes straight to story but ordinary defeat retains summary | E2E dialogue and battle transitions |
| A4 | All eleven HPA-841 changes are visible and functional, including 3/7 = 43%, correct four chunk names, three locales, status refresh, Heal tooltip, removed density row and title hint, corrected Lirra objective | Playwright/Svelte selectors, translated text, and state assertions |
| A5 | The end card and existing Title, Bag and Quest screens remain readable; New Run confirmation sits below cards; EQUIPPED/slot labels do not overlap; journal chain wraps | Screenshot comparisons and DOM bounding-box assertions at 1440×900, 1280×720, 640×360 on macOS and Windows |
| A6 | Existing save slots, other quest outcomes, normal combat summary, menu keyboard/pad controls and build checks do not regress | Existing automated suites and CI pass |

**Visual source:** HPA-841 provides no UI mockup attachment. Compare visual checks against the existing screens/title key art and the end-card composition in the design spec. If a Linear mockup is later attached before implementation finishes, update screenshot baselines to match it within this same PR.

## Out of scope / PR completion rule

No new art or SFX (reuse title key art), new chapter, escort mechanics, battle mechanic redesign (HPA-837), flee/hotkeys (HPA-838, closed), broad menu keyboard fixes (HPA-836, already on main), window resizing (HPA-840), or per-region battle backdrops.

**Done when:** A1–A6 pass in the macOS/Windows automated E2E configuration, locale/build/CI checks pass, and the same single HPA-841 draft PR contains the implementation plus tests. No human acceptance or separate implementation PR.
