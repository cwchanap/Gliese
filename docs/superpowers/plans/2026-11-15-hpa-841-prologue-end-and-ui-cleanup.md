# HPA-841 — Prologue ending and UI/text cleanup (implementation plan)

**Issue:** https://linear.app/cwchanap/issue/HPA-841  
**Spec:** [2026-11-15-hpa-841-prologue-end-and-ui-cleanup-design.md](../specs/2026-11-15-hpa-841-prologue-end-and-ui-cleanup-design.md)  
**Review addressed:** https://github.com/cwchanap/Gliese/pull/67#pullrequestreview-5912631095  
**Base:** main at `592034bb0c8030e6468bd21e82c3a0b587f778bd` (2026-11-15)  
**PR strategy:** **one PR for HPA-841**, existing draft #67. Add code and tests to this PR; do not open a second implementation PR.

## Scope and sequencing

Build the end card/Continue behavior and the exact eleven fixes from HPA-841. Reuse the existing Svelte/Phaser bridge, queued quest effects, save slot 0, title art, and three locale files. No new art/SFX or new infrastructure.

**Development order:** pair each focused regression test with its fix and re-run it immediately (RED → GREEN), rather than accumulating every failing test first. Use separate logical commits (ending/save, dialogue/battle, and coherent groups of UI fixes); one commit per UI row is optional, not a requirement. Every change still belongs to this one PR.

| Area | Primary owners and tests |
|---|---|
| Terminal effect, save validator | `content/quests.ts`, `core/quests.ts`, `save/save-state.ts`; `core/quests.test.ts`, `save/save-state.test.ts`, `content/quests.test.ts` |
| Autosave/scene and end signal | `phaser/scenes/WorldScene.ts`, `ui-bridge/events.ts`; `phaser/scenes/scenes.test.ts` |
| Return-to-title, HUD reset, card and title state | `GameShell.svelte`, `ui-bridge/store.ts`, `ui/TitleScreen.svelte`; `GameShell.svelte.spec.ts`, `ui-bridge/store.test.ts` |
| Scripted loss | `core/battle.ts`, `phaser/scenes/BattleScene.ts`; `core/battle.test.ts`, `phaser/scenes/scenes.test.ts` |
| Scripted dialogue | `core/dialogue.ts`, `story/client.ts`, `DialoguePanel.svelte`, `WorldScene.ts`; `DialoguePanel.svelte.spec.ts`, `phaser/scenes/scenes.test.ts` |
| UI fixes, region, journal, locales | `ui/BagScreen.svelte`, `ui/FieldHud.svelte`, `ui/CommandGrid.svelte`, `ui/SystemScreen.svelte`, `ui/QuestJournal.svelte`, `core/area-map.ts`, `i18n/messages/{en,ja,zh-Hant}.ts`, `tests/e2e/game.e2e.ts` |

## Step 1 — terminal marker and save validation (test → implementation)

1. Add a focused RED test in `core/quests.test.ts`: the final ridge objective queues `prologue.the-vow`, `prologue.chapter-one`, then `show-prologue-end`. A completed quest alone is **not** a card trigger.
2. Add a RED save round-trip in `save/save-state.test.ts` for a full `SaveState` with `pendingEffects: [{ type: 'show-prologue-end' }]`. This catches a fatal omission: `save-state.ts:isQuestEffect` currently rejects the marker and would invalidate Continue.
3. Extend `QuestEffect` in `content/quests.ts`, append the marker to `climb-to-the-ridge.onComplete`, and accept its exact shape in `isQuestEffect`. Do **not** add `endingSeen`, a migration, or an eighth quest.
4. Remove the duplicated “End of the Prologue.” standalone prose from `story/beats/prologue/escape.md`, retain “Chapter One: The Hunt.” as the final in-story cue, and keep the required localized end-card heading. Run `bun run story:check` and commit generated references as needed.

**Green:** quest-effect order and pending-marker serialization/validation pass; existing saves without the marker remain valid.

## Step 2 — terminal autosave, ordering and failure (test → implementation)

1. Add `phaser/scenes/scenes.test.ts` regressions using existing saved-scene/render fixtures:
   - terminal marker is not consumed until the last chapter-one dialogue closes;
   - slot 0 contains *all seven completed quests, no pending terminal marker* after the terminal write;
   - chapter-one checkpoint and terminal write use the same post-render queue and cannot be persisted in reverse order;
   - `flushSaveStorage() === false` and a thrown write produce an explicit failure result instead of hanging;
   - `?startMap=` dev-map run performs no disk write but still completes the card path.
2. Change `WorldScene.writeAutosave(state)` to expose `Promise<boolean>` while preserving the existing `afterNextRenderedFrame`/thumbnail path. The terminal `runQuestEffect` awaits that result; other ordinary autosave callers may continue fire-and-forget if appropriate. Ensure previously queued checkpoint callbacks cannot overwrite the final slot with the pending marker (prove by test; respect asynchronous flush ordering, not just listener registration order).
3. Keep the scene frozen until the **save attempt resolves**. Emit a small transient completion signal through the existing `ui-bridge/events.ts` carrying success/failure. The GameShell card starts non-dismissible and becomes dismissible when the result arrives; if the event is emitted only after the await, it may mount already enabled.
4. If saving fails, show localized `status.saveFailed` on the card and allow return; **no** custom retry/requeue machinery or indefinite block. The earlier chapter-one checkpoint may allow replay of just the card if that checkpoint itself persisted; do not promise persistence when the underlying storage is unavailable. In dev-map mode, complete immediately with no save attempt (throwaway run).

**Green:** final state is confirmed on a successful flush; a failure is visible and non-blocking; ordinary saves still capture frames and persist normally.

## Step 3 — return-to-title and HUD/session reset (test → implementation)

1. Add RED `GameShell.svelte.spec.ts` regression: dismiss card → Title visible → refreshed Continue subtitle from the newly written slot → old `hudState.ready` false → no automatic re-mount after a late ready HUD event. Continue starts from the completed ridge slot and the card does not repeat. Include a held Enter and pad button so dismissal never activates a Title card twice.
2. Make the existing title metadata reactive/refreshable on return; replace startup-only `titleSlots`, `titleSlot`, `titleSaveUnreadable`, `titleHasAutosave` snapshots with a single title-state refresh helper. Preserve New Run overwrite confirmation semantics.
3. Add a small `resetHudState()` in `ui-bridge/store.ts` that resets the stale `ready` state when the game unmounts. Implement one `GameShell.returnToTitle()` that clears `*Open` overlays, `pauseOwner`, completion card, activation-key shields, start request, and playtime base, refreshes slots, and changes mode to title. It must not remount the old Phaser game.
4. Remove/guard `GameShell`'s implicit `onHudState(ready) => mode='playing'` promotion: starting a run is explicit through `beginRun` or direct boot. The old scene's in-flight HUD events must be ignored after return.
5. Render the full-screen completion card using `/game/assets/heroic-ui/title-key-art.png`, dark scrim, localized heading + thanks text, accessible focus and reduced motion. Wire first allowed key through the existing `handleGlobalKeydown`, pad through the existing GameShell pad handler, and click through the card. Reuse HPA-836's activation shield; no new global listener.
6. Add `HudQuestState.total = mainQuestIds.length` in `core/quests.ts`. The field tracker displays “Prologue complete” when `completed.length === total` and `main === null`; the journal uses `completed.length / total`. Test once in `core/quests.test.ts` and reuse the field value instead of duplicate counters.

**Green:** an automated browser-component test covers the complete mode transition, not only a large E2E; the title and continue state are fresh and no stale HUD/overlay leaks through.

## Step 4 — scripted dialogue and captain loss (paired tests/fixes)

1. Add dialogue tests for a quest-advancing NPC conversation, a queued story scene, an ambient conversation, and a fallback notice. On protected scenes/quest talks, Escape while text is revealing **reveals** it, and the next non-repeated Escape **advances**; ambient/fallback Escape closes.
2. Reuse `DialogueSession.canClose` and `HudDialogueState.canClose`. In `story/client.ts:createSceneSessionFromStory`, set `canClose=false`. Have `WorldScene.applyQuestProgress` return whether `applyQuestEvent` actually advanced the quest, and set `session.canClose=false` for those NPC talks. Do not add a second Escape-behavior field or infer protection from `mode === 'system'`. The existing Close button and pad cancel should remain hidden/blocked for protected dialogue; adjust the central pad confirmation only as needed.
3. Route non-closeable Escape in `DialoguePanel.svelte` through the **same** reveal/advance path as Enter, preventing duplicate handling between dialog/window listeners and held-repeat skipping.
4. Add `core/battle.test.ts` RED cases: `applyBattleDefeat` returns `summary: null` if `applyQuestEvent(lose-battle)` actually completes the scripted objective; ordinary defeat still returns the standard summary. Implement the decision in `core/battle.ts`, **not** in BattleScene enemy-name conditionals. Then generalize `BattleScene.finishBattle`'s flee fast path to any `application.summary === null`; hand the result back to WorldScene exactly once.
5. Update `walk-lirra-home` localized description/progress label to “See Lirra at the Herb Hut” and translations, keeping the stable objective ID and NPC trigger.

**Green:** scripted raid loss transitions directly to `prologue.captain-sneers`, ordinary defeat still shows summary, and protected dialogue is never prematurely skipped.

## Step 5 — status lifecycle, Heal command, and settings (paired tests/fixes)

1. Add status tests covering en → ja → zh-Hant switching **after** a status update and **after a story-gate `scene.restart`**. Retain a minimal typed `MessageKey + params` descriptor through `lastPublishedStatus`, `WorldSceneData.status` and the restart call; resolve with current locale when publishing. Preserve a fallback for genuinely freeform status without a generic localization framework.
2. In `WorldScene.applyHudCommand('pause-game')`, clear the transient field status as a non-mutating publish. The existing `pauseForOverlay` path already applies to Command, Save, System, etc. Remove all dialogue-closed toasts. Since Save opens with a clear field status, continue using its existing `hudStatus` and preserve newly published save-result feedback—**do not add a separate Save status channel or HUD command**.
3. In `FieldHud.svelte`, keep the aria-live region mounted, but suppress the visual background if status is empty. Test the nonempty-to-empty transition.
4. Rename only `ui.fieldCmds.rest` to localized “Heal”, leaving the internal command ID and action as-is. When no potions remain, show localized “No potions” via a tooltip/accessible description for the disabled tile.
5. Remove the entire HUD density selector from `SystemScreen.svelte`; reindex the remaining focus lattice, remove dead locale keys, and test keyboard/pad traversal.

**Green:** status does not stick across locale or menu transitions; no stale field copy leaks into the Save footer; native Save success/failure still displays; settings navigation is unaffected.

## Step 6 — region labels, journal, and remaining visual fixes (paired tests/fixes)

1. In a pure area-map/content helper, map world coordinates to `overworld.chunks` with existing grid tile size and placed chunk bounds. Return localized Sundrop, Wildwood (both chunks), Silverpine, Mistfen; use generic fallback for other chunks/interiors. Thread `player.x/y` through field/minimap/Continue subtitle and quest-context consumers as needed. Add deterministic coordinate tests using existing compiled chunks—no second rectangle table.
2. In `QuestJournal.svelte`, use `HudQuestState.total` and `completed.length` for the seven-quest Chapter Progress panel: 0/7=0%, 3/7=43%, 7/7=100%. Show seven main quests in the rail, preserve selected quest's objective detail, let the objective chain wrap onto a second row, and remove “Turned in by” because the quests do not have turn-in steps.
3. In `BagScreen.svelte`, move EQUIPPED away from the slot label and test non-overlapping DOM bounds. In `TitleScreen.svelte`, leave only “↵ Select”, change title pill/subline to “Sundrop · Prologue” and remove stale “Chapter I”. In `GameShell.svelte`, move New Run confirmation **below** action cards, preserving focus/cancel/overwrite behavior on 640×360.
4. Update en, ja, zh-Hant string sets; run existing locale parity tests. Verify status labels, prologue completion, objective change and built-region names in each.

**Green:** the seven-quest progress and labels stay correct after save/load and locale change; no truncated journal row, duplicate title hint or overlapping badge/confirmation.

## Step 7 — lean cross-platform-product acceptance and CI

**Avoid high-cost infrastructure:** The current `.github/workflows/ci.yml` uses `ubuntu-24.04`; Playwright is Chromium against Vite preview/localStorage. It is not a real Tauri WKWebView/WebView2 E2E. The repo has no `toHaveScreenshot` goldens, so add neither macOS/Windows browser-matrix jobs nor screenshot-baseline files.

1. Add one **seeded near-end E2E** to the existing Playwright `gate` project: use `core/quests.fixtures.ts:questStateAt('climb-to-the-ridge')` / `gliese.saves.v1` setup, start a *normal saved run*, inspect the ridge, advance final story, assert the completion card, dismiss, then Continue. **Do not** boot with `?startMap=`; `WorldScene.isDevMapRun` disables autosave. Use existing browser storage helpers, not an entire 7-quest route-walk (known flaky).
2. Add focused component/scene assertions for all eleven defects. For save flush failure, use the existing scene test adapter `flush: vi.fn(async () => false)` to cover what browser localStorage E2E cannot.
3. Add automated visual `boundingBox()` non-intersection / visibility checks at **1440×900, 1280×720, 640×360** for card, title confirmation, equipment label/badge and journal. Existing title screen and the card diagram in the spec are the visual references; **no Linear mockup is attached**. Existing failure-only screenshots remain diagnostic output.
4. Run `bun run check`, `bun run lint`, `bun run test:unit -- --run`, Playwright `gate` E2E, `bun run story:check:strict` and `bun run build:tauri`. Keep CI coverage on Linux as an implementation verification proxy, **not Linux product acceptance**.

### End-to-end acceptance — macOS and Windows desktop behavior

This is the acceptance scope of the shipped desktop experience. The listed machine-verifiable checks are implemented in existing shared UI/runtime tests; without new native drivers they do not prove macOS/Windows WebView-specific I/O.

| ID | Required behavior | Automated proof |
|---|---|---|
| A1 | On macOS and Windows, advancing the last ridge dialogue shows the title-art end card, with no premature activation; return to Title then Continue restores the ridge and “Prologue complete” without replay | Near-end normal-save Playwright `gate` scenario + quest/save-state and shell component tests |
| A2 | Save succeeds before a successful end-card return; save validation accepts pending terminal marker; failure warns without trapping the player; dev-map remains no-save | `save-state.test.ts`, `scenes.test.ts` success/failure/post-render ordering, dev-map test |
| A3 | Scripted captain loss skips generic Defeat; ordinary loss still has summary. Protected quest/story Escape advances; ambient Escape closes | `core/battle.test.ts`, scene and dialogue browser-component tests |
| A4 | All eleven UI/text outcomes, seven-quest progress, labels in en/ja/zh-Hant and no stale locale status | Focused Svelte/Playwright + locale parity tests |
| A5 | End card, title confirmation, badge labels and journal fit existing UI reference at all three viewports without overlap/clipping | Automated DOM `boundingBox()` tests with failure-only screenshots |
| A6 | Normal saves, title controls, pad inputs and builds do not regress | Existing unit/E2E/strict story check and CI |

No Linux/Android acceptance criteria, no human acceptance sign-off, no new runner matrix. The implementation stays in **this same PR #67**, with related code and tests committed in reviewable logical chunks. No art/SFX task: existing title artwork is reused.

## Completion rule

The PR stays draft until implementation and A1–A6 automated checks pass. No second PR for HPA-841.
